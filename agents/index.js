/**
 * Agent Registry
 * 
 * Standardized registration and classification of all audit agents.
 */

// --- Detection Agents ---
const altTextAgent = require('./altTextAgent');

// --- Analysis Agents ---
const altQualityAgent = require('./altQualityAgent');

// --- Validation Agents ---
const formAccessibilityAgent = require('./formAccessibilityAgent');
const formErrorAgent = require('./formErrorAgent');

// --- Structure Agents ---
const headingStructureAgent = require('./headingStructureAgent');
const landmarkAgent = require('./landmarkAgent');

// --- Navigation Agents ---
const linkAgent = require('./linkAgent');
const linkTextAgent = require('./linkTextAgent');
const navigationAgent = require('./navigationAgent');

// --- Legacy / Temporary ---
const wcagAgent = require('./wcagAgent');

const registry = {
    // Detection
    altTextAgent,
    altText: altTextAgent,

    // Analysis
    altQualityAgent,
    altQuality: altQualityAgent,

    // Validation
    formAccessibilityAgent,
    formAccessibility: formAccessibilityAgent,
    formErrorAgent,
    formError: formErrorAgent,

    // Structure
    headingStructureAgent,
    headingStructure: headingStructureAgent,
    landmarkAgent,
    landmark: landmarkAgent,

    // Navigation
    linkAgent,
    link: linkAgent,
    linkTextAgent,
    linkText: linkTextAgent,
    navigationAgent,
    navigation: navigationAgent,

    // Legacy
    wcagAgent,
    wcag: wcagAgent,

    // Vision (Reserved for future)
    visionAgent: null,
    vision: null
};

/**
 * Categorized metadata for UI/System use
 */
const categories = {
    detection: ['altTextAgent'],
    analysis: ['altQualityAgent'],
    validation: ['formAccessibilityAgent', 'formErrorAgent'],
    structure: ['headingStructureAgent', 'landmarkAgent'],
    navigation: ['linkAgent', 'linkTextAgent', 'navigationAgent'],
    legacy: ['wcagAgent']
};

module.exports = {
    ...registry,
    _categories: categories,
    _all: Object.keys(registry).filter(k => !k.startsWith('_') && registry[k] !== null)
};
