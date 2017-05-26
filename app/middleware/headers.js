"use strict";

const HeadersMiddleware = function() {

  const setHeaders = (req, res, next) => {
    let origin = req.headers.origin;
    if ( !origin ) {
      origin = "*";
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", true);
    res.setHeader("Cache-Control", "no-cache");
    next();
  };

  return {
    setHeaders: setHeaders,
  };
};

module.exports = HeadersMiddleware;
