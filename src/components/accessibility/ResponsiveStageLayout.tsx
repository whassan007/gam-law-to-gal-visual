import React, { useState } from 'react';
import { FileText, Network, Code2, Keyboard } from 'lucide-react';
import type { PipelineStageId } from '../../types/contracts';
import type { ViewportMode } from './useAccessibilityPreferences';

export type WorkspacePaneId = 'legal' | 'pipeline' | 'gal';

export interface PaneDefinition {
  id: WorkspacePaneId;
  label: string;
  shortLabel: string;
  description: string;
}

export const WORKSPACE_PANES: PaneDefinition[] = [
  {
    id: 'legal',
    label: 'Legal Passage',
    shortLabel: 'Legal Passage',
    description: 'Authoritative statutory text, segmented clauses, and normative modality markers',
  },
  {
    id: 'pipeline',
    label: 'GAM Pipeline & Graph',
    shortLabel: 'GAM Pipeline & Graph',
    description: 'Active GAM translation stage and formal 4-sort governance graph Φ',
  },
  {
    id: 'gal',
    label: 'GAL-JSON & Validation',
    shortLabel: 'GAL-JSON & Validation',
    description: 'Synchronized Governance Analysis Language JSON, formal consistency, and Alloy spec',
  },
];

const STAGE_HUMAN_LABELS: Record<PipelineStageId, string> = {
  source: 'Stage 1: Authoritative Legal Source Intake',
  segment: 'Stage 2: Normative Clause Segmentation',
  extract: 'Stage 3: Legal Concept & Modality Extraction',
  entity: 'Stage 4: GAM 4-Sort Entity Typing (Process, Activity, Role, User)',
  relation: 'Stage 5: Canonical Structural & Permission Relation Construction',
  gal: 'Stage 6: Synchronized GAL-JSON Model Serialization',
  validate: 'Stage 7: Formal Consistency, Coverage & Alloy Specification Check',
};

export interface ResponsiveStageLayoutProps {
  /** Column 1: Legal Source & Segmentation */
  legalPassagePane?: React.ReactNode;
  /** Alias for Column 1 */
  leftPane?: React.ReactNode;
  /** Column 2: Active Stage / GAM Formal Graph */
  pipelineGraphPane?: React.ReactNode;
  /** Alias for Column 2 */
  centerPane?: React.ReactNode;
  /** Column 3: Synchronized GAL-JSON & Validation */
  galValidationPane?: React.ReactNode;
  /** Alias for Column 3 */
  rightPane?: React.ReactNode;
  /** Optional header bar above the 3-column workspace (e.g., 7-stage stepper or playback bar) */
  topBar?: React.ReactNode;
  /** Optional footer bar below the 3-column workspace */
  bottomBar?: React.ReactNode;
  /** Current pipeline stage for ARIA live status announcements */
  activeStage?: PipelineStageId;
  /** Custom status announcement string for screen readers */
  statusAnnouncement?: string;
  /** Current viewport mode ('desktop' | 'tablet' | 'mobile') */
  viewportMode?: ViewportMode;
  /** High contrast border toggle */
  highContrastBorders?: boolean;
  /** Controlled active mobile/tablet pane */
  activeMobilePane?: WorkspacePaneId;
  /** Callback when mobile/tablet pane tab changes */
  onMobilePaneChange?: (pane: WorkspacePaneId) => void;
  /** Callback to open the keyboard shortcuts modal */
  onOpenShortcuts?: () => void;
  /** Optional children fallback if used as a wrapper */
  children?: React.ReactNode;
}

