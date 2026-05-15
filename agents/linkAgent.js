const axios = require('axios');
const { attachWcag } = require('../utils/issueUtils');

/**
 * Link Integrity Agent
 * Validates broken internal and external links.
 */

const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

const ACCESS_RESTRICTED_STATUSES = new Set([401, 403, 407, 423, 429, 451]);
const CONTROL_HINT_ATTRS = ['role', 'data-toggle', 'data-bs-toggle', 'aria-controls', 'aria-expanded', 'onclick'];
const CONTROL_HINT_CLASSES = ['dropdown-toggle', 'toggle'];

function generateLinkRecommendation(status, code) {
    switch (status) {
        case 'EMPTY':
            return 'Add a valid destination URL to the href attribute.';
        case 'CONTROL':
            return 'Use a <button> for purely functional controls, or provide a real destination URL.';
        case 'JS_VOID':
            return 'Use a real URL or a button element if the action is purely functional.';
        case 'BLOCKED':
            return code
                ? `The destination responded with ${code} to the crawler. Verify the link manually in a browser.`
                : 'The destination could not be verified by the crawler. Verify the link manually in a browser.';
        case 'BROKEN':
            return `Update the link to a valid, working URL. (Status: ${code || 'Unknown'})`;
        default:
            return 'Ensure the link is valid and accessible.';
    }
}

function getSubTypeLabel(status) {
    switch (status) {
        case 'CONTROL':
            return 'INTENTIONAL CONTROL';
        case 'BLOCKED':
            return 'ACCESS RESTRICTED';
        case 'JS_VOID':
            return 'JS VOID';
        default:
            return status.replace('_', ' ').toUpperCase();
    }
}

function isIntentionalControlLink($el) {
    if (!$el || !$el.length) return false;

    const role = ($el.attr('role') || '').toLowerCase();
    if (role === 'button') return true;

    for (const attr of CONTROL_HINT_ATTRS) {
        if ($el.attr(attr) !== undefined) return true;
    }

    const className = ($el.attr('class') || '').toLowerCase();
    return CONTROL_HINT_CLASSES.some(token => className.includes(token));
}

async function probeUrl(url) {
    const requestConfig = {
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: false,
        headers: DEFAULT_HEADERS
    };

    const headResponse = await axios.head(url, requestConfig);
    if (headResponse.status < 400) {
        return { status: 'VALID', code: headResponse.status, checkedWith: 'HEAD' };
    }

    if (ACCESS_RESTRICTED_STATUSES.has(headResponse.status) || headResponse.status === 405) {
        const getResponse = await axios.get(url, requestConfig);
        if (getResponse.status < 400) {
            return {
                status: 'VALID',
                code: getResponse.status,
                checkedWith: 'GET',
                headCode: headResponse.status
            };
        }

        if (ACCESS_RESTRICTED_STATUSES.has(getResponse.status)) {
            return {
                status: 'BLOCKED',
                code: getResponse.status,
                checkedWith: 'GET',
                headCode: headResponse.status
            };
        }

        if (getResponse.status >= 400) {
            return {
                status: 'BROKEN',
                code: getResponse.status,
                checkedWith: 'GET',
                headCode: headResponse.status
            };
        }
    }

    if (headResponse.status >= 400) {
        if (ACCESS_RESTRICTED_STATUSES.has(headResponse.status)) {
            return { status: 'BLOCKED', code: headResponse.status, checkedWith: 'HEAD' };
        }

        return { status: 'BROKEN', code: headResponse.status, checkedWith: 'HEAD' };
    }

    return { status: 'VALID', code: headResponse.status, checkedWith: 'HEAD' };
}

async function checkLink(url, $el) {
    if (!url || url === '' || url === '#') {
        if (isIntentionalControlLink($el)) {
            return { status: 'CONTROL' };
        }

        return { status: 'EMPTY' };
    }

    if (url.startsWith('javascript:')) {
        return isIntentionalControlLink($el) ? { status: 'CONTROL' } : { status: 'JS_VOID' };
    }

    if (url.startsWith('mailto:') || url.startsWith('tel:')) return { status: 'VALID' };

    try {
        return await probeUrl(url);
    } catch (error) {
        if (error.response && ACCESS_RESTRICTED_STATUSES.has(error.response.status)) {
            return { status: 'BLOCKED', code: error.response.status, message: error.message };
        }

        return { status: 'BROKEN', message: error.message };
    }
}

async function run(context) {
    if (context.error) return [];

    const { $, url: pageUrl } = context;
    const issues = [];
    const links = [];

    $('a').each((i, el) => {
        links.push({
            el,
            href: $(el).attr('href'),
            text: $(el).text().trim() || 'No link text',
            html: $.html(el)
        });
    });

    for (const link of links) {
        let absoluteUrl = link.href;
        try {
            if (link.href && !link.href.startsWith('http') && !link.href.startsWith('mailto') && !link.href.startsWith('tel') && !link.href.startsWith('javascript')) {
                absoluteUrl = new URL(link.href, pageUrl).href;
            }
        } catch (e) {
            // Ignore invalid URLs
        }

        const result = await checkLink(absoluteUrl, $(link.el));

        if (result.status !== 'VALID') {
            let message = '';
            let severity = 'medium';
            let requiresReview = result.status === 'BROKEN' || result.status === 'BLOCKED' || result.status === 'CONTROL';
            let wcagKey = 'LINK_PURPOSE';

            if (result.status === 'EMPTY') {
                message = 'Link has an empty or missing href attribute.';
                severity = 'high';
            } else if (result.status === 'CONTROL') {
                message = 'Anchor behaves like a control and does not point to a real destination.';
                severity = 'low';
            } else if (result.status === 'JS_VOID') {
                message = 'Link uses "javascript:void(0)" or similar logic.';
                severity = 'medium';
            } else if (result.status === 'BLOCKED') {
                message = result.code
                    ? `Destination could not be verified because the crawler received ${result.code}.`
                    : 'Destination could not be verified by the crawler.';
                severity = 'medium';
            } else if (result.status === 'BROKEN') {
                message = `Link is broken. ${result.code ? `Returned status: ${result.code}` : `Error: ${result.message}`}`;
                severity = 'high';
            }

            issues.push(attachWcag({
                type: 'Navigation',
                subType: getSubTypeLabel(result.status),
                page: pageUrl,
                element: link.html.substring(0, 100),
                message: message,
                severity: severity,
                recommendation: generateLinkRecommendation(result.status, result.code),
                confidence: 'high',
                requiresReview,
            }, wcagKey));
        }
    }

    return issues;
}

module.exports = {
    name: 'link',
    title: 'Link Integrity',
    description: 'Checks links for missing hrefs, javascript:void patterns, intentionally functional anchors, and broken destinations using HEAD with GET fallback where needed.',
    run
};
