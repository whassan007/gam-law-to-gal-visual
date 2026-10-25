import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  RefreshCw,
  Copy,
  Download,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { PipelineStageId } from '../../types/contracts';
import { STAGE_DESCRIPTORS, PlaybackSpeed } from './useAnimationTimeline';

export interface PlaybackControlBarProps {
  currentStage: PipelineStageId;
  currentStageIndex: number;
  isPlaying: boolean;
  speed: 0.5 | 1 | 2;
  progressPercent: number;
  onProcess: () => void;
  onPause: () => void;
  onResume: () => void;
  onReplay: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  onSelectStage: (stage: PipelineStageId) => void;
  onChangeSpeed: (speed: 0.5 | 1 | 2) => void;
  onReset: () => void;
  onCopyGal: () => void;
  onDownloadGal: () => void;
}

const SPEEDS: readonly PlaybackSpeed[] = [0.5, 1, 2] as const;

export const PlaybackControlBar: React.FC<PlaybackControlBarProps> = ({
  currentStage,
  currentStageIndex,
  isPlaying,
  speed,
  progressPercent,
  onProcess,
  onPause,
  onResume,
  onReplay,
  onPrevStep,
  onNextStep,
  onSelectStage,
  onChangeSpeed,
  onReset,
  onCopyGal,
  onDownloadGal,
}) => {
  const activeStageDescriptor =
    STAGE_DESCRIPTORS.find((s) => s.id === currentStage) ??
    STAGE_DESCRIPTORS[currentStageIndex] ??
    STAGE_DESCRIPTORS[0];

  const clampedProgress = Math.max(0, Math.min(100, progressPercent));

  return (
    <section
      aria-label="Law-to-GAL Pipeline Stepper and Playback Controls"
      className="w-full rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 text-slate-100 shadow-lg backdrop-blur-md"
    >
      {/* 6-Stage Interactive Pipeline Stepper */}
      <div className="mb-3">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              GAM Law → GAL Translation Pipeline
            </span>
            <span className="hidden text-slate-600 sm:inline">•</span>
            <span className="hidden text-slate-300 sm:inline" data-testid="active-stage-description">
              {activeStageDescriptor.title}: {activeStageDescriptor.description}
            </span>
          </div>
          <span
            className="font-mono text-xs font-medium text-indigo-300"
            aria-live="polite"
            data-testid="pipeline-progress-percent"
          >
            Stage {currentStageIndex + 1}/6 ({clampedProgress}%)
          </span>
        </div>

        {/* Progress Bar Track */}
        <div
          className="mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Translation pipeline progress"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 transition-all duration-300 ease-out"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>

        {/* 6 Interactive Stepper Buttons */}
        <div
          role="tablist"
          aria-label="Translation Pipeline Stages"
          className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6"
        >
          {STAGE_DESCRIPTORS.map((stage) => {
            const isActive = stage.id === currentStage || stage.index === currentStageIndex;
            const isCompleted = stage.index < currentStageIndex;

            return (
              <button
                key={stage.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Stage ${stage.title}`}
                data-testid={`stage-step-${stage.id}`}
                onClick={() => onSelectStage(stage.id)}
                className={`group relative flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-950 ${
                  isActive
                    ? 'border-indigo-500/90 bg-indigo-950/80 text-white shadow-sm shadow-indigo-500/20'
                    : isCompleted
                    ? 'border-emerald-800/60 bg-slate-800/70 text-emerald-200 hover:border-emerald-600/70 hover:bg-slate-800'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <span className="truncate">{stage.title}</span>
                {isCompleted ? (
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />
                ) : isActive ? (
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isPlaying ? 'animate-ping bg-indigo-400' : 'bg-indigo-400'
                    }`}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transport, Speed & Export Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/90 pt-2.5">
        {/* Primary Transport Controls */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Playback transport controls">
          <button
            type="button"
            data-testid="control-process"
            aria-label="Process Law to GAL"
            onClick={onProcess}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-950"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Process</span>
          </button>

          <button
            type="button"
            data-testid="control-pause"
            aria-label="Pause playback"
            disabled={!isPlaying}
            onClick={onPause}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-950 ${
              isPlaying
                ? 'border-amber-600/70 bg-amber-950/60 text-amber-200 hover:bg-amber-900/60'
                : 'cursor-not-allowed border-slate-800 bg-slate-900/40 text-slate-500 opacity-60'
            }`}
          >
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Pause</span>
          </button>

          <button
            type="button"
            data-testid="control-resume"
            aria-label="Resume playback"
            disabled={isPlaying}
            onClick={onResume}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-950 ${
              !isPlaying
                ? 'border-emerald-700/70 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900/60'
                : 'cursor-not-allowed border-slate-800 bg-slate-900/40 text-slate-500 opacity-60'
            }`}
          >
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Resume</span>
          </button>

          <button
            type="button"
            data-testid="control-replay"
            aria-label="Replay deterministic translation sequence"
            onClick={onReplay}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-950"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Replay</span>
          </button>

          <div className="mx-1 h-4 w-px bg-slate-800" aria-hidden="true" />

          <button
            type="button"
            data-testid="control-prev"
            aria-label="Previous step"
            onClick={onPrevStep}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-950"
          >
            <SkipBack className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Prev Step</span>
          </button>

          <button
            type="button"
            data-testid="control-next"
            aria-label="Next step"
            onClick={onNextStep}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-950"
          >
            <span>Next Step</span>
            <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            data-testid="control-reset"
            aria-label="Reset pipeline to initial stage"
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-950"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset</span>
          </button>
        </div>

        {/* Speed Selector & GAL Export Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Speed selector */}
          <div
            className="inline-flex items-center rounded-lg border border-slate-800 bg-slate-950/80 p-0.5"
            role="group"
            aria-label="Animation speed controls"
          >
            <span className="px-2 text-[11px] font-medium text-slate-400">Speed</span>
            {SPEEDS.map((spd) => {
              const isSelected = speed === spd;
              return (
                <button
                  key={spd}
                  type="button"
                  data-testid={`control-speed-${spd}`}
                  aria-label={`Set animation speed to ${spd}x`}
                  aria-pressed={isSelected}
                  onClick={() => onChangeSpeed(spd)}
                  className={`rounded-md px-2 py-1 font-mono text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {spd}×
                </button>
              );
            })}
          </div>

          {/* Copy GAL & Download GAL-JSON */}
          <div className="flex items-center gap-1.5" role="group" aria-label="GAL-JSON export actions">
            <button
              type="button"
              data-testid="control-copy-gal"
              aria-label="Copy GAL-JSON to clipboard"
              onClick={onCopyGal}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-indigo-500/60 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-slate-950"
            >
              <Copy className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
              <span>Copy GAL</span>
            </button>

            <button
              type="button"
              data-testid="control-download-gal"
              aria-label="Download GAL-JSON file"
              onClick={onDownloadGal}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/60 bg-emerald-950/50 px-2.5 py-1.5 text-xs font-medium text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-900/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 focus:ring-offset-slate-950"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span>Download GAL-JSON</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
