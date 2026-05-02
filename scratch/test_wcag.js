const { formatWcag } = require('../utils/formatUtils');

const mockWcag = [
    { criterion: '1.1.1', name: 'Non-text Content', level: 'A' }
];

console.log('Result:', formatWcag(mockWcag));
console.log('Type:', typeof formatWcag(mockWcag));
