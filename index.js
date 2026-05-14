const { getEncoding } = require('./spec/hyperschema')
const { BlindPeerRequest: NotificationRequest } = require('blind-push/encodings')
const Protomux = require('protomux')

const Cores = getEncoding('@blind-peer/cores')

module.exports = class BlindPeerChannel {
  constructor(
    stream,
    { oncores = noop, onnotification = noop, onopen = noop, onclose = noop } = {}
  ) {
    this.muxer = Protomux.from(stream)
    this.channel = this.muxer.createChannel({
      protocol: 'blind-peer',
      messages: [
        { encoding: Cores, onmessage: oncores },
        { encoding: NotificationRequest, onmessage: onnotification }
      ],
      onopen,
      onclose
    })
    this.wireCores = this.channel.messages[0]
    this.wireNotification = this.channel.messages[1]
    this.channel.open()
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
