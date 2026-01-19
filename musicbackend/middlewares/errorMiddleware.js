const errorHandler = (err, req, res, next) => {
  console.error("❌ ERROR:", err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    source: err.source || "backend",
    message: err.message || "Internal Server Error",
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = { errorHandler, notFound };
