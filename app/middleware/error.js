export function errorHandler(err, req, res, next) {
  let status = res.statusCode || 500;

  res.status(status)
    .send({
      status: status,
      message: err.message
    });
}