const express = require('express');
const router = express.Router();

router.get('/errors', (req, res) => {
  res.json({
    error_types: [
      {
        type: 'https://soroban-explorer.dev/errors/not-found',
        title: 'Not Found',
        status: 404,
        description: 'The requested resource was not found',
      },
      {
        type: 'https://soroban-explorer.dev/errors/validation',
        title: 'Validation Error',
        status: 422,
        description: 'Request validation failed',
      },
      {
        type: 'https://soroban-explorer.dev/errors/rate-limit',
        title: 'Too Many Requests',
        status: 429,
        description: 'Rate limit exceeded',
      },
      {
        type: 'https://soroban-explorer.dev/errors/internal',
        title: 'Internal Server Error',
        status: 500,
        description: 'An unexpected error occurred',
      },
    ],
  });
});

module.exports = router;
