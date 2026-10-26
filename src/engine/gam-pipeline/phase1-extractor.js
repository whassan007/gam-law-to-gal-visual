/**
 * Phase 1: Pattern Extraction Engine
 * Decomposes natural language legal text into standardized compliance primitives
 * Supports all 14 pattern types from the GAM specification
 */

import { createEntity, createRelation } from '../gam-core/schema.js';

// ─── Pattern Definitions ────────────────────────────────────────────────────────

const PATTERN_DEFS = {
    // Class Patterns
    activity: {
        keywords: ['shall', 'must', 'perform', 'execute', 'conduct', 'submit', 'file', 'report',
            'notify', 'respond', 'collect', 'process', 'delete', 'obtain', 'certify',
            'evaluate', 'assess', 'audit', 'review', 'verify', 'sign', 'disclose',
            'dispatch', 'yield', 'stop', 'detect', 'equip', 'record', 'validate',
            'deactivate', 'monitor', 'inspect', 'test', 'approve', 'authorize', 'issue',
            'revoke', 'suspend', 'compensate', 'insure'],
        entityType: 'Activity',
    },
    process: {
        keywords: ['process', 'procedure', 'workflow', 'cycle', 'assessment', 'pipeline',
            'program', 'system', 'framework', 'mechanism', 'protocol', 'regime',
            'operation', 'management', 'lifecycle'],
        entityType: 'Process',
    },
    role: {
        keywords: ['officer', 'director', 'commissioner', 'supervisor', 'operator', 'driver',
            'controller', 'processor', 'auditor', 'manager', 'clerk', 'committee',
            'engineer', 'inspector', 'authority', 'entity', 'department', 'office',
            'board', 'administrator', 'custodian'],
        entityType: 'DepartmentRole',
    },
    legalEntity: {
        keywords: ['commission', 'agency', 'authority', 'board', 'administration', 'department',
            'ministry', 'office', 'tribunal', 'court', 'council'],
        entityType: 'LegalEntity',
    },

    // Data and Object patterns
    dataObject: {
        keywords: ['data', 'information', 'record', 'document', 'file', 'certificate',
            'statement', 'report', 'log', 'telemetry', 'biometric'],
        entityType: 'DataObject',
    },
    vehicle: {
        keywords: ['vehicle', 'car', 'truck', 'bus', 'taxi', 'motorcycle', 'scooter',
            'bicycle', 'autonomous', 'self-driving', 'robotaxi', 'robo-taxi'],
        entityType: 'Vehicle',
    },
    zone: {
        keywords: ['zone', 'area', 'lane', 'crossing', 'intersection', 'ramp', 'corridor',
            'walkway', 'crosswalk', 'geofence', 'region', 'district', 'location'],
        entityType: 'InfrastructureZone',
    },
    constraint: {
        keywords: ['limit', 'threshold', 'maximum', 'minimum', 'within', 'not exceed',
            'at least', 'no more than', 'shall not', 'speed', 'temperature',
            'distance', 'duration', 'retention', 'insurance'],
        entityType: 'Constraint',
    },
};

// ─── Relational Pattern Extractors ──────────────────────────────────────────────

