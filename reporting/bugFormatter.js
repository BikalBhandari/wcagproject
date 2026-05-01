// QA-style bug reports formatter
module.exports = {
    formatAsBug(issue) {
        return `
[BUG] ${issue.type} on ${issue.page}
------------------------------------
Location: ${issue.src}
Description: ${issue.message}
Agent: ${issue.agent}
Status: OPEN
        `.trim();
    }
};
