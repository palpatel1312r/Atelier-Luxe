import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (status >= 500) logger.error(err.stack || err);
  else logger.warn(message);

  res.status(status).json({
    message,
    ...(err.details ? { details: err.details } : {}),
    ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { stack: err.stack } : {}),
  });
}
