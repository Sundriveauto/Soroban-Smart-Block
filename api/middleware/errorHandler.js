class AppError extends Error {
  constructor(type, title, status, detail, instance) {
    super(detail);
    this.type = type;
    this.title = title;
    this.status = status;
    this.detail = detail;
    this.instance = instance;
  }
}

class NotFoundError extends AppError {
  constructor(detail, instance) {
    super(
      'https://soroban-explorer.dev/errors/not-found',
      'Not Found',
      404,
      detail,
      instance
    );
  }
}

class ValidationError extends AppError {
  constructor(detail, instance) {
    super(
      'https://soroban-explorer.dev/errors/validation',
      'Validation Error',
      422,
      detail,
      instance
    );
  }
}

class RateLimitError extends AppError {
  constructor(detail, instance) {
    super(
      'https://soroban-explorer.dev/errors/rate-limit',
      'Too Many Requests',
      429,
      detail,
      instance
    );
  }
}

class InternalError extends AppError {
  constructor(detail, instance) {
    super(
      'https://soroban-explorer.dev/errors/internal',
      'Internal Server Error',
      500,
      detail,
      instance
    );
  }
}

module.exports.errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      type: err.type,
      title: err.title,
      status: err.status,
      detail: err.detail,
      instance: err.instance || req.originalUrl,
      request_id: req.id,
    });
  }

  const detail = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  return res.status(500).json({
    type: 'https://soroban-explorer.dev/errors/internal',
    title: 'Internal Server Error',
    status: 500,
    detail,
    instance: req.originalUrl,
    request_id: req.id,
  });
};

module.exports.AppError = AppError;
module.exports.NotFoundError = NotFoundError;
module.exports.ValidationError = ValidationError;
module.exports.RateLimitError = RateLimitError;
module.exports.InternalError = InternalError;
