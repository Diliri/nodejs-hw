import { HttpError } from 'http-errors';

export const errorHandler = (err, req, res, next) => {
  // 1. Помилки, створені свідомо через createHttpError (наприклад, 404, 400, 403)
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      message: err.message,
    });
  }

  // 2. Невалідний ObjectId у Mongoose (наприклад, передали "123" замість 24-значного ID)
  if (err.name === 'CastError') {
    return res.status(404).json({
      message: 'Note not found',
    });
  }

  // 3. Непередбачені критичні помилки сервера (500)
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(500).json({
    message: isProduction ? err.message || 'Internal Server Error' : err.stack,
  });
};
