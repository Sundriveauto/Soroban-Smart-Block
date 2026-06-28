const { ValidationError: ZodValidationError } = require('zod');
const { ValidationError } = require('./errorHandler');

module.exports.validate = (schema, source = 'query') => {
  return (req, res, next) => {
    try {
      const data = source === 'query' ? req.query : req.body;
      const validated = schema.parse(data);

      if (source === 'query') {
        req.query = validated;
      } else {
        req.body = validated;
      }

      next();
    } catch (err) {
      if (err instanceof ZodValidationError) {
        const detail = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        return next(new ValidationError(detail, req.path));
      }
      next(err);
    }
  };
};
