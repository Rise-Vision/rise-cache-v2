"use strict";

const ErrorMiddleware = function(logger) {

  const handleError = (err, req, res, next) => {
    logger.error("Middleware Error", err);
    const status = (res.statusCode && res.statusCode !== 200) ? res.statusCode : 500;
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