export const ResponsiveStageLayout: React.FC<ResponsiveStageLayoutProps> = ({
  legalPassagePane,
  leftPane,
  pipelineGraphPane,
  centerPane,
  galValidationPane,
  rightPane,
  topBar,
  bottomBar,
  activeStage = 'source',
  statusAnnouncement,
  viewportMode = 'desktop',
  highContrastBorders = false,
  activeMobilePane: controlledMobilePane,
  onMobilePaneChange,
  onOpenShortcuts,
  children,
}) => {
  const [internalMobilePane, setInternalMobilePane] = useState<WorkspacePaneId>('pipeline');

  const currentPane: WorkspacePaneId = controlledMobilePane ?? internalMobilePane;

  const handleSelectPane = (pane: WorkspacePaneId) => {
    if (onMobilePaneChange) {
      onMobilePaneChange(pane);
    } else {
      setInternalMobilePane(pane);
    }
  };

  const col1Content = legalPassagePane ?? leftPane;
  const col2Content = pipelineGraphPane ?? centerPane ?? children;
  const col3Content = galValidationPane ?? rightPane;

  const liveAnnouncementText =
    statusAnnouncement ||
    `Active pipeline stage: ${STAGE_HUMAN_LABELS[activeStage] ?? activeStage}. Active pane: ${
      WORKSPACE_PANES.find((p) => p.id === currentPane)?.label ?? 'Workspace'
    }.`;

  const borderClass = highContrastBorders
    ? 'border-cyan-400/70'
    : 'border-sky-400/15';

  const forceCompactMode = viewportMode === 'tablet' || viewportMode === 'mobile';

  const getPaneIcon = (id: WorkspacePaneId) => {
    switch (id) {
      case 'legal':
        return <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case 'pipeline':
        return <Network className="h-4 w-4 shrink-0" aria-hidden="true" />;
      case 'gal':
        return <Code2 className="h-4 w-4 shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <div
      className="flex w-full max-w-full flex-col overflow-x-hidden bg-[#050814] text-slate-100"
      data-testid="responsive-stage-layout"
      data-viewport-mode={viewportMode}
    >
      {/* Live ARIA status region announcing pipeline stage transitions for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="pipeline-live-status"
      >
        {liveAnnouncementText}
      </div>

      {topBar && <div className="w-full shrink-0">{topBar}</div>}

      {/* Tablet / Mobile (< 1024px or when viewportMode is tablet/mobile) Tab Switcher Bar */}
      <div
        data-testid="mobile-pane-switcher"
        role="tablist"
        aria-label="Synchronized translation workspace panes"
        className={`${
          forceCompactMode ? 'flex' : 'flex lg:hidden'
        } w-full items-center justify-between gap-1.5 border-b ${borderClass} bg-[#0a0f24]/95 px-2.5 py-2 backdrop-blur`}
      >
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {WORKSPACE_PANES.map((pane) => {
            const isSelected = currentPane === pane.id;
            return (
              <button
                key={pane.id}
                type="button"
                role="tab"
                id={`workspace-tab-${pane.id}`}
                aria-selected={isSelected}
                aria-controls={`workspace-tabpanel-${pane.id}`}
                data-testid={`mobile-pane-tab-${pane.id}`}
                onClick={() => handleSelectPane(pane.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 border border-transparent'
                }`}
              >
                {getPaneIcon(pane.id)}
                <span>{pane.label}</span>
              </button>
            );
          })}
        </div>

        {onOpenShortcuts && (
          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-label="Open keyboard shortcuts and accessibility settings"
            title="Keyboard shortcuts (?)"
            className="ml-1 shrink-0 rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <Keyboard className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Main 3-Column Synchronized Workspace Container */}
      <div
        className={`w-full max-w-full flex-1 ${
          forceCompactMode
            ? 'flex flex-col'
            : 'flex flex-col lg:grid lg:grid-cols-12 lg:gap-3 lg:p-3'
        }`}
      >
        {/* Column 1: Legal Source & Segmentation */}
        <section
          id="workspace-tabpanel-legal"
          role="region"
          aria-label="Column 1: Legal Passage and Normative Clauses"
          data-testid="workspace-pane-legal"
          className={`${
            forceCompactMode
              ? currentPane === 'legal'
                ? 'flex flex-col flex-1'
                : 'hidden'
              : `${
                  currentPane === 'legal' ? 'flex flex-col flex-1' : 'hidden'
                } lg:col-span-3 lg:flex lg:flex-col`
          } min-w-0 overflow-hidden rounded-none lg:rounded-xl border-b lg:border ${borderClass} bg-[#0a0f24]/90`}
        >
          {col1Content}
        </section>

        {/* Column 2: Active Stage / GAM Formal Graph */}
        <section
          id="workspace-tabpanel-pipeline"
          role="region"
          aria-label="Column 2: GAM Pipeline and Formal Governance Graph"
          data-testid="workspace-pane-pipeline"
          className={`${
            forceCompactMode
              ? currentPane === 'pipeline'
                ? 'flex flex-col flex-1'
                : 'hidden'
              : `${
                  currentPane === 'pipeline' ? 'flex flex-col flex-1' : 'hidden'
                } lg:col-span-5 lg:flex lg:flex-col`
          } min-w-0 overflow-hidden rounded-none lg:rounded-xl border-b lg:border ${borderClass} bg-[#0a0f24]/90`}
        >
          {col2Content}
        </section>

        {/* Column 3: Synchronized GAL-JSON & Validation */}
        <section
          id="workspace-tabpanel-gal"
          role="region"
          aria-label="Column 3: Synchronized GAL-JSON and Formal Validation"
          data-testid="workspace-pane-gal"
          className={`${
            forceCompactMode
              ? currentPane === 'gal'
                ? 'flex flex-col flex-1'
                : 'hidden'
              : `${
                  currentPane === 'gal' ? 'flex flex-col flex-1' : 'hidden'
                } lg:col-span-4 lg:flex lg:flex-col`
          } min-w-0 overflow-hidden rounded-none lg:rounded-xl border-b lg:border ${borderClass} bg-[#0a0f24]/90`}
        >
          {col3Content}
        </section>
      </div>

      {bottomBar && <div className="w-full shrink-0">{bottomBar}</div>}
    </div>
  );
};

export default ResponsiveStageLayout;
