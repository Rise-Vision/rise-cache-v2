module.exports = {
  handleError: function(err, req, res, next) {
    const status = (res.statusCode && res.statusCode !== 200) ? res.statusCode : 500;
    res.setHeader("Content-Type", "application/json");
    res.removeHeader("ETag");
    res.removeHeader("Last-Modified");
    res.status(status)
      .send({
        status: status,
        message: err.message
      });
  }
};