import React, { useEffect, useRef } from 'react';
import { Keyboard, X, Eye, Compass, ShieldCheck } from 'lucide-react';
import type { ViewportOverrideMode } from './useAccessibilityPreferences';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reducedMotion?: boolean;
  onToggleReducedMotion?: () => void;
  highContrastBorders?: boolean;
  onToggleHighContrastBorders?: () => void;
  viewportOverride?: ViewportOverrideMode;
  onChangeViewportOverride?: (mode: ViewportOverrideMode) => void;
}

export interface ShortcutDefinition {
  keys: string[];
  action: string;
  context: string;
}

export const KEYBOARD_SHORTCUTS: ShortcutDefinition[] = [
  {
    keys: ['Space'],
    action: 'Pause or resume the GAM pipeline playback animation',
    context: 'Translation Workspace (when not focused in an input)',
  },
  {
    keys: ['→', 'ArrowRight'],
    action: 'Advance to the next pipeline stage or formal derivation event',
    context: 'Translation Workspace & Step Scrubber',
  },
  {
    keys: ['←', 'ArrowLeft'],
    action: 'Step backward to the previous pipeline stage or event',
    context: 'Translation Workspace & Step Scrubber',
  },
  {
    keys: ['R'],
    action: 'Replay translation pipeline from Stage 1 (Source Intake)',
    context: 'Translation Workspace',
  },
  {
    keys: ['1', '–', '7'],
    action: 'Jump directly to Pipeline Stage 1–7',
    context: 'Pipeline Stage Stepper',
  },
  {
    keys: ['Tab', 'Shift + Tab'],
    action: 'Navigate between interactive clauses, graph nodes, and GAL-JSON elements',
    context: 'All Screens',
  },
  {
    keys: ['?'],
    action: 'Toggle this Keyboard Shortcuts & Accessibility dialog',
    context: 'Global',
  },
  {
    keys: ['Esc', 'Escape'],
    action: 'Close active modal dialog, drawer, or clear selection',
    context: 'Global',
  },
];

