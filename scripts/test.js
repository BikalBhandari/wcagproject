const assert = require('assert');

function load(modulePath) {
    return require(modulePath);
}

function testAgentConfig() {
    const { readAgentConfig } = load('../utils/agentConfig');
    const config = readAgentConfig();

    assert.ok(config, 'agent config should load');
    assert.ok(Array.isArray(config.agents), 'agents should be an array');
    assert.ok(config.agents.length > 0, 'agents array should not be empty');
}

function testSettingsStore() {
    const { getMergedSettings, readSettings } = load('../utils/settingsStore');
    const raw = readSettings();
    const merged = getMergedSettings();

    assert.ok(raw && typeof raw === 'object', 'settings should load as an object');
    assert.strictEqual(typeof merged.concurrency, 'number', 'merged settings should include concurrency');
    assert.strictEqual(typeof merged.timeout, 'number', 'merged settings should include timeout');
}

function testConfigLoader() {
    const { getConfig } = load('../utils/config');
    const config = getConfig();

    assert.strictEqual(typeof config.concurrency, 'number', 'runtime config should expose concurrency as a number');
    assert.strictEqual(typeof config.timeout, 'number', 'runtime config should expose timeout as a number');
}

function testPostProcessor() {
    const { processIssues } = load('../utils/postProcessor');

    const issues = [
        {
            element: '<img src="https://example.com/image1.jpg">',
            subType: 'Missing Alt Attribute',
            severity: 'high',
            type: 'presence'
        },
        {
            element: '<img src="https://example.com/image1.jpg">',
            subType: 'GENERIC',
            severity: 'medium',
            type: 'quality'
        },
        {
            element: '<img data-src="https://example.com/lazy1.jpg">',
            subType: 'Empty Alt Attribute',
            severity: 'high',
            type: 'presence'
        }
    ];

    const qaResults = processIssues(issues, 'qa');
    const cleanResults = processIssues(issues, 'clean');

    assert.strictEqual(qaResults.length, 3, 'qa mode should preserve distinct issues');
    assert.strictEqual(cleanResults.length, 2, 'clean mode should merge duplicate element issues');
}

function testRequestValidation() {
    const {
        validateScopeName,
        validateUrlList,
        validateSitemapUrl,
        validateAgentConfigPayload,
        validateAuditRequest,
        validateSettingsPayload
    } = load('../utils/requestValidation');

    assert.ok(validateScopeName('My Scope').valid, 'scope names should accept normal values');
    assert.ok(!validateScopeName('..').valid, 'scope names should reject invalid values');
    assert.ok(validateUrlList(['https://example.com']).valid, 'URL lists should accept valid URLs');
    assert.ok(!validateUrlList(['ftp://example.com']).valid, 'URL lists should reject non-http URLs');
    assert.ok(validateSitemapUrl('https://example.com/sitemap.xml').valid, 'sitemap URLs should accept valid URLs');
    assert.ok(validateAgentConfigPayload({ scanDepth: 5, ignoreDecorative: true }).valid, 'agent config payload should accept basic values');
    assert.ok(validateAuditRequest({ file: 'scope.json', agents: ['altTextAgent'] }, { allowedAgents: ['altTextAgent'] }).valid, 'audit requests should validate known agents');
    assert.ok(validateSettingsPayload({ codaToken: '', codaDocId: 'abc', concurrency: 5, timeout: 30000 }).valid, 'settings payload should allow clearing token');
}

function testAuthHelper() {
    const { parseCookies } = load('../utils/auth');
    const cookies = parseCookies('aa_session=abc123; foo=bar');

    assert.strictEqual(cookies.aa_session, 'abc123', 'auth cookie parser should read the session cookie');
    assert.strictEqual(cookies.foo, 'bar', 'auth cookie parser should read other cookies');
}

function testFormatUtils() {
    const { escapeHtml } = load('../utils/formatUtils');
    const { sanitizePublicSettings } = load('../utils/settingsStore');

    assert.strictEqual(escapeHtml('<img src="x">'), '&lt;img src=&quot;x&quot;&gt;', 'HTML escaping should neutralize markup');
    assert.deepStrictEqual(
        sanitizePublicSettings({ codaToken: 'secret', codaDocId: 'doc', concurrency: 5 }),
        { codaDocId: 'doc', concurrency: 5 },
        'public settings sanitization should strip secrets'
    );
}

function testModuleLoads() {
    load('../runScan');
    load('../reporting/csvWriter');
    load('../reporting/pdfWriter');
    load('../reporting/codaClient');
    load('../server/routes/agents');
    load('../server/routes/reports');
    load('../server/routes/scopes');
    load('../server/routes/settings');
}

function main() {
    const tests = [
        testAgentConfig,
        testSettingsStore,
        testConfigLoader,
        testPostProcessor,
        testRequestValidation,
        testAuthHelper,
        testFormatUtils,
        testModuleLoads
    ];

    for (const test of tests) {
        test();
    }

    console.log(`✅ ${tests.length} smoke tests passed`);
}

try {
    main();
} catch (err) {
    console.error('❌ Smoke tests failed');
    console.error(err.stack || err.message || err);
    process.exit(1);
}
