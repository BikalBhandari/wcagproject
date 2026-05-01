// (temporary) Legacy WCAG agent - to be split into contrastAgent, ariaAgent, etc.
module.exports = {
    name: 'wcagAgent',
    title: 'WCAG Compliance (Legacy)',
    description: 'General WCAG checks (Temporary). This agent is being phased out in favor of specialized agents.',
    async run(context) {
        return [];
    }
};
