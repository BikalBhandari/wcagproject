const axios = require('axios');
const { attachWcag } = require('../utils/issueUtils');

/**
 * Link Integrity Agent
 * Validates broken internal and external links.
 */

function generateLinkRecommendation(status, code) {
    switch (status) {
        case 'EMPTY':
            return 'Add a valid destination URL to the href attribute.';
        case 'JS_VOID':
            return 'Use a real URL or a button element if the action is purely functional.';
        case 'BROKEN':
            return `Update the link to a valid, working URL. (Status: ${code || 'Unknown'})`;
        default:
            return 'Ensure the link is valid and accessible.';
    }
}

async function checkLink(url) {
    if (!url || url === '' || url === '#') return { status: 'EMPTY' };
    if (url.startsWith('javascript:')) return { status: 'JS_VOID' };
    if (url.startsWith('mailto:') || url.startsWith('tel:')) return { status: 'VALID' };

    try {
        const response = await axios.head(url, { timeout: 5000, validateStatus: false });
        if (response.status >= 400) return { status: 'BROKEN', code: response.status };
        return { status: 'VALID' };
    } catch (error) {
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

        const result = await checkLink(absoluteUrl);

        if (result.status !== 'VALID') {
            let message = '';
            let severity = 'medium';

            if (result.status === 'EMPTY') {
                message = 'Link has an empty or missing href attribute.';
                severity = 'high';
            } else if (result.status === 'JS_VOID') {
                message = 'Link uses "javascript:void(0)" or similar logic.';
                severity = 'medium';
            } else if (result.status === 'BROKEN') {
                message = `Link is broken. ${result.code ? `Returned status: ${result.code}` : `Error: ${result.message}`}`;
                severity = 'high';
            }

            issues.push(attachWcag({
                type: 'Navigation',
                subType: result.status.replace('_', ' ').toUpperCase(),
                page: pageUrl,
                element: link.html.substring(0, 100),
                message: message,
                severity: severity,
                recommendation: generateLinkRecommendation(result.status, result.code),
                confidence: 'high',
                requiresReview: result.status === 'BROKEN'
            }, 'ACCESSIBLE_NAME'));
        }
    }

    return issues;
}

module.exports = {
    name: 'link',
    title: 'Link Integrity',
    description: 'Validates broken internal and external links, ensuring a seamless and accessible navigation experience.',
    run
};

