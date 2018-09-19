import 'babel-polyfill'
const Telegraf = require('telegraf')
const { promisify } = require('util')

var Memcached = require('memcached')
var memcached = new Memcached(process.env.MEMCACHED_SERVER)

const memcachedGet = promisify(memcached.get).bind(memcached)
const memcachedSet = promisify(memcached.set).bind(memcached)

const bot = new Telegraf(process.env.BOT_TOKEN, {
  // set to false for local testing
  webhookReply: process.env.BOT_MODE === 'WEBHOOK'
})

if (process.env.BOT_MODE === 'LOCAL') {
  console.log('=============== LOCAL TESTING MODE ===============')
  bot.telegram.deleteWebhook()
} else {
  // bot.telegram.setWebhook(process.env.BOT_WEBHOOK_URL)
}

async function cacheHandler (command, data) {
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

bot.start(async (ctx) => {
  try {
    let user = ctx.from
    let payload = ctx.message.text.split(' ')[1]
    await ctx.reply(`Hello, ${user.first_name} \n\n`)
    await ctx.reply('Logging in ... \n')
    await cacheHandler('SET', {
      key: payload,
      value: {
        id: user.id,
        username: user.username
      }
    })
    return ctx.reply('You are successfully logged in, you can now return to Milestone App\n')
  } catch (error) {
    console.log(error)
  }
})

exports.handler = async (event, context, callback) => {
  const body = event.body // get data passed to us
  try {
    bot.handleUpdate(body) // make Telegraf process that data
  } catch (error) {
    console.log(error)
  }
  return callback(null, { // return something for webhook, so it doesn't try to send same stuff again
    statusCode: 200,
    body: ''
  })
}

// local testing
if (process.env.BOT_MODE === 'LOCAL') {
  console.log('=============== LOCAL POLLING ===============')
  bot.startPolling()
}
