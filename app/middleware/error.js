"use strict";

const ErrorMiddleware = function(logger) {

  const handleError = (err, req, res, next) => {
    const status = (res.statusCode && res.statusCode !== 200) ? res.statusCode : 500;
    logger.error("Middleware Error", `Status code: ${status} ${err}`, req.url);
    res.setHeader("Content-Type", "application/json");
    res.removeHeader("ETag");
    res.removeHeader("Last-Modified");
    res.status(status)
      .send({
        status: status,
        message: err.message
      });
  };

  return {
    handleError: handleError,
  };
};

module.exports = ErrorMiddleware;
