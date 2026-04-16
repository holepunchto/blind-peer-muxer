const Hyperschema = require('hyperschema')

const schema = Hyperschema.from('./spec/hyperschema', { versioned: false })
const legacy = schema.namespace('blind-peer')

legacy.register({
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


legacy.register({
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

const blind = schema.namespace('blind-peer-v2')

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
      name: 'version',
      type: 'uint',
      required: true
    },
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
      type: '@blind-peer-v2/core',
      array: true,
      required: true
    }
  ]
})

Hyperschema.toDisk(schema)
