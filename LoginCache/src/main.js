const { promisify } = require('util')
var Memcached = require('memcached')
var memcached = new Memcached(process.env.MEMCACHED_SERVER)

const memcachedGet = promisify(memcached.get).bind(memcached)
const memcachedSet = promisify(memcached.set).bind(memcached)

async function main (command, data) {
  switch (command) {
    case 'GET':
      let rv = await memcachedGet(data.key)
      if (!rv) {
        throw new Error('Key: [' + data.key + '] does not exist')
      }
      return rv
    case 'SET':
      // 30 seconds ttl
      await memcachedSet(data.key, data.value, 30)
      break
    default:
      throw new Error('Undefinde command')
  }
}

exports.handler = async (event, context, callback) => {
  try {
    let rv = await main(event['command'], event['data'])
    memcached.end() // close connections
    return callback(null, {
      statusCode: 200,
      body: rv
    })
  } catch (error) {
    memcached.end() // close connections
    return callback(error)
  }
}
