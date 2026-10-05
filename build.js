const Hyperschema = require('hyperschema')

const schema = Hyperschema.from('./spec/hyperschema', { versioned: false })
const blind = schema.namespace('blind-peer')

blind.register({
  name: 'core',
  compact: true,
  fields: [
    {
      name: 'key',
      type: 'fixed32',
      required: true
    },
    {
      name: 'length',
      type: 'uint',
      required: true
    }
  ]
})

blind.register({
  name: 'cores',
  fields: [
    {
      name: 'referrer',
      type: 'fixed32'
    },
    {
      name: 'priority',
      type: 'uint'
    },
    {
      name: 'announce',
      type: 'bool'
    },
    {
      name: 'cores',
      type: '@blind-peer/core',
      array: true,
      required: true
    }
  ]
})

blind.register({
  name: 'handshake',
  fields: [
    {
      name: 'blindPeeringVersion',
      type: 'string'
    },
    {
      name: 'clientName',
      type: 'string'
    },
    {
      name: 'clientVersion',
      type: 'string'
    }
  ]
})

blind.register({
  name: 'core-response',
  compact: true,
  fields: [
    {
      name: 'key',
      type: 'fixed32',
      required: true
    },
    {
      name: 'length',
      type: 'uint',
      required: true
    },
    {
      name: 'activated',
      type: 'bool',
      required: true
    }
  ]
})

blind.register({
  name: 'add-cores-response',
  fields: [
    {
      name: 'cores',
      type: '@blind-peer/core-response',
      array: true,
      required: true
    }
  ]
})

blind.register({
  name: 'error',
  compact: true,
  fields: [
    {
      name: 'code',
      type: 'uint',
      required: true
    }
  ]
})

Hyperschema.toDisk(schema)
