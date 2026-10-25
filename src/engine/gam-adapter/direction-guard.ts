import type { GalJsonModel, GalEntity, GamSort } from '../../types/contracts';

export const GAM_SORTS: readonly GamSort[] = ['Process', 'Activity', 'Role', 'User'];
type Direction = readonly [GamSort, GamSort, string];
/** Verified against GamModel._ingest, not POLICY_TYPES.args (internal storage order).
 * CanAssignTo and CanAct swap input target/source when ingested into RA and RU.
 * Equal-sort endpoints cannot establish parent/child or temporal direction by typing alone.
 */
export const CANONICAL_DIRECTIONS: Record<'relation' | 'policy', Record<string, Direction>> = {
  relation: {
    ComposedOf: ['Process', 'Process', 'parent Process → child Process (PP)'],
    Contains: ['Process', 'Activity', 'Process → Activity (PA)'],
    Includes: ['Role', 'Role', 'senior Role → junior Role (RR)'],
    Next: ['Activity', 'Activity', 'predecessor Activity → successor Activity (S)'],
    Separate: ['Process', 'Process', 'Process ↔ Process (X, symmetric)'],
    Acts: ['Role', 'User', 'Role → User (RU+)'],
    Assumes: ['User', 'Process', 'User → Process (UP+)'],
    AssignedTo: ['Role', 'Activity', 'Role → Activity (RA+)'],
    Reaches: ['Role', 'Process', 'Role → Process (RP+)'],
  },
  policy: {
    CanAssignTo: ['Activity', 'Role', 'Activity → Role (RA±)'],
    CanAct: ['User', 'Role', 'User → Role (RU±)'],
    CanAssume: ['User', 'Process', 'User → Process (UP±)'],
    CanReach: ['Role', 'Process', 'Role → Process (RP±)'],
    CanDelegate: ['Role', 'Role', 'from Role → to Role (D±; parameters.activity_or_process specifies scope)'],
  },
};

export function entitySort(entity?: GalEntity): GamSort | undefined {
  if (!entity) return undefined;
  if (entity.sort && GAM_SORTS.includes(entity.sort)) return entity.sort;
  if (GAM_SORTS.includes(entity.type as GamSort)) return entity.type as GamSort;
  if (entity.type === 'DepartmentRole') return 'Role';
  return undefined;
}

export function getCanonicalDirectionNote(kind: 'relation' | 'policy', type: string): string {
  return `${type}: ${CANONICAL_DIRECTIONS[kind][type]?.[2] ?? 'extension; no canonical GAM core direction'}`;
}

export function verifyEdgeDirections(model: GalJsonModel): { valid: boolean; warnings: string[] } {
  const entities = new Map(model.entities.map(e => [e.id, e]));
  const warnings: string[] = [];
  for (const kind of ['relation', 'policy'] as const) {
    for (const edge of kind === 'relation' ? model.relations : model.policies) {
      const expected = CANONICAL_DIRECTIONS[kind][edge.type];
      if (!expected) continue;
      const s = entitySort(entities.get(edge.source)), t = entitySort(entities.get(edge.target));
      if (s !== expected[0] || t !== expected[1]) {
        const reversed = expected[0] !== expected[1] && s === expected[1] && t === expected[0];
        warnings.push(`Critical ${reversed ? 'direction error (reversed edge)' : 'endpoint typing error'}: ${edge.id ?? edge.type} (${edge.source}: ${s ?? 'unknown'} → ${edge.target}: ${t ?? 'unknown'}). Expected ${getCanonicalDirectionNote(kind, edge.type)}.`);
      }
    }
  }
  return { valid: warnings.length === 0, warnings };
}

/** Copy and normalize only reversals proved by distinct endpoint sorts. Never guess equal-sort semantics. */
export function normalizeEdgeDirections(input: GalJsonModel): GalJsonModel {
  const model = structuredClone(input);
  const entities = new Map(model.entities.map(e => [e.id, e]));
  for (const kind of ['relation', 'policy'] as const) {
    for (const edge of kind === 'relation' ? model.relations : model.policies) {
      const d = CANONICAL_DIRECTIONS[kind][edge.type];
      if (d && d[0] !== d[1] && entitySort(entities.get(edge.source)) === d[1] && entitySort(entities.get(edge.target)) === d[0]) {
        [edge.source, edge.target] = [edge.target, edge.source];
        edge.rationale = `${edge.rationale ? `${edge.rationale} ` : ''}Normalized reversed endpoints: ${getCanonicalDirectionNote(kind, edge.type)}.`;
      }
    }
  }
  return model;
}
