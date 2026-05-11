const test = require('brittle')
const b4a = require('b4a')
const SecretStream = require('@hyperswarm/secret-stream')

const BlindPeerMuxer = require('../')

test('addCores is received by peer', function (t) {
  t.plan(1)

  const cores = {
    referrer: b4a.alloc(32, 1),
    priority: 3,
    announce: true,
    cores: [
      { key: b4a.alloc(32, 2), length: 42 },
      { key: b4a.alloc(32, 3), length: 43 }
    ]
  }

  const [sender] = setupMuxerPair({
    oncores(data) {
      t.alike(data, cores)
    }
  })

  sender.addCores(cores)
})

test('sendNotification is received by peer', function (t) {
  t.plan(1)

  const notification = {
    block: {
      key: b4a.alloc(32, 4),
      index: 7
    },
    destination: {
      key: b4a.alloc(32, 5),
      discoveryKey: b4a.from('destination-discovery-key')
    }
  }

  const [sender] = setupMuxerPair({
    onnotification(data) {
      t.alike(data, notification)
    }
  })

  sender.sendNotification(notification)
})

function setupMuxerPair({ oncores, onnotification }) {
  const senderStream = new SecretStream(true)
  const receiverStream = new SecretStream(false)

  replicate(senderStream, receiverStream)

  const sender = new BlindPeerMuxer(senderStream)
  const receiver = new BlindPeerMuxer(receiverStream, {
    oncores,
    onnotification
  })

  return [sender, receiver]
}

function replicate(a, b) {
  a.rawStream.pipe(b.rawStream).pipe(a.rawStream)
}
