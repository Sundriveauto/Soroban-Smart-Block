const { z } = require('zod');

module.exports.registerContractSchema = z.object({
  contract_id: z.string().regex(/^C[A-Z2-7]{55}$/),
  name: z.string().max(64).optional(),
  abi: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return val.length <= 50000;
      } catch {
        return false;
      }
    },
    'ABI must be valid JSON <= 50kb'
  ),
});
