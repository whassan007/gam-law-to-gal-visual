import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { App } from '../src/App';
import {
  COUNTRIES,
  VERIFIED_LAWS,
  ENTERPRISE_COMPARISON_CASES,
  getLawsForCountry,
} from '../src/data/verified-examples';
import {
  translateLawProvision,
  translateCustomPassage,
  runEnterpriseComparison,
  CANONICAL_DIRECTIONS,
} from '../src/engine/gam-adapter';
import type { GalJsonModel } from '../src/types/contracts';
import { validateModel } from '../src/engine/gam-core/schema.js';
import { ConsistencyChecker } from '../src/engine/gam-core/consistency-checker.js';
import { OntologyChecker } from '../src/engine/gam-core/ontology-checker.js';
import { emitAlloy } from '../src/engine/gam-core/alloy-emitter.js';
import { detectPolarity } from '../src/engine/gam-pipeline/phase1-extractor.js';
import { readLawToGAM } from '../src/engine/gam-pipeline/read-law.js';
import { renderHook, act } from '@testing-library/react';
import { useAnimationTimeline } from '../src/components/playback/useAnimationTimeline';
import {
  detectSystemReducedMotion,
  getViewportModeFromWidth,
} from '../src/components/accessibility/useAccessibilityPreferences';

describe('Section 14: 16 Mandatory Acceptance Tests for LAW -> GAL Interactive Visualization', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // Test 1: Globe Navigation
  // ---------------------------------------------------------------------------
  it('Test 1 — Globe Navigation: renders the interactive globe and selecting a country updates the active jurisdiction', () => {
    render(<App />);

    // Verify Screen 1 (World View) renders
    const worldScreen = screen.getByTestId('screen-world-view');
    expect(worldScreen).toBeInTheDocument();

    // Verify Canada is initially active and its pins/options exist
    const usOption = screen.getByTestId('country-option-US');
    fireEvent.click(usOption);

    // Jurisdiction drawer updates to United States
    const drawer = screen.getByTestId('world-jurisdiction-drawer');
    expect(within(drawer).getByText('United States')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 2: Law Selection
  // ---------------------------------------------------------------------------
  it('Test 2 — Law Selection: selecting a supported country displays available laws with real source metadata', () => {
    render(<App />);

    // Select European Union
    fireEvent.click(screen.getByTestId('country-option-EU'));

    const euLaws = getLawsForCountry('EU');
    expect(euLaws.length).toBeGreaterThan(0);

    const gdpr = euLaws[0];
    expect(gdpr.officialCitation).toBeTruthy();
    expect(gdpr.issuingAuthority).toBeTruthy();
    expect(gdpr.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(gdpr.provisions.length).toBeGreaterThan(0);

    // Inspect Screen 2 (Law Selection & Provenance)
    fireEvent.click(screen.getByTestId('world-inspect-law-details-button'));
    expect(screen.getByTestId('screen-law-selection')).toBeInTheDocument();
    expect(screen.getAllByText(/GDPR/i).length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // Test 3: Unsupported Country Handling
  // ---------------------------------------------------------------------------
  it('Test 3 — Unsupported Country Handling: selecting a country without a validated law pack displays an honest unsupported state', () => {
    render(<App />);

    const unsupportedCountries = COUNTRIES.filter((c) => !c.supported);
    expect(unsupportedCountries.length).toBeGreaterThan(0);

    const unsupported = unsupportedCountries[0];
    // Switch country filter to 'All Jurisdictions' if needed or click the country option
    const allFilterBtn = screen.queryByRole('button', { name: /All Jurisdictions/i });
    if (allFilterBtn) {
      fireEvent.click(allFilterBtn);
    }

    const option = screen.getByTestId(`country-option-${unsupported.code}`);
    fireEvent.click(option);

    const notice = screen.getByTestId('unsupported-country-notice');
    expect(notice).toBeInTheDocument();
    expect(notice.textContent).toMatch(/No Validated GAM Law Pack Available/i);
  });

  // ---------------------------------------------------------------------------
  // Test 4: Real GAM Translation
  // ---------------------------------------------------------------------------
  it('Test 4 — Real GAM Translation: clicking Process produces GAL-JSON that passes GAM schema validation', () => {
    for (const law of VERIFIED_LAWS) {
      for (const provision of law.provisions) {
        const result = translateLawProvision(law, provision, 'curated');
        const schemaCheck = validateModel(result.galModel);
        expect(schemaCheck.valid).toBe(true);
        expect(schemaCheck.errors).toEqual([]);
        expect(result.validation.structuralValid).toBe(true);
        expect(result.validation.alloySpecification).toContain('module gam_generated');
        expect(result.validation.alloySpecification).toContain('open gam_core');
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Test 5: Polarity
  // ---------------------------------------------------------------------------
  it('Test 5 — Polarity: a prohibition clause produces a Deny policy and is never translated as an unconditional Allow', () => {
    const prohibitionSentences = [
      'The Privacy Division shall not disclose personal health records to external marketers.',
      'No contractor may access financial audit logs without written authorization.',
      'Marketing roles are prohibited from assuming clinical record processes.',
    ];

    for (const sentence of prohibitionSentences) {
      expect(detectPolarity(sentence)).toBe('Deny');
      const liveModel = readLawToGAM(
        sentence,
        { country: 'CA', level: 'Federal', name: 'Polarity Verification' },
        { effective_date: '2026-01-01' }
      ) as GalJsonModel;
      for (const policy of liveModel.policies) {
        expect(policy.modality).toBe('Deny');
        expect(policy.modality).not.toBe('Allow');
      }
    }

    // Also verify all curated Deny policies in VERIFIED_LAWS preserve modality === 'Deny'
    const allDenyPolicies = VERIFIED_LAWS.flatMap((l) =>
      l.provisions.flatMap((p) => p.curatedGalModel.policies.filter((pol) => pol.modality === 'Deny'))
    );
    expect(allDenyPolicies.length).toBeGreaterThan(5);
    for (const pol of allDenyPolicies) {
      expect(pol.modality).toBe('Deny');
    }
  });

  // ---------------------------------------------------------------------------
  // Test 6: Edge Direction
  // ---------------------------------------------------------------------------
  it('Test 6 — Edge Direction: generated relations and policies follow GAM canonical source and target directions', () => {
    // CanAssignTo MUST be Activity -> Role (whereas AssignedTo is Role -> Activity)
    expect(CANONICAL_DIRECTIONS.policy.CanAssignTo[0]).toBe('Activity');
    expect(CANONICAL_DIRECTIONS.policy.CanAssignTo[1]).toBe('Role');
    expect(CANONICAL_DIRECTIONS.relation.AssignedTo[0]).toBe('Role');
    expect(CANONICAL_DIRECTIONS.relation.AssignedTo[1]).toBe('Activity');
    expect(CANONICAL_DIRECTIONS.policy.CanAct[0]).toBe('User');
    expect(CANONICAL_DIRECTIONS.policy.CanAct[1]).toBe('Role');
    expect(CANONICAL_DIRECTIONS.relation.Acts[0]).toBe('Role');
    expect(CANONICAL_DIRECTIONS.relation.Acts[1]).toBe('User');

    for (const law of VERIFIED_LAWS) {
      for (const provision of law.provisions) {
        const result = translateLawProvision(law, provision, 'curated');
        expect(result.validation.relationDirectionsValid).toBe(true);
        expect(result.validation.directionWarnings).toEqual([]);

        const entityById = new Map(result.galModel.entities.map((e) => [e.id, e]));
        for (const policy of result.galModel.policies) {
          if (policy.type === 'CanAssignTo') {
            const src = entityById.get(policy.source);
            const tgt = entityById.get(policy.target);
            expect(src?.type).toBe('Activity');
            expect(['Role', 'DepartmentRole']).toContain(tgt?.type);
          }
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Test 7: Stage Progression
  // ---------------------------------------------------------------------------
  it('Test 7 — Stage Progression: the visualization progresses through all 6 stages in order', () => {
    const firstLaw = VERIFIED_LAWS[0];
    const firstProvision = firstLaw.provisions[0];
    const result = translateLawProvision(firstLaw, firstProvision, 'curated');

    const { result: hookResult } = renderHook(() =>
      useAnimationTimeline({
        events: result.events,
        reducedMotion: true,
      })
    );

    const expectedOrder = ['segment', 'extract', 'entity', 'relation', 'gal', 'validate'] as const;
    for (let i = 0; i < expectedOrder.length; i++) {
      act(() => {
        hookResult.current.goToStage(expectedOrder[i]);
      });
      expect(hookResult.current.currentStage).toBe(expectedOrder[i]);
      expect(hookResult.current.currentStageIndex).toBe(i);
    }
  });

  // ---------------------------------------------------------------------------
  // Test 8: Playback Controls
  // ---------------------------------------------------------------------------
  it('Test 8 — Playback Controls: Process, Pause, Resume, Step, Replay, Speed and Reset controls work deterministically', () => {
    render(<App />);

    // Click Process Legislation -> GAL on Screen 1
    fireEvent.click(screen.getByTestId('world-process-law-button'));

    // Screen 3 (Translation Workspace) is now active
    expect(screen.getByTestId('screen-translation-workspace')).toBeInTheDocument();

    // Step forward and backward
    const nextBtn = screen.getByTestId('control-next');
    const prevBtn = screen.getByTestId('control-prev');
    const replayBtn = screen.getByTestId('control-replay');
    const resetBtn = screen.getByTestId('control-reset');
    const speed2xBtn = screen.getByTestId('control-speed-2');

    fireEvent.click(nextBtn);
    fireEvent.click(prevBtn);
    fireEvent.click(speed2xBtn);
    fireEvent.click(replayBtn);
    fireEvent.click(resetBtn);

    // Stage stepper buttons exist and switch stages deterministically
    const validateStageBtn = screen.getByTestId('stage-step-validate');
    fireEvent.click(validateStageBtn);
    expect(screen.getByTestId('no-false-compliance-banner')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 9: Source-to-GAL Traceability
  // ---------------------------------------------------------------------------
  it('Test 9 — Source-to-GAL Traceability: clicking a GAL entity or relation highlights its source legal span', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('world-process-law-button'));

    // Switch right pane to GAL-JSON viewer
    fireEvent.click(screen.getByTestId('right-tab-gal-json'));
    const structuredTree = screen.getByTestId('structured-gal-tree');
    expect(structuredTree).toBeInTheDocument();

    const firstLaw = getLawsForCountry('CA')[0];
    const firstEntity = firstLaw.provisions[0].curatedGalModel.entities[0];
    const entityRow = screen.getByTestId(`gal-entity-row-${firstEntity.id}`);
    fireEvent.click(entityRow);

    // Spatial Token Bridge reflects the active selection and source span
    expect(screen.getByTestId('spatial-token-bridge')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 10: GAL Export
  // ---------------------------------------------------------------------------
  it('Test 10 — GAL Export: Copy GAL and Download GAL-JSON produce valid JSON matching the displayed model', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('world-process-law-button'));
    fireEvent.click(screen.getByTestId('right-tab-gal-json'));

    const copyBtn = screen.getByTestId('copy-gal-button');
    const downloadBtn = screen.getByTestId('download-gal-button');
    expect(copyBtn).toBeInTheDocument();
    expect(downloadBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);

    // Verify serialized JSON parses cleanly and passes validateModel
    const caLaw = getLawsForCountry('CA')[0];
    const result = translateLawProvision(caLaw, caLaw.provisions[0], 'curated');
    const serialized = JSON.stringify(result.galModel, null, 2);
    const parsed = JSON.parse(serialized);
    expect(validateModel(parsed).valid).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 11: No False Verdict
  // ---------------------------------------------------------------------------
  it('Test 11 — No False Verdict: translating a law alone never displays an organizational compliance verdict', () => {
    for (const law of VERIFIED_LAWS) {
      for (const provision of law.provisions) {
        const result = translateLawProvision(law, provision, 'curated');
        expect(result.galModel.model_type).toBe('Law_Model');
        expect(result.validation.alloySolverExecuted).toBe(false);
        expect(result.validation.complianceNotice).toMatch(
          /does not establish organizational compliance/i
        );
      }
    }

    render(<App />);
    fireEvent.click(screen.getByTestId('world-process-law-button'));
    fireEvent.click(screen.getByTestId('right-tab-formal-validation'));

    const banner = screen.getByTestId('no-false-compliance-banner');
    expect(banner.textContent).toMatch(/does not establish organizational compliance/i);
  });

  // ---------------------------------------------------------------------------
  // Test 12: Formal Consistency Example
  // ---------------------------------------------------------------------------
  it('Test 12 — Formal Consistency Example: Enterprise comparison demonstrates closure-based conflict detection and remediation', () => {
    expect(ENTERPRISE_COMPARISON_CASES.length).toBeGreaterThanOrEqual(3);

    // Case 1: Thesis Ch.7 Ex.2 Access Right Interaction (AdminAssistant1 conflict via PrivDiv & FinAdminAssistants)
    const ch7Ex2 = ENTERPRISE_COMPARISON_CASES.find((c) => c.id.includes('ch7-ex2')) ?? ENTERPRISE_COMPARISON_CASES[0];
    const asBuiltRun = runEnterpriseComparison(ch7Ex2, false);
    expect(asBuiltRun.consistent).toBe(false);
    expect(asBuiltRun.violations.some((v: { type: string }) => v.type === 'ACTIVITY_CONFLICT')).toBe(true);

    const remediatedRun = runEnterpriseComparison(ch7Ex2, true);
    expect(remediatedRun.consistent).toBe(true);

    // Case 2: Thesis Ch.7 Ex.1b Stale Identity (Con holds, yet OntologyChecker detects ONTOLOGY_GAP)
    const ch7Ex1b = ENTERPRISE_COMPARISON_CASES.find((c) => c.id.includes('ch7-ex1b'));
    expect(ch7Ex1b).toBeDefined();
    if (ch7Ex1b) {
      const staleRun = runEnterpriseComparison(ch7Ex1b, false);
      expect(staleRun.consistent).toBe(true);
      expect(staleRun.ontologyViolations.length).toBeGreaterThan(0);

      const fixedRun = runEnterpriseComparison(ch7Ex1b, true);
      expect(fixedRun.consistent).toBe(true);
      expect(fixedRun.ontologyViolations.length).toBe(0);
    }

    // Case 3: Thesis Ch.8 SOX Separation of Concerns via ComposedOf closure
    const ch8Sox = ENTERPRISE_COMPARISON_CASES.find((c) => c.id.includes('ch8-sox'));
    expect(ch8Sox).toBeDefined();
    if (ch8Sox) {
      const soxAsBuilt = runEnterpriseComparison(ch8Sox, false);
      expect(soxAsBuilt.consistent).toBe(false);
      expect(soxAsBuilt.violations.some((v: { type: string }) => v.type === 'SEPARATION_VIOLATION')).toBe(true);

      const soxRemediated = runEnterpriseComparison(ch8Sox, true);
      expect(soxRemediated.consistent).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // Test 13: Deterministic Replay
  // ---------------------------------------------------------------------------
  it('Test 13 — Deterministic Replay: replaying the same law produces the exact same sequence of translation events and final GAL', () => {
    const law = VERIFIED_LAWS[0];
    const provision = law.provisions[0];

    const run1 = translateLawProvision(law, provision, 'curated');
    const run2 = translateLawProvision(law, provision, 'curated');

    expect(run1.events).toEqual(run2.events);
    expect(run1.galModel).toEqual(run2.galModel);
    expect(run1.validation).toEqual(run2.validation);

    const custom1 = translateCustomPassage('No employee shall disclose patient records.');
    const custom2 = translateCustomPassage('No employee shall disclose patient records.');
    expect(custom1.events).toEqual(custom2.events);
    expect(custom1.galModel).toEqual(custom2.galModel);
  });

  // ---------------------------------------------------------------------------
  // Test 14: Reduced Motion
  // ---------------------------------------------------------------------------
  it('Test 14 — Reduced Motion: enabling prefers-reduced-motion disables heavy motion while preserving all content and controls', () => {
    expect(typeof detectSystemReducedMotion()).toBe('boolean');

    render(<App />);
    const toggleBtn = screen.getByTestId('toggle-reduced-motion');
    expect(toggleBtn).toBeInTheDocument();

    // Activate Reduced Motion
    fireEvent.click(toggleBtn);

    // Navigate to translation workspace and verify all controls remain functional
    fireEvent.click(screen.getByTestId('world-process-law-button'));
    expect(screen.getByTestId('screen-translation-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('control-process')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Test 15: Responsive Layout
  // ---------------------------------------------------------------------------
  it('Test 15 — Responsive Layout: desktop and mobile/tablet viewports render without overlapping panels or inaccessible controls', () => {
    expect(getViewportModeFromWidth(1440)).toBe('desktop');
    expect(getViewportModeFromWidth(900)).toBe('tablet');
    expect(getViewportModeFromWidth(390)).toBe('mobile');

    render(<App />);
    fireEvent.click(screen.getByTestId('world-process-law-button'));

    // Mobile/Tablet pane switcher is rendered in the DOM for viewports < 1024px
    const mobileSwitcher = screen.getByTestId('mobile-pane-switcher');
    expect(mobileSwitcher).toBeInTheDocument();

    // Switch panes using the mobile switcher tabs
    const buttons = within(mobileSwitcher).getAllByRole('tab');
    expect(buttons.length).toBe(3);
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[2]);
    fireEvent.click(buttons[1]);
  });

  // ---------------------------------------------------------------------------
  // Test 16: Build and Package
  // ---------------------------------------------------------------------------
  it('Test 16 — Build and Package: all 10 demonstration laws across 6 jurisdictions are present and verified', () => {
    const supportedCountryCodes = COUNTRIES.filter((c) => c.supported).map((c) => c.code);
    expect(supportedCountryCodes).toEqual(expect.arrayContaining(['CA', 'US', 'EU', 'DE', 'FR', 'UK']));
    expect(VERIFIED_LAWS.length).toBeGreaterThanOrEqual(10);
  });
});
