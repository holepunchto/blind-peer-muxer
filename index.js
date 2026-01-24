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
  }

  cork() {
    this.muxer.cork()
  }

  addCores(data) {
    this.wireCores.send(data)
  }

  uncork() {
    this.muxer.uncork()
  }

  static pair(stream, notify) {
    const muxer = Protomux.from(stream)
    muxer.pair({ protocol: 'blind-peer' }, notify)
  }
}

function noop() {}
