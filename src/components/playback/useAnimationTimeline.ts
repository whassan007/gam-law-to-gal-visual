import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PipelineStageId, TranslationEvent } from '../../types/contracts';

export const PIPELINE_STAGES: readonly PipelineStageId[] = [
  'segment',
  'extract',
  'entity',
  'relation',
  'gal',
  'validate',
] as const;

export interface StageDescriptor {
  id: PipelineStageId;
  index: number;
  numberLabel: string;
  title: string;
  shortTitle: string;
  description: string;
}

export const STAGE_DESCRIPTORS: readonly StageDescriptor[] = [
  {
    id: 'segment',
    index: 0,
    numberLabel: '1',
    title: '1. Text Segmentation',
    shortTitle: 'Segmentation',
    description: 'Split statutory text into normative clauses and identify deontic/polarity signals.',
  },
  {
    id: 'extract',
    index: 1,
    numberLabel: '2',
    title: '2. Legal Concept Extraction',
    shortTitle: 'Concept Extraction',
    description: 'Extract actors, roles, activities, processes, permissions, obligations, and conditions.',
  },
  {
    id: 'entity',
    index: 2,
    numberLabel: '3',
    title: '3. GAM Entity Identification',
    shortTitle: 'GAM Entities',
    description: 'Classify extracted domain concepts into formal GAM sorts: Process (P), Activity (A), Role (R), User (U).',
  },
  {
    id: 'relation',
    index: 3,
    numberLabel: '4',
    title: '4. Relation & Policy Mapping',
    shortTitle: 'Relations & Policies',
    description: 'Construct structural edges (PP, PA, RR, S, X) and signed authorization/obligation policies (RA±, RU±, UP±, RP±, D±).',
  },
  {
    id: 'gal',
    index: 4,
    numberLabel: '5',
    title: '5. GAL-JSON Generation',
    shortTitle: 'GAL-JSON',
    description: 'Serialize the formal legal model Φ_L into structured GAL-JSON with bidirectional clause provenance.',
  },
  {
    id: 'validate',
    index: 5,
    numberLabel: '6',
    title: '6. Formal Validation',
    shortTitle: 'Validation',
    description: 'Verify sort typing, canonical edge directions, internal consistency, coverage, and Alloy specification.',
  },
] as const;

export type PlaybackSpeed = 0.5 | 1 | 2;

export interface UseAnimationTimelineOptions {
  events: TranslationEvent[];
  initialSpeed?: PlaybackSpeed;
  reducedMotion?: boolean;
  baseStepIntervalMs?: number;
}

export interface UseAnimationTimelineReturn {
  currentStage: PipelineStageId;
  currentStageIndex: number;
  currentEventIndex: number;
  visibleEvents: TranslationEvent[];
  activeEvent: TranslationEvent | null;
  progressPercent: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  replayCount: number;
  process: () => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  replay: () => void;
  prevStep: () => void;
  nextStep: () => void;
  goToStage: (stage: PipelineStageId) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  reset: () => void;
}

function normalizeStageToSixStagePipeline(stage: PipelineStageId): PipelineStageId {
  if (stage === 'source') {
    return 'segment';
  }
  return stage;
}

function getStageIndex(stage: PipelineStageId): number {
  const normalized = normalizeStageToSixStagePipeline(stage);
  const idx = PIPELINE_STAGES.indexOf(normalized);
  return idx >= 0 ? idx : 0;
}

/**
 * Deterministic state machine hook driving the 6-stage Law-to-GAL pipeline:
 * (`segment`, `extract`, `entity`, `relation`, `gal`, `validate`).
 *
 * Guarantees that given the same `events` trace, `replay()`, `nextStep()`,
 * `prevStep()`, and `goToStage()` always traverse the exact same sequence
 * of stages and events (satisfying Test 9 Deterministic Replay).
 */
