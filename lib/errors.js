module.exports = class BlindPeerMuxerError extends Error {
  constructor(msg, code, fn = BlindPeerMuxerError, { cause } = {}) {
    super(`${code}: ${msg}`, { cause })
    this.code = code

    if (Error.captureStackTrace) Error.captureStackTrace(this, fn)
  }

  get name() {
    return 'BlindPeerMuxerError'
  }

  static UNHANDLED_ERROR(err) {
    return new BlindPeerMuxerError(
      `unhandled error: ${err?.code}`,
      'UNHANDLED_ERROR',
      BlindPeerMuxerError.UNHANDLED_ERROR,
      { cause: err }
    )
  }

  // Keeps the remote code as err.code so callers can branch on it
  static REMOTE_REQUEST_FAILED(code) {
    return new BlindPeerMuxerError(
      'Remote request failed',
      code,
      BlindPeerMuxerError.REMOTE_REQUEST_FAILED
    )
  }
}
