import { translateCustomPassage } from './engine/gam-adapter/translation-adapter';
import { emitAlloy } from './engine/gam-core/alloy-emitter.js';

export interface LawToGalPipelineOutput {
  jurisdiction: string;
  source_url: string;
  gal_representation: Record<string, unknown>;
  polarity_split: {
    permits: number;
    prohibits: number;
    structural: number;
    uncertain: number;
  };
  deontic_operators: {
    Must: number;
    May: number;
    Shall: number;
    Can: number;
    Prohibits: number;
  };
  validation_status: 'human-reviewed' | 'actual-generated' | 'unverified-draft';
  alloy_spec: string;
  alloySpecification: string;
  generation_confidence: number;
  graph: {
    nodes: unknown[];
    edges: unknown[];
  };
}

const JURISDICTION_MAP: Record<string, { country: string; level: string; name: string }> = {
  canada_federal: { country: 'CA', level: 'Federal', name: 'PIPEDA (Canada Federal)' },
  ontario: { country: 'CA', level: 'Provincial', name: 'Ontario PHIPA' },
  quebec: { country: 'CA', level: 'Provincial', name: 'Quebec Law 25' },
  us_federal: { country: 'US', level: 'Federal', name: 'US Federal (HIPAA / SOX)' },
  california: { country: 'US', level: 'State', name: 'California CCPA/CPRA' },
  eu_union: { country: 'EU', level: 'Supranational', name: 'EU GDPR' },
  uk: { country: 'UK', level: 'Federal', name: 'UK Data Protection Act 2018' },
  germany: { country: 'DE', level: 'Federal', name: 'Germany BDSG' },
  france: { country: 'FR', level: 'Federal', name: 'France Loi Informatique et Libertés' },
};

function countRegex(text: string, regex: RegExp): number {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

export async function runLawToGalPipeline(
  jurisdiction: string,
  statuteText: string,
  sourceUrl = ''
): Promise<LawToGalPipelineOutput> {
  const jurMeta = JURISDICTION_MAP[jurisdiction] ?? {
    country: 'OTHER',
    level: 'Federal',
    name: jurisdiction,
  };

  const trace = translateCustomPassage(statuteText, jurMeta);
  const galModel = trace.galModel as unknown as Record<string, unknown>;
  const alloySpec = trace.validation?.alloySpecification || emitAlloy(trace.galModel, {});

  const edges = trace.graph?.edges ?? [];
  const permits = edges.filter((e) => e.polarity === '+').length;
  const prohibits = edges.filter((e) => e.polarity === '-').length;
  const structural = edges.filter((e) => e.polarity === 'structural').length;
  const uncertain = edges.filter((e) => e.polarity === 'uncertain').length;

  const mustCount = countRegex(statuteText, /\b(must|is required to|obligated to)\b/gi);
  const shallCount = countRegex(statuteText, /\b(shall)\b(?!\s+not)/gi);
  const mayCount = countRegex(statuteText, /\b(may|is permitted to|authorized to)\b(?!\s+not)/gi);
  const canCount = countRegex(statuteText, /\b(can|entitled to)\b(?!\s+not)/gi);
  const prohibitsCount =
    countRegex(statuteText, /\b(shall\s+not|must\s+not|may\s+not|cannot|prohibited|forbidden)\b/gi) +
    prohibits;

  return {
    jurisdiction,
    source_url: sourceUrl,
    gal_representation: {
      ...galModel,
      source_url: sourceUrl,
    },
    polarity_split: {
      permits: Math.max(permits, mayCount + canCount),
      prohibits: Math.max(prohibits, prohibitsCount),
      structural,
      uncertain,
    },
    deontic_operators: {
      Must: Math.max(mustCount, trace.validation?.counts?.relations ?? 0),
      May: mayCount,
      Shall: shallCount,
      Can: canCount,
      Prohibits: prohibitsCount,
    },
    validation_status: 'actual-generated',
    alloy_spec: alloySpec,
    alloySpecification: alloySpec,
    generation_confidence: trace.validation?.structuralValid ? 0.94 : 0.85,
    graph: {
      nodes: trace.graph?.nodes ?? [],
      edges,
    },
  };
}
