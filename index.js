const { getEncoding } = require('./spec/hyperschema')
const Protomux = require('protomux')

const Cores = getEncoding('@blind-peer/cores')

module.exports = class BlindPeerChannel {
  constructor(stream, { oncores = noop, onopen = noop, onclose = noop } = {}) {
    this.muxer = Protomux.from(stream)
    this.channel = this.muxer.createChannel({
      protocol: 'blind-peer',
      messages: [{ encoding: Cores, onmessage: oncores }],
      onopen,
      onclose
    })
    this.wireCores = this.channel.messages[0]
    this.channel.open()
  }

  cork() {
    this.muxer.cork()
  }

  addCores(data) {
    return this.wireCores.send(data)
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