const RELATIONAL_PATTERNS = {
    assignment: {
        patterns: [
            /(?:shall|must|is required to)\s+(?:be\s+)?(?:assigned|responsible|accountable)\s+(?:for|to)\s+(.+)/gi,
            /(\w+)\s+(?:shall|must)\s+(\w+)/gi,
        ],
        relationType: 'AssignedTo',
    },
    delegation: {
        patterns: [
            /(?:may|can)\s+delegate\s+(.+?)\s+to\s+(.+)/gi,
            /delegation\s+(?:of|from)\s+(.+?)\s+to\s+(.+)/gi,
        ],
        relationType: 'Delegate',
    },
    separation: {
        patterns: [
            /(?:shall not|must not|cannot)\s+(?:also|simultaneously|concurrently)/gi,
            /segregation\s+of\s+duties/gi,
            /separation\s+of\s+(?:duties|concerns|responsibilities)/gi,
            /incompatible\s+(?:functions|roles|duties)/gi,
        ],
        relationType: 'Separate',
    },
    sequence: {
        patterns: [
            /before\s+(.+?),?\s+(?:must|shall)\s+(.+)/gi,
            /after\s+(.+?),?\s+(?:must|shall)\s+(.+)/gi,
            /prior\s+to\s+(.+)/gi,
            /prerequisite/gi,
            /followed\s+by/gi,
        ],
        relationType: 'Next',
    },
    containment: {
        patterns: [
            /(?:includes?|contains?|comprises?|consists?\s+of)\s+(.+)/gi,
            /(?:part|component|element)\s+of\s+(.+)/gi,
        ],
        relationType: 'Contains',
    },
    countsAs: {
        patterns: [
            /counts?\s+as\s+(.+)/gi,
            /(?:is|are)\s+(?:deemed|considered|treated)\s+(?:as|to be)\s+(.+)/gi,
            /(?:constitutes?|qualifies?\s+as)\s+(.+)/gi,
        ],
        relationType: 'CountsAs',
    },
    reporting: {
        patterns: [
            /(?:must|shall)\s+(?:report|notify|inform|disclose)\s+(?:to\s+)?(.+)/gi,
            /mandatory\s+(?:reporting|notification|disclosure)/gi,
        ],
        relationType: 'MustReport',
    },
    equivalence: {
        patterns: [
            /equivalent\s+to\s+(.+)/gi,
            /same\s+as\s+(.+)/gi,
            /analogous\s+to\s+(.+)/gi,
        ],
        relationType: 'EquProcess',
    },
    obligation: {
        patterns: [
            /(?:shall|must|is\s+required\s+to)\s+(?:perform|execute|delete|submit|file|report|disclose|conduct|obtain|verify)\s+(.+)/gi,
            /obligation\s+to\s+(.+)/gi,
        ],
        relationType: 'Obligation',
    },
    prohibition: {
        patterns: [
            /(?:shall\s+not|must\s+not|is\s+prohibited\s+from|forbidden\s+to)\s+(.+)/gi,
            /prohibition\s+(?:on|against)\s+(.+)/gi,
        ],
        relationType: 'Prohibition',
    },
    permission: {
        patterns: [
            /(?:may|is\s+permitted\s+to|is\s+authorized\s+to|has\s+the\s+right\s+to)\s+(.+)/gi,
            /permission\s+to\s+(.+)/gi,
        ],
        relationType: 'Permission',
    },
    overrides: {
        patterns: [
            /(?:overrides|supersedes|takes\s+precedence\s+over|prevails\s+over)\s+(.+)/gi,
            /notwithstanding\s+(.+)/gi,
        ],
        relationType: 'Overrides',
    },
    mitigationControl: {
        patterns: [
            /(?:safeguarded\s+by|mitigated\s+by|control(?:led)?\s+by)\s+(.+)/gi,
            /mitigation\s+control\s+(.+)/gi,
        ],
        relationType: 'MitigationControl',
    },
    provenance: {
        patterns: [
            /(?:pursuant\s+to|derived\s+from|established\s+under|per|under\s+article)\s+(.+)/gi,
            /source\s+reference\s+(.+)/gi,
        ],
        relationType: 'Provenance',
    },
};

// ─── Higher-Level Pattern Extractors ────────────────────────────────────────────