export function useAnimationTimeline({
  events,
  initialSpeed = 1,
  reducedMotion = false,
  baseStepIntervalMs = 550,
}: UseAnimationTimelineOptions): UseAnimationTimelineReturn {
  // Deterministically sort events by stepIndex (and id fallback) so the trace order is invariant
  const orderedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      if (a.stepIndex !== b.stepIndex) {
        return a.stepIndex - b.stepIndex;
      }
      return a.id.localeCompare(b.id);
    });
  }, [events]);

  const maxEventIndex = Math.max(0, orderedEvents.length - 1);

  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeedState] = useState<PlaybackSpeed>(initialSpeed);
  const [replayCount, setReplayCount] = useState<number>(0);

  // Track events identity to reset cleanly when law/provision changes
  const prevEventsRef = useRef<TranslationEvent[]>(events);
  useEffect(() => {
    if (prevEventsRef.current !== events) {
      prevEventsRef.current = events;
      setIsPlaying(false);
      if (orderedEvents.length > 0) {
        const lastIdx = orderedEvents.length - 1;
        setCurrentEventIndex(lastIdx);
        setCurrentStageIndex(getStageIndex(orderedEvents[lastIdx].stage));
      } else {
        setCurrentEventIndex(0);
        setCurrentStageIndex(0);
      }
    }
  }, [events, orderedEvents]);

  // Helper to find the first and last event indices belonging to a given stage index
  const getStageEventBounds = useCallback(
    (stageIdx: number): { firstIndex: number; lastIndex: number } | null => {
      if (orderedEvents.length === 0) return null;
      const targetStage = PIPELINE_STAGES[stageIdx] ?? 'segment';
      let firstIndex = -1;
      let lastIndex = -1;
      for (let i = 0; i < orderedEvents.length; i++) {
        const evStage = normalizeStageToSixStagePipeline(orderedEvents[i].stage);
        if (evStage === targetStage) {
          if (firstIndex === -1) firstIndex = i;
          lastIndex = i;
        }
      }
      if (firstIndex === -1) {
        return null;
      }
      return { firstIndex, lastIndex };
    },
    [orderedEvents]
  );

  // Advance a single deterministic tick during playback
  useEffect(() => {
    if (!isPlaying) return;

    // If reducedMotion is active, jump straight to final stage/event deterministically
    if (reducedMotion) {
      if (orderedEvents.length > 0) {
        setCurrentEventIndex(maxEventIndex);
        setCurrentStageIndex(PIPELINE_STAGES.length - 1);
      } else {
        setCurrentStageIndex(PIPELINE_STAGES.length - 1);
      }
      setIsPlaying(false);
      return;
    }

    const intervalMs = Math.max(60, Math.round(baseStepIntervalMs / speed));
    const timer = window.setTimeout(() => {
      if (orderedEvents.length > 0) {
        if (currentEventIndex < maxEventIndex) {
          const nextIdx = currentEventIndex + 1;
          const nextStageIdx = getStageIndex(orderedEvents[nextIdx].stage);
          setCurrentEventIndex(nextIdx);
          setCurrentStageIndex(nextStageIdx);
        } else if (currentStageIndex < PIPELINE_STAGES.length - 1) {
          setCurrentStageIndex((prev) => Math.min(PIPELINE_STAGES.length - 1, prev + 1));
        } else {
          setIsPlaying(false);
        }
      } else {
        if (currentStageIndex < PIPELINE_STAGES.length - 1) {
          setCurrentStageIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }
    }, intervalMs);

    return () => window.clearTimeout(timer);
  }, [
    isPlaying,
    reducedMotion,
    baseStepIntervalMs,
    speed,
    orderedEvents,
    currentEventIndex,
    currentStageIndex,
    maxEventIndex,
  ]);

  const process = useCallback(() => {
    setCurrentStageIndex(0);
    setCurrentEventIndex(0);
    setIsPlaying(true);
  }, []);

  const start = useCallback(() => {
    if (
      (orderedEvents.length > 0 && currentEventIndex >= maxEventIndex && currentStageIndex >= PIPELINE_STAGES.length - 1) ||
      (orderedEvents.length === 0 && currentStageIndex >= PIPELINE_STAGES.length - 1)
    ) {
      setCurrentStageIndex(0);
      setCurrentEventIndex(0);
    }
    setIsPlaying(true);
  }, [orderedEvents.length, currentEventIndex, maxEventIndex, currentStageIndex]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (
      (orderedEvents.length > 0 && currentEventIndex >= maxEventIndex && currentStageIndex >= PIPELINE_STAGES.length - 1) ||
      (orderedEvents.length === 0 && currentStageIndex >= PIPELINE_STAGES.length - 1)
    ) {
      setCurrentStageIndex(0);
      setCurrentEventIndex(0);
    }
    setIsPlaying(true);
  }, [orderedEvents.length, currentEventIndex, maxEventIndex, currentStageIndex]);

  const replay = useCallback(() => {
    setIsPlaying(false);
    setCurrentStageIndex(0);
    setCurrentEventIndex(0);
    setReplayCount((c) => c + 1);
    setIsPlaying(true);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStageIndex(0);
    setCurrentEventIndex(0);
  }, []);

  const goToStage = useCallback(
    (stage: PipelineStageId) => {
      setIsPlaying(false);
      const targetStageIdx = getStageIndex(stage);
      setCurrentStageIndex(targetStageIdx);

      if (orderedEvents.length === 0) {
        setCurrentEventIndex(0);
        return;
      }

      // Find the last event at or before targetStageIdx so all cumulative stage outputs are visible
      let chosenEventIdx = 0;
      for (let i = 0; i < orderedEvents.length; i++) {
        const evStageIdx = getStageIndex(orderedEvents[i].stage);
        if (evStageIdx <= targetStageIdx) {
          chosenEventIdx = i;
        }
      }
      setCurrentEventIndex(chosenEventIdx);
    },
    [orderedEvents]
  );

  const nextStep = useCallback(() => {
    setIsPlaying(false);
    if (currentStageIndex < PIPELINE_STAGES.length - 1) {
      const nextStageIdx = currentStageIndex + 1;
      setCurrentStageIndex(nextStageIdx);
      const bounds = getStageEventBounds(nextStageIdx);
      if (bounds) {
        setCurrentEventIndex(bounds.lastIndex);
      } else if (orderedEvents.length > 0) {
        // Fallback: advance event index or clamp to max
        let chosenIdx = currentEventIndex;
        for (let i = 0; i < orderedEvents.length; i++) {
          if (getStageIndex(orderedEvents[i].stage) <= nextStageIdx) {
            chosenIdx = i;
          }
        }
        setCurrentEventIndex(chosenIdx);
      }
    } else if (orderedEvents.length > 0 && currentEventIndex < maxEventIndex) {
      setCurrentEventIndex(maxEventIndex);
    }
  }, [currentStageIndex, currentEventIndex, getStageEventBounds, orderedEvents, maxEventIndex]);

  const prevStep = useCallback(() => {
    setIsPlaying(false);
    if (currentStageIndex > 0) {
      const prevStageIdx = currentStageIndex - 1;
      setCurrentStageIndex(prevStageIdx);
      const bounds = getStageEventBounds(prevStageIdx);
      if (bounds) {
        setCurrentEventIndex(bounds.lastIndex);
      } else if (orderedEvents.length > 0) {
        let chosenIdx = 0;
        for (let i = 0; i < orderedEvents.length; i++) {
          if (getStageIndex(orderedEvents[i].stage) <= prevStageIdx) {
            chosenIdx = i;
          }
        }
        setCurrentEventIndex(chosenIdx);
      }
    } else {
      setCurrentEventIndex(0);
    }
  }, [currentStageIndex, getStageEventBounds, orderedEvents]);

  const setSpeed = useCallback((newSpeed: PlaybackSpeed) => {
    setSpeedState(newSpeed);
  }, []);

  const currentStage: PipelineStageId = PIPELINE_STAGES[currentStageIndex] ?? 'segment';

  const visibleEvents = useMemo(() => {
    if (orderedEvents.length === 0) return [];
    const safeEnd = Math.min(orderedEvents.length, currentEventIndex + 1);
    return orderedEvents.slice(0, safeEnd);
  }, [orderedEvents, currentEventIndex]);

  const activeEvent = useMemo(() => {
    if (orderedEvents.length === 0) return null;
    return orderedEvents[Math.min(currentEventIndex, maxEventIndex)] ?? null;
  }, [orderedEvents, currentEventIndex, maxEventIndex]);

  const progressPercent = useMemo(() => {
    if (orderedEvents.length > 1) {
      const eventRatio = currentEventIndex / maxEventIndex;
      const stageRatio = currentStageIndex / (PIPELINE_STAGES.length - 1);
      return Math.round(Math.max(eventRatio, stageRatio) * 100);
    }
    return Math.round((currentStageIndex / (PIPELINE_STAGES.length - 1)) * 100);
  }, [orderedEvents.length, currentEventIndex, maxEventIndex, currentStageIndex]);

  return {
    currentStage,
    currentStageIndex,
    currentEventIndex,
    visibleEvents,
    activeEvent,
    progressPercent,
    isPlaying,
    speed,
    replayCount,
    process,
    start,
    pause,
    resume,
    replay,
    prevStep,
    nextStep,
    goToStage,
    setSpeed,
    reset,
  };
}
