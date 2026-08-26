const test = require('brittle')
const b4a = require('b4a')
const Protomux = require('protomux')
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
    },
    appId: null,
    extra: null
  }

  const [sender] = setupMuxerPair({
    onnotification(data) {
      t.alike(data, notification)
    }
  })

  sender.sendNotification(notification)
})

test('handshake is stored on the channel', async function (t) {
  const senderHandshake = { blindPeeringVersion: '1.2.3' }
  const receiverHandshake = { blindPeeringVersion: '3.2.1' }

  const [sender, receiver] = setupMuxerPair({ senderHandshake, receiverHandshake })

  t.ok(await sender.channel.fullyOpened())
  t.alike(sender.channel.handshake, receiverHandshake, 'sender gets receivers handshake')
  t.ok(await receiver.channel.fullyOpened())
  t.alike(receiver.channel.handshake, senderHandshake, 'receiver gets senders handshake')
})

test('handshake defaults when neither side sends a version', async function (t) {
  const [sender, receiver] = setupMuxerPair()

  t.ok(await sender.channel.fullyOpened())
  t.alike(sender.channel.handshake, { blindPeeringVersion: null })
  t.ok(await receiver.channel.fullyOpened())
  t.alike(receiver.channel.handshake, { blindPeeringVersion: null })
})

test('sender without handhshake encoding does not break receiver with a handshake encoding', async function (t) {
  const senderStream = new SecretStream(true)
  const receiverStream = new SecretStream(false)
  replicate(senderStream, receiverStream)

  const receiver = new BlindPeerMuxer(receiverStream, {
    handshake: { blindPeeringVersion: '1.2.3' }
  })
  const sender = Protomux.from(senderStream).createChannel({ protocol: 'blind-peer' })
  sender.open()
  t.ok(await sender.fullyOpened())
  t.ok(await receiver.channel.fullyOpened())
  t.absent(sender.handshake, 'sender ignores handhsake')
  t.alike(receiver.channel.handshake, { blindPeeringVersion: null }, 'receiver defaulted handshake')
})

function setupMuxerPair({ oncores, onnotification, senderHandshake, receiverHandshake } = {}) {
  const senderStream = new SecretStream(true)
  const receiverStream = new SecretStream(false)

  replicate(senderStream, receiverStream)

  const sender = new BlindPeerMuxer(senderStream, { handshake: senderHandshake })
  const receiver = new BlindPeerMuxer(receiverStream, {
    oncores,
    onnotification,
    handshake: receiverHandshake
  })

  return [sender, receiver]
}

function replicate(a, b) {
  a.rawStream.pipe(b.rawStream).pipe(a.rawStream)
}