const HIGHER_PATTERNS = {
    exemption: {
        keywords: ['except', 'exempt', 'exclusion', 'notwithstanding', 'provided that',
            'unless', 'save for', 'other than', 'does not apply'],
    },
    conditional: {
        keywords: ['if', 'when', 'where', 'provided that', 'on condition that',
            'subject to', 'in the event', 'upon', 'contingent'],
    },
    temporal: {
        keywords: ['between', 'from', 'until', 'during', 'within', 'by', 'before',
            'after', 'annually', 'quarterly', 'monthly', 'effective',
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'],
    },
    zoneBased: {
        keywords: ['within', 'inside', 'outside', 'adjacent to', 'near',
            'in the jurisdiction', 'in the province', 'in the state'],
    },
    deontic: {
        obligatory: ['shall', 'must', 'is required to', 'is obligated to', 'mandatory'],
        permitted: ['may', 'is permitted to', 'is allowed to', 'can', 'is authorized to'],
        prohibited: ['shall not', 'must not', 'may not', 'can not', 'shall never', 'must never',
            'is prohibited from', 'are prohibited from', 'prohibited from', 'cannot', 'is forbidden',
            'are forbidden', 'is not permitted', 'are not permitted', 'is not allowed', 'are not allowed'],
    },
};

// ─── Main Extraction Functions ──────────────────────────────────────────────────

/**
 * Extract all patterns from a block of legal text
 * @param {string} text - Natural language legal text
 * @param {Object} options - { jurisdiction, domain }
 * @returns {{ entities: Array, relations: Array, patterns: Array }}
 */
// ─── Polarity detection ─────────────────────────────────────────────────────
// "shall not disclose" and "shall disclose" previously matched the SAME
// obligation family. Polarity inversion is the most consequential error a
// compliance extractor can make: it turns a prohibition into a permission.
const NEGATION = /\b(?:shall not|must not|may not|cannot|can not|shall never|must never|is prohibited from|are prohibited from|prohibited from|is forbidden from|are forbidden from|forbidden from|is not permitted(?: to)?|are not permitted(?: to)?|is not allowed(?: to)?|are not allowed(?: to)?|no [a-z0-9_-]+(?:\s+[a-z0-9_-]+)?\s+(?:shall|may|must)|nothing in this (?:section|act) (?:shall|may))\b/i;

/** @returns {'Deny'|'Allow'} the polarity of a provision */
export function detectPolarity(text) {
  return NEGATION.test(String(text || '')) ? 'Deny' : 'Allow';
}

/** Split a provision into clauses so that per-clause polarity is preserved.
 *  A single sentence routinely carries both a grant and a carve-out. */
export function splitClauses(text) {
  return String(text || '')
    .split(/;|(?:,\s*(?:but|except|unless|provided that)\b)|(?:\.\s+)/i)
    .map(c => c.trim())
    .filter(Boolean);
}

export function extractPatterns(text, options = {}) {
    const sentences = splitIntoSentences(text);
    const entities = [];
    const relations = [];
    const patterns = [];
    const entityIndex = new Map();
    let entityCounter = 0;

    const genId = (prefix) => `${prefix}_${++entityCounter}`;

    for (const sentence of sentences) {
        const lower = sentence.toLowerCase();

        // Extract deontic modality
        const deontic = extractDeonticModality(lower);

        // Extract class patterns (entities)
        for (const [patType, patDef] of Object.entries(PATTERN_DEFS)) {
            for (const kw of patDef.keywords) {
                if (lower.includes(kw)) {
                    const entityName = extractEntityName(sentence, kw, patType);
                    if (entityName && !entityIndex.has(entityName.toLowerCase())) {
                        const id = genId(patType);
                        const entity = createEntity(id, patDef.entityType, entityName, {
                            jurisdiction: options.jurisdiction,
                            description: sentence.substring(0, 200),
                        });
                        entities.push(entity);
                        entityIndex.set(entityName.toLowerCase(), id);
                        patterns.push({
                            type: 'ClassPattern',
                            subtype: patType,
                            entity: id,
                            source: sentence,
                            deontic,
                        });
                    }
                    break;
                }
            }
        }

        // Extract relational patterns
        for (const [relType, relDef] of Object.entries(RELATIONAL_PATTERNS)) {
            for (const pat of relDef.patterns) {
                const match = sentence.match(pat);
                if (match) {
                    const rel = createRelation(relDef.relationType, 'Subject', 'Target');
                    relations.push(rel);
                    patterns.push({
                        type: 'RelationalPattern',
                        subtype: relType,
                        relationType: relDef.relationType,
                        source: sentence,
                        match: match[0],
                        deontic,
                    });
                    break;
                }
            }
        }

        // Extract higher-level patterns
        for (const [hlType, hlDef] of Object.entries(HIGHER_PATTERNS)) {
            if (hlType === 'deontic') continue;
            const keywords = hlDef.keywords || [];
            for (const kw of keywords) {
                if (lower.includes(kw)) {
                    patterns.push({
                        type: 'HigherPattern',
                        subtype: hlType,
                        keyword: kw,
                        source: sentence,
                        deontic,
                    });
                    break;
                }
            }
        }
    }

    return { entities, relations, patterns, entityIndex };
}

function splitIntoSentences(text) {
    return text
        .split(/(?<=[.;])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 5);
}

function extractEntityName(sentence, keyword, patternType) {
    // Simple extraction: grab the noun phrase around the keyword
    const idx = sentence.toLowerCase().indexOf(keyword);
    if (idx === -1) return null;

    // Look ahead for the entity name
    const after = sentence.substring(idx + keyword.length).trim();
    const words = after.split(/\s+/);

    // Capitalize and take relevant words
    const nameParts = [];
    for (const w of words) {
        if (w.match(/^[A-Z]/) || nameParts.length === 0) {
            nameParts.push(w.replace(/[.,;:()]/g, ''));
        } else {
            break;
        }
        if (nameParts.length >= 4) break;
    }

    return nameParts.join(' ') || null;
}

function extractDeonticModality(text) {
    for (const kw of HIGHER_PATTERNS.deontic.prohibited) {
        if (text.includes(kw)) return 'Prohibited';
    }
    for (const kw of HIGHER_PATTERNS.deontic.obligatory) {
        if (text.includes(kw)) return 'Obligatory';
    }
    for (const kw of HIGHER_PATTERNS.deontic.permitted) {
        if (text.includes(kw)) return 'Permitted';
    }
    return null;
}

/**
 * Extract specific compliance patterns from structured input
 * Used when the legal text has already been partially structured
 */
export function extractStructuredPatterns(sections) {
    const results = [];
    for (const section of sections) {
        const extracted = extractPatterns(section.text, {
            jurisdiction: section.jurisdiction,
            domain: section.domain,
        });
        results.push({
            section: section.title,
            ...extracted,
        });
    }
    return results;
}

export default { extractPatterns, extractStructuredPatterns };
