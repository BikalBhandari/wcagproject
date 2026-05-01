const documentationAgent = require('../agents/documentationAgent');

async function sync() {
    console.log('Running Documentation Sync directly...');
    await documentationAgent.run({ url: 'internal' });
    console.log('Sync Complete.');
}

sync().catch(console.error);
