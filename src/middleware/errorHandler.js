export const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    message: isProduction ? err.message || 'Internal Server Error' : err.stack,
  });
};
