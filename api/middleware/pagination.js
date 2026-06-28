module.exports.cursorPagination = (req, res, next) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 200);
  const afterSeq = parseInt(req.query.after_seq) || 0;
  const beforeSeq = parseInt(req.query.before_seq) || Number.MAX_SAFE_INTEGER;
  const page = parseInt(req.query.page) || 1;

  req.pagination = {
    limit,
    afterSeq: page > 1 ? (page - 1) * limit : afterSeq,
    beforeSeq,
  };

  res.json = (function(original) {
    return function(data) {
      if (Array.isArray(data)) {
        const response = {
          data,
          pagination: {
            next_cursor: data.length > 0 ? data[data.length - 1].seq : null,
            prev_cursor: data.length > 0 ? data[0].seq : null,
            has_more: data.length === limit,
            total_count: data.length,
          },
        };
        return original.call(this, response);
      }
      return original.call(this, data);
    };
  })(res.json);

  next();
};
