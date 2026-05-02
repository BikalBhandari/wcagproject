const { attachWcag } = require('../utils/issueUtils');

/**
 * Calculates relative luminance of an RGB color
 * Formula: 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
function getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Calculates contrast ratio between two colors
 * Formula: (L1 + 0.05) / (L2 + 0.05)
 */
function getContrastRatio(color1, color2) {
    const l1 = getLuminance(color1.r, color1.g, color1.b);
    const l2 = getLuminance(color2.r, color2.g, color2.b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/**
 * Parses color strings (hex, rgb, rgba, basic names)
 */
function parseColor(color) {
    if (!color) return null;
    color = color.trim().toLowerCase();

    // Hex #RGB or #RRGGBB
    if (color.startsWith('#')) {
        let hex = color.substring(1);
        if (hex.length === 3) {
            hex = hex.split('').map(s => s + s).join('');
        }
        if (hex.length === 6) {
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16)
            };
        }
    }

    // rgb(r, g, b) or rgba(r, g, b, a)
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgbMatch) {
        return {
            r: parseInt(rgbMatch[1], 10),
            g: parseInt(rgbMatch[2], 10),
            b: parseInt(rgbMatch[3], 10)
        };
    }

    // Basic Named Colors
    const named = {
        white: { r: 255, g: 255, b: 255 },
        black: { r: 0, g: 0, b: 0 },
        red: { r: 255, g: 0, b: 0 },
        green: { r: 0, g: 255, b: 0 },
        blue: { r: 0, g: 0, b: 255 },
        yellow: { r: 255, g: 255, b: 0 },
        cyan: { r: 0, g: 255, b: 255 },
        magenta: { r: 255, g: 0, b: 255 },
        gray: { r: 128, g: 128, b: 128 },
        grey: { r: 128, g: 128, b: 128 }
    };
    if (named[color]) return named[color];

    return null;
}

/**
 * Extracts a specific property from an inline style string
 */
function getStyleProperty(style, property) {
    if (!style) return null;
    const regex = new RegExp(`${property}\\s*:\\s*([^;]+)`, 'i');
    const match = style.match(regex);
    return match ? match[1].trim() : null;
}

/**
 * Find inherited style property by traversing upwards
 */
function findInheritedStyle($, el, property) {
    let current = $(el);
    while (current.length) {
        const style = current.attr('style');
        const val = getStyleProperty(style, property);
        if (val) return val;
        current = current.parent();
    }
    return null;
}

async function run(context) {
    if (context.error) return [];

    const { $, url } = context;
    const issues = [];

    // Target elements per requirements
    const selectors = 'p, span, a, button, li, h1, h2, h3, h4, h5, h6, label';

    $(selectors).each((i, el) => {
        // Skip elements with no text content
        const text = $(el).text().trim();
        if (!text) return;

        const inlineStyle = $(el).attr('style') || '';
        
        // 1. Extract Colors
        let textColorStr = getStyleProperty(inlineStyle, 'color') || findInheritedStyle($, el, 'color');
        let bgColorStr = getStyleProperty(inlineStyle, 'background-color') || findInheritedStyle($, el, 'background-color');

        // Fallbacks and Confidence
        let confidence = 'medium';
        let styleIncomplete = false;

        if (!textColorStr) {
            textColorStr = 'black'; // Browser default heuristic
            styleIncomplete = true;
        }
        if (!bgColorStr) {
            bgColorStr = 'white'; // Browser default heuristic
            styleIncomplete = true;
        }

        if (styleIncomplete) {
            confidence = 'low';
        }

        const textColor = parseColor(textColorStr);
        const bgColor = parseColor(bgColorStr);

        // If we can't parse even the defaults or inherited, skip
        if (!textColor || !bgColor) return;

        // 2. Check for "Large Text"
        let isLargeText = false;
        const fontSizeStr = getStyleProperty(inlineStyle, 'font-size') || findInheritedStyle($, el, 'font-size');
        const fontWeightStr = getStyleProperty(inlineStyle, 'font-weight') || findInheritedStyle($, el, 'font-weight');

        if (fontSizeStr) {
            const sizeMatch = fontSizeStr.match(/(\d+)px/);
            if (sizeMatch) {
                const size = parseInt(sizeMatch[1], 10);
                const isBold = fontWeightStr && (fontWeightStr.includes('bold') || parseInt(fontWeightStr, 10) >= 700);
                
                if (size >= 18 || (size >= 14 && isBold)) {
                    isLargeText = true;
                }
            }
        }

        // 3. Compute Ratio
        const ratio = getContrastRatio(textColor, bgColor).toFixed(2);
        const threshold = isLargeText ? 3 : 4.5;

        // 4. Validate
        if (ratio < threshold) {
            issues.push(attachWcag({
                type: 'Visual',
                subType: 'Color Contrast',
                page: url,
                element: $.html(el).substring(0, 150),
                message: `Text contrast ratio (${ratio}:1) is below WCAG minimum.`,
                severity: 'high',
                recommendation: `Increase contrast between text and background to meet WCAG 2.1 AA (${threshold}:1).`,
                confidence: confidence,
                requiresReview: true
            }, 'COLOR_CONTRAST'));
        }
    });

    return issues;
}

module.exports = {
    name: 'contrast',
    title: 'Color Contrast',
    description: 'Detects insufficient contrast between text and background colors.',
    run
};
