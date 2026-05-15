const path = require('path');

const inputs = [
    'asuo_core.json',
    '',
    null,
    undefined,
    'http://example.com',
    'unknown'
];

inputs.forEach(input => {
    try {
        console.log(`Input: "${input}" -> Basename: "${path.basename(input || '', '.json')}"`);
    } catch (e) {
        console.log(`Input: "${input}" -> Error: ${e.message}`);
    }
});
