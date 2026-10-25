/**
 * @Read_Law_To_GAM — Parse legal text → strict GAL-JSON Law_Model (Φ_L)
 * Full pipeline: Phase 1 (Pattern Extraction) → Phase 2 (GAL Translation) → Phase 3 (Validation Logic)
 */

import { createModel, mergeModels } from '../gam-core/schema.js';
import { extractPatterns } from './phase1-extractor.js';
import { translatePatterns } from './phase2-translator.js';
import { generateValidationChecks } from './phase3-validator.js';

/**
 * @Read_Law_To_GAM(law_text, jurisdiction?)
 * @param {string} lawText - Natural language legal text
 * @param {Object} jurisdiction - { country, level, name }
 * @param {Object} options - { domains, effective_date }
 * @returns {Object} GAL-JSON Law_Model
 */
export function readLawToGAM(lawText, jurisdiction = {}, options = {}) {
    // Phase 1: Pattern Extraction
    const phase1 = extractPatterns(lawText, {
        jurisdiction: jurisdiction.name || '',
        domain: options.domains?.[0] || 'All',
    });

    // Phase 2: GAL Translation
    const phase2 = translatePatterns(phase1.patterns, phase1.entityIndex);

    // Combine entities
    const allEntities = [...phase1.entities, ...phase2.newEntities];

    // Build the Law Model
    const model = createModel('Law_Model', `Extracted from: ${lawText.substring(0, 100)}...`, jurisdiction, {
        effective_date: options.effective_date || new Date().toISOString().split('T')[0],
        domains: options.domains || ['All'],
        entities: allEntities,
        relations: phase2.relations,
        policies: phase2.policies,
    });

    // Phase 3: Generate Validation Checks
    model.validation_checks = generateValidationChecks(model);

    return model;
}

/**
 * Build a Law Model from pre-structured legal provisions
 * More precise than free-text extraction
 */
export function buildLawModel(context, jurisdiction, provisions) {
    const model = createModel('Law_Model', context, jurisdiction, {
        effective_date: provisions.effective_date,
        domains: provisions.domains || ['All'],
        entities: provisions.entities || [],
        relations: provisions.relations || [],
        policies: provisions.policies || [],
        theory_construction: provisions.theory_construction,
    });

    model.validation_checks = generateValidationChecks(model);
    return model;
}

/**
 * Merge multiple Law Models (e.g., combining federal + state requirements)
 */
export function mergeLawModels(models) {
    if (models.length === 0) return null;
    if (models.length === 1) return models[0];

    let merged = models[0];
    for (let i = 1; i < models.length; i++) {
        merged = mergeModels(merged, models[i]);
    }

    // Regenerate validation checks for merged model
    merged.validation_checks = generateValidationChecks(merged);
    return merged;
}

export default { readLawToGAM, buildLawModel, mergeLawModels };
