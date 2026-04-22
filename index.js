const { getEncoding } = require('./spec/hyperschema')
const Protomux = require('protomux')

const Legacy = getEncoding('@blind-peer/cores')
const Cores = getEncoding('@blind-peer-v2/cores')

module.exports = class BlindPeerChannel {
  constructor(stream, { oncores = noop, onopen = noop, onclose = noop } = {}) {
    this.muxer = Protomux.from(stream)

    this.channel = this.muxer.createChannel({
      protocol: 'blind-peer',
      messages: [
        { encoding: Legacy, onmessage: mapLegacy(oncores) },
        { encoding: Cores, onmessage: oncores }
      ],
      onopen,
      onclose
    })

    this.wireCores = this.channel.messages[1]

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

function mapLegacy(fn) {
  return function (r) {
    const mapped = {
      version: 0,
      wakeup: true,
      referrer: r.referrer,
      priority: r.priority,
      announce: r.announce,
      cores: r.cores
    }

    return fn(mapped)
  }
}

function noop() {}
