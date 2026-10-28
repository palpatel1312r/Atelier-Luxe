export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
    this.isOperational = true;
  }
}

export function assert(condition, status, message) {
  if (!condition) throw new ApiError(status, message);
}