export const SCREEN_READER_LANDMARKS = [
  {
    role: 'banner',
    label: 'Global Navigation & Jurisdiction Header',
    description: 'Contains screen switcher, active law citation, and accessibility controls.',
  },
  {
    role: 'navigation',
    label: '7-Stage GAM Pipeline Stepper',
    description: 'Allows direct keyboard traversal across Source, Segment, Extract, Entity, Relation, GAL, and Validate stages.',
  },
  {
    role: 'region',
    label: 'Column 1: Legal Passage & Normative Clauses',
    description: 'Displays authoritative statutory text, clause segmentation, and provenance spans.',
  },
  {
    role: 'region',
    label: 'Column 2: GAM Pipeline & Formal Graph (Φ)',
    description: 'Interactive 4-sort GAM graph (Process, Activity, Role, User) and stage inspector.',
  },
  {
    role: 'region',
    label: 'Column 3: Synchronized GAL-JSON & Formal Validation',
    description: 'Live Governance Analysis Language JSON output, consistency report, and Alloy specification.',
  },
  {
    role: 'status (aria-live="polite")',
    label: 'Pipeline Stage Transition Announcer',
    description: 'Automatically announces stage transitions, active step explanations, and validation status updates.',
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  reducedMotion = false,
  onToggleReducedMotion,
  highContrastBorders = false,
  onToggleHighContrastBorders,
  viewportOverride = 'auto',
  onChangeViewportOverride,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-modal-title"
      aria-describedby="keyboard-shortcuts-modal-desc"
      data-testid="keyboard-shortcuts-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-cyan-500/30 bg-[#0a0f24] text-slate-100 shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-[#0a0f24]/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <Keyboard className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            <h2
              id="keyboard-shortcuts-modal-title"
              className="text-lg font-semibold tracking-tight text-slate-100"
            >
              Keyboard Navigation &amp; Accessibility
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close accessibility and keyboard shortcuts dialog"
            data-testid="close-shortcuts-modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <p id="keyboard-shortcuts-modal-desc" className="text-sm text-slate-300">
            Control the LAW → GAL formal translation pipeline using keyboard shortcuts, customize motion
            and contrast preferences, or inspect screen-reader ARIA landmarks.
          </p>

          {/* Accessibility Preferences Toggles */}
          {(onToggleReducedMotion || onToggleHighContrastBorders || onChangeViewportOverride) && (
            <section aria-labelledby="a11y-preferences-heading" className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                <Eye className="h-4 w-4" aria-hidden="true" />
                <h3 id="a11y-preferences-heading">Visual &amp; Motion Preferences</h3>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {onToggleReducedMotion && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={reducedMotion}
                    onClick={onToggleReducedMotion}
                    data-testid="toggle-reduced-motion"
                    className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${
                      reducedMotion
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-100'
                        : 'border-slate-800 bg-[#111936]/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-medium">Reduced Motion</div>
                      <div className="text-xs text-slate-400">
                        Minimize particle &amp; camera transitions
                      </div>
                    </div>
                    <span
                      className={`ml-3 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        reducedMotion
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {reducedMotion ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )}

                {onToggleHighContrastBorders && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={highContrastBorders}
                    onClick={onToggleHighContrastBorders}
                    data-testid="toggle-high-contrast"
                    className={`flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-colors ${
                      highContrastBorders
                        ? 'border-cyan-400 bg-cyan-950/40 text-cyan-100'
                        : 'border-slate-800 bg-[#111936]/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-medium">High-Contrast Borders</div>
                      <div className="text-xs text-slate-400">
                        Sharpen pane &amp; formal sort boundaries
                      </div>
                    </div>
                    <span
                      className={`ml-3 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        highContrastBorders
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {highContrastBorders ? 'ON' : 'OFF'}
                    </span>
                  </button>
                )}
              </div>

              {onChangeViewportOverride && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#111936]/40 p-3">
                  <div className="text-xs text-slate-300">
                    <span className="font-medium text-slate-200">Responsive Layout Mode:</span>{' '}
                    Auto-detected from window width or preview a target device layout.
                  </div>
                  <div className="flex items-center gap-1" role="group" aria-label="Viewport mode override">
                    {(['auto', 'desktop', 'tablet', 'mobile'] as ViewportOverrideMode[]).map(
                      (mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => onChangeViewportOverride(mode)}
                          aria-pressed={viewportOverride === mode}
                          data-testid={`viewport-override-${mode}`}
                          className={`rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                            viewportOverride === mode
                              ? 'bg-cyan-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {mode}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Keyboard Shortcuts Table */}
          <section aria-labelledby="shortcuts-list-heading" className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              <Compass className="h-4 w-4" aria-hidden="true" />
              <h3 id="shortcuts-list-heading">Keyboard Shortcuts</h3>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#111936]/40">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-900/70 text-xs uppercase text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Key
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      Action
                    </th>
                    <th scope="col" className="hidden px-4 py-2.5 font-semibold sm:table-cell">
                      Scope
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {KEYBOARD_SHORTCUTS.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          {item.keys.map((k, kIdx) => (
                            <kbd
                              key={kIdx}
                              className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-xs font-semibold text-cyan-300 shadow-sm"
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-200">{item.action}</td>
                      <td className="hidden px-4 py-2.5 text-xs text-slate-400 sm:table-cell">
                        {item.context}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Screen Reader Landmarks */}
          <section aria-labelledby="landmarks-heading" className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <h3 id="landmarks-heading">Screen-Reader Landmarks &amp; ARIA Regions</h3>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SCREEN_READER_LANDMARKS.map((landmark, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-slate-800/90 bg-[#111936]/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">{landmark.label}</span>
                    <code className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] text-emerald-400">
                      {landmark.role}
                    </code>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{landmark.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-[#0a0f24] px-6 py-3 text-xs text-slate-400">
          <span>Press Esc at any time to dismiss this dialog.</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-cyan-500 px-4 py-1.5 font-semibold text-slate-950 hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
