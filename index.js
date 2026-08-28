const { getEncoding } = require('./spec/hyperschema')
const { BlindPeerRequest: NotificationRequest } = require('blind-push/encodings')
const Protomux = require('protomux')

const Cores = getEncoding('@blind-peer/cores')
const Handshake = getEncoding('@blind-peer/handshake')
// The wrapper makes it work seamlessly if the other side does not have a handshake
// We default the value to a real decode, which will create a default object based on hyperschema config.
// This way there is no need to handle special null states by blind-peer-muxer users.
const HandshakeWrapped = {
  preencode: Handshake.preencode,
  encode: Handshake.encode,
  decode(state) {
    if (state.start >= state.end)
      return Handshake.decode({ buffer: Buffer.alloc(1), start: 0, end: 1 })
    return Handshake.decode(state)
  }
}

module.exports = class BlindPeerChannel {
  constructor(
    stream,
    { handshake = {}, oncores = noop, onnotification = noop, onopen = noop, onclose = noop } = {}
  ) {
    this.muxer = Protomux.from(stream)
    this.channel = this.muxer.createChannel({
      protocol: 'blind-peer',
      handshake: HandshakeWrapped,
      messages: [
        { encoding: Cores, onmessage: oncores },
        { encoding: NotificationRequest, onmessage: onnotification }
      ],
      onopen,
      onclose
    })
    this.wireCores = this.channel.messages[0]
    this.wireNotification = this.channel.messages[1]
    this.channel.open(handshake)
  }

  get stream() {
    return this.muxer.stream
  }

  cork() {
    this.muxer.cork()
  }

  addCores(data) {
    return this.wireCores.send(data)
  }

  sendNotification(data) {
    return this.wireNotification.send(data)
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

function noop() {}
