import AppError from '../utils/AppError.js';

export function notFound(req, res, next) {
  next(new AppError(`Route nahi mila: ${req.originalUrl}`, 404));
}

export function errorHandler(error, req, res, next) {
  let err = error;
  if (err.name === 'ZodError') {
    err.statusCode = 400;
    err.message = err.issues.map((issue) => issue.message).join(', ');
  } else if (err.name === 'MulterError') {
    // image upload ke errors (bari file, zyada files, galat field ka naam)
    const messages = {
      LIMIT_FILE_SIZE: 'Image 5MB se choti honi chahiye',
      LIMIT_FILE_COUNT: 'Ek baar mein 8 se zyada images nahi bhej sakte',
      LIMIT_UNEXPECTED_FILE: 'Form-data mein field ka naam "images" hona chahiye',
    };
    err = new AppError(messages[err.code] || 'Image upload mein masla aa gaya', 400);
  } else if (err.name === 'CastError') {
    err = new AppError('Invalid ID', 400);
  } else if (err.code === 11000) {
    err = new AppError('Yeh value pehle se mojood hai', 409);
  } else if (err.name === 'ValidationError') {
    err.statusCode = 400;
    err.message = Object.values(err.errors).map((item) => item.message).join(', ');
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    err = new AppError('Invalid ya expired token', 401);
  } else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    err = new AppError('Invalid JSON body', 400);
  }
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) console.error(error);
  res.status(statusCode).json({
    status: err.status || (statusCode >= 500 ? 'error' : 'fail'),
    message: statusCode >= 500 ? 'Server error' : err.message,
  });
}