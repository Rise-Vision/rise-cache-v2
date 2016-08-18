module.exports = {
  handleError: function(err, req, res, next) {
    const status = res.statusCode || 500;

    res.status(status)
      .send({
        status: status,
        message: err.message
      });
  }
};