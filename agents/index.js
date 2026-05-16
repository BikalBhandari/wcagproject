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
const ariaAgent = require('./ariaAgent');

// --- Outline Agents ---
const headingStructureAgent = require('./headingStructureAgent');
const landmarkAgent = require('./landmarkAgent');

// --- Navigation Agents ---
const linkAgent = require('./linkAgent');
const linkTextAgent = require('./linkTextAgent');
const navigationAgent = require('./navigationAgent');
const keyboardAgent = require('./keyboardAgent');
const focusAgent = require('./focusAgent');
const targetSizeAgent = require('./targetSizeAgent');

// --- Visual Agents ---
const contrastAgent = require('./contrastAgent');

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
    ariaAgent,
    aria: ariaAgent,

    // Outline
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
    keyboardAgent,
    keyboard: keyboardAgent,
    focusAgent,
    focus: focusAgent,
    targetSizeAgent,
    targetSize: targetSizeAgent,

    // Visual
    contrastAgent,
    contrast: contrastAgent,

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
    analysis: ['altQualityAgent', 'contrastAgent'],
    validation: ['formAccessibilityAgent', 'formErrorAgent', 'ariaAgent'],
    outline: ['headingStructureAgent', 'landmarkAgent'],
    interaction: ['keyboardAgent', 'focusAgent', 'targetSizeAgent'],
    navigation: ['linkAgent', 'linkTextAgent', 'navigationAgent'],
    legacy: ['wcagAgent']
};

module.exports = {
    ...registry,
    _categories: categories,
    _all: Object.keys(registry).filter(k => !k.startsWith('_') && registry[k] !== null)
};
