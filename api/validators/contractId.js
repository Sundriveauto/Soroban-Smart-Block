const { z } = require('zod');

module.exports.contractIdSchema = z.string().regex(/^C[A-Z2-7]{55}$/, 'Invalid contract ID');
