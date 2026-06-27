const crypto = require('crypto');

function generateETag(data) {
  return `"${crypto.createHash('md5').update(JSON.stringify(data)).digest('hex')}"`;
}

module.exports.cacheHeadersMiddleware = (req, res, next) => {
  const originalJson = res.json;

  res.json = function(data) {
    const route = req.route?.path || req.path;
    const etag = generateETag(data);
    res.set('ETag', etag);
    res.set('Vary', 'Accept-Encoding');

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    if (route.includes('/events/:seq')) {
      res.set('Cache-Control', 'public, max-age=86400, immutable');
    } else if (route.includes('/events')) {
      res.set('Cache-Control', 'public, max-age=5, stale-while-revalidate=30');
    } else if (route.includes('/contracts/')) {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    } else if (route.includes('/wallet/')) {
      res.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=60');
    }

    return originalJson.call(this, data);
  };

  next();
};
