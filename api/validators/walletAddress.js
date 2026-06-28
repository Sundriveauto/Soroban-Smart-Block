const { z } = require('zod');

module.exports.walletAddressSchema = z.string().regex(/^G[A-Z2-7]{55}$/, 'Invalid Stellar address');
