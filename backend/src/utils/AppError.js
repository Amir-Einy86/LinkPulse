class AppError extends Error {
  constructor(message, status = 500, code = 'ERROR', details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}
module.exports = AppError;
