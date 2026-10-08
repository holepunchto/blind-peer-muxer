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
    async oncores(data) {
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
    async onnotification(data) {
      t.alike(data, notification)
    }
  })

  sender.sendNotification(notification)
})

test('requestAddCores resolves with the peer response', async function (t) {
  const cores = {
    referrer: b4a.alloc(32, 1),
    priority: 3,
    announce: true,
    cores: [
      { key: b4a.alloc(32, 2), length: 42 },
      { key: b4a.alloc(32, 3), length: 43 }
    ]
  }

  const response = {
    cores: [
      { key: b4a.alloc(32, 2), length: 0, activated: true },
      { key: b4a.alloc(32, 3), length: 43, activated: false }
    ]
  }

  const [sender] = setupMuxerPair({
    async oncores(data) {
      t.alike(data, cores)
      return response
    }
  })

  t.alike(await sender.requestAddCores(cores), { version: 1, ...response })
})

test('requestSendNotification resolves once handled by peer', async function (t) {
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
    async onnotification(data) {
      t.alike(data, notification)
    }
  })

  t.is(await sender.requestSendNotification(notification), null)
})

test('handshake is stored on the channel', async function (t) {
  const senderHandshake = { blindPeeringVersion: '1.2.3' }
  const receiverHandshake = {
    blindPeeringVersion: '3.2.1',
    clientName: 'receiver',
    clientVersion: '2.2.2'
  }

  const [sender, receiver] = setupMuxerPair({ senderHandshake, receiverHandshake })

  t.ok(await sender.channel.fullyOpened())
  t.alike(sender.channel.handshake, receiverHandshake, 'sender gets receivers handshake')
  t.ok(await receiver.channel.fullyOpened())
  t.alike(
    receiver.channel.handshake,
    { ...defaultHandhshake, blindPeeringVersion: senderHandshake.blindPeeringVersion },
    'receiver gets senders handshake'
  )
})

test('handshake defaults when neither side sends it', async function (t) {
  const [sender, receiver] = setupMuxerPair()

  t.ok(await sender.channel.fullyOpened())
  t.alike(sender.channel.handshake, defaultHandhshake)
  t.ok(await receiver.channel.fullyOpened())
  t.alike(receiver.channel.handshake, defaultHandhshake)
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
  t.alike(receiver.channel.handshake, defaultHandhshake, 'receiver defaulted handshake')
})

test('unmapped error codes are received as REQUEST_DESTROYED', async function (t) {
  const [sender] = setupMuxerPair({
    async oncores() {
      const err = new Error('unmapped')
      err.code = 'SOMETHING_ELSE'
      throw err
    }
  })

  try {
    await sender.requestAddCores({ cores: [] })
    t.fail('should reject')
  } catch (err) {
    t.is(err.code, 'REQUEST_DESTROYED')
  }
})

test('request without a handler is rejected', async function (t) {
  const [sender, receiver] = setupMuxerPair()

  try {
    await sender.requestAddCores({ cores: [] })
    t.fail('should reject')
  } catch (err) {
    t.is(err.code, 'REQUEST_NOT_HANDLED')
  }
  t.absent(receiver.channel.closed, 'channel stays open')
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

const defaultHandhshake = { blindPeeringVersion: null, clientName: null, clientVersion: null }
