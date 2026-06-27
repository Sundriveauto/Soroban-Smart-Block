const { z } = require('zod');

module.exports.eventsQuerySchema = z.object({
  contract: z.string().regex(/^C[A-Z2-7]{55}$/).optional(),
  fn: z.string().regex(/^[a-zA-Z0-9_]+$/).max(64).optional(),
  after_seq: z.coerce.number().int().positive().optional(),
  before_seq: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  page: z.coerce.number().int().positive().default(1),
});
