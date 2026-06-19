function notFound(req, res) {
  res.status(404).json({ error: { message: `Route ${req.method} ${req.path} was not found.` } });
}

function errorHandler(error, _req, res, _next) {
  const status = error.status || (error.name === "ZodError" ? 400 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: {
      message: status >= 500 ? "Something went wrong on the server." : error.message,
      details: error.details || error.issues,
    },
  });
}

module.exports = { notFound, errorHandler };
