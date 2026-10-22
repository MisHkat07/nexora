/**
 * An error whose message is safe to show to the API client.
 * Throw it from controllers; `catchErrors` turns it into a JSON response.
 */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

module.exports = HttpError;
