const { getEncoding } = require('./spec/hyperschema')
const { BlindPeerRequest: NotificationRequest } = require('blind-push/encodings')
const Protomux = require('protomux')
const ProtomuxRequest = require('protomux-request')
const c = require('compact-encoding')

const Cores = getEncoding('@blind-peer/cores')
const AddCoresResponse = getEncoding('@blind-peer/add-cores-response')
const NotificationResponse = c.none
const RemoteError = getEncoding('@blind-peer/error')
const Handshake = getEncoding('@blind-peer/handshake')
// The wrapper makes it work seamlessly if the other side does not have a handshake
// We default the value to a real decode, which will create a default object based on hyperschema config.
// This way there is no need to handle special null states by blind-peer-muxer users.
const HandshakeWrapped = {
  preencode: Handshake.preencode,
  encode: Handshake.encode,
  decode(state) {
    return state.start >= state.end
      ? Handshake.decode({ buffer: Buffer.alloc(1), start: 0, end: 1 })
      : Handshake.decode(state)
  }
}

module.exports = class BlindPeerChannel {
  constructor(stream, { handshake = {}, oncores, onnotification, onopen, onclose } = {}) {
    this.muxer = Protomux.from(stream)
    this.channel = this.muxer.createChannel({
      protocol: 'blind-peer',
      handshake: HandshakeWrapped,
      messages: [
        {
          encoding: Cores,
          onmessage: (req) =>
            // temporary hack to ensure blind-peer closes the connection on unknown errors only
            oncores?.(req).catch((error) => c.encode(ErrorEncoding, error))
        },
        {
          encoding: NotificationRequest,
          onmessage: (req) =>
            //temporary hack to ensure blind-peer closes the connection on unknown errors only
            onnotification?.(req).catch((error) => c.encode(ErrorEncoding, error))
        }
      ],
      onopen: onopen ?? noop,
      onclose: onclose ?? noop,
      ondestroy: () => this.requests.destroy()
    })
    this.wireCores = this.channel.messages[0]
    this.wireNotification = this.channel.messages[1]

    // Added after the fire-and-forget messages, so peers without them keep working
    this.requests = new ProtomuxRequest(this.channel)
    this.requests.addError(ErrorEncoding)
    this.addCoresRequest = this.requests.addRequest({
      name: 'add-cores',
      requestEncoding: Cores,
      responseEncoding: AddCoresResponse,
      onrequest: oncores
    })
    this.sendNotificationRequest = this.requests.addRequest({
      name: 'send-notification',
      requestEncoding: NotificationRequest,
      responseEncoding: NotificationResponse,
      onrequest: onnotification
    })

    this.channel.open(handshake)
  }

  get stream() {
    return this.muxer.stream
  }

  cork() {
    this.muxer.cork()
  }

  /** @deprecated Fire-and-forget, use `requestAddCores()` to get a response */
  addCores(data) {
    return this.wireCores.send(data)
  }

  /** @deprecated Fire-and-forget, use `requestSendNotification()` to get a response */
  sendNotification(data) {
    return this.wireNotification.send(data)
  }

  requestAddCores(data, opts) {
    return this.addCoresRequest.client.request(data, opts)
  }

  requestSendNotification(data, opts) {
    return this.sendNotificationRequest.client.request(data, opts)
  }

  uncork() {
    this.muxer.uncork()
  }

  close() {
    return this.channel.close()
  }

  static pair(stream, notify) {
    const muxer = Protomux.from(stream)
    muxer.pair({ protocol: 'blind-peer' }, notify)
  }
}

// Thrown values are sent as { code: uint }, decoded back to an Error with the string code
const ErrorEncoding = {
  preencode(state, err) {
    return RemoteError.preencode(state, { code: encodeErrorCode(err) })
  },
  encode(state, err) {
    return RemoteError.encode(state, { code: encodeErrorCode(err) })
  },
  decode(state) {
    const code = decodeErrorCode(RemoteError.decode(state).code)
    const err = new Error(`${code}: Remote request failed`)
    err.code = code
    return err
  }
}

// Wire codes for errors sent to the remote. 0 is reserved, never sent.
// Append only, never renumber.
function encodeErrorCode(err) {
  switch (err?.code) {
    case 'REQUEST_NOT_HANDLED':
      return 2
    case 'DECODE_ERROR':
      return 3
    case 'RATE_LIMITED':
      return 4
    case 'UNKNOWN_CORE':
      return 5
    case 'REQUEST_TIMEOUT':
      return 6
    case 'TOO_MANY_RETRIES':
      return 7
    default:
      // throw so protomux-request can close the channel on unknown errors
      throw new Error('unknown error')
  }
}

function decodeErrorCode(code) {
  switch (code) {
    case 2:
      return 'REQUEST_NOT_HANDLED'
    case 3:
      return 'DECODE_ERROR'
    case 4:
      return 'RATE_LIMITED'
    case 5:
      return 'UNKNOWN_CORE'
    case 6:
      return 'REQUEST_TIMEOUT'
    case 7:
      return 'TOO_MANY_RETRIES'
    default:
      return 'UNKNOWN_ERROR'
  }
}

function noop() {}
