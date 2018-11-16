import { shake128 } from 'js-sha3'
const Telegraf = require('telegraf')
const { promisify } = require('util')
const Markup = require('telegraf/markup')
var jwt = require('jsonwebtoken')
var Memcached = require('memcached')

var memcached = new Memcached(process.env.MEMCACHED_SERVER)

const memcachedGet = promisify(memcached.get).bind(memcached)
const memcachedSet = promisify(memcached.set).bind(memcached)

const JWTRS256_PRIVATE = `-----BEGIN RSA PRIVATE KEY-----\n${process.env.JWTRS256_PRIVATE}\n-----END RSA PRIVATE KEY-----`

const bot = new Telegraf(process.env.BOT_TOKEN, {
  // set to false for local testing
  webhookReply: process.env.BOT_MODE === 'WEBHOOK'
})

if (process.env.BOT_MODE === 'LOCAL') {
  console.log('=============== LOCAL TESTING MODE ===============')
  bot.telegram.deleteWebhook()
} else {
  bot.telegram.setWebhook(process.env.BOT_WEBHOOK_URL)
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
      // 60 seconds ttl
      await memcachedSet(data.key, data.value, 60)
      break
    default:
      throw new Error('Undefinde command')
  }
}

bot.start(async (ctx) => {
  try {
    let user = ctx.from
    let requestKey = ctx.message.text.split(' ')[1]

    await ctx.reply(`Hello, ${user.first_name} \n\n`)
    await ctx.reply('Logging in ... \n')

    console.log('Received user info, generating JWT', ctx)

    const shakeHash = shake128(String(user.id), 128)
    const hashBytes = Buffer.from(shakeHash, 'hex')
    const uuidParse = require('uuid-parse')
    const actor = uuidParse.unparse(hashBytes)
    var token = await jwt.sign({
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // expires in 24 hr
      data: {
        actor: actor,
        telegramId: user.id,
        username: user.username
      }
    },
    JWTRS256_PRIVATE,
    { algorithm: 'RS256' }
    )
    console.log('JWT generated:', token)

    await cacheHandler('SET', {
      key: requestKey,
      value: token
    })
    console.log('chache written:', {
      key: requestKey,
      value: token
    })

    // For Niagara integration in the future.
    // const button = Markup.inlineKeyboard([
    //   Markup.urlButton('Back to Milstone App', `https://open.milestone/LoginPage?jwt=${token}`)
    // ]).extra()

    return ctx.reply(
      'You are successfully logged in, you can now return to Milestone App\n\n'
    )
  } catch (error) {
    console.log(error)
  }
})

exports.handler = async (event, context, callback) => {
  try {
    console.log('auth event body:', event.body)
    bot.handleUpdate(event.body) // make Telegraf process that data
  } catch (error) {
    console.log(error)
  }
  return callback(null, {
    // return something for webhook, so it doesn't try to send same stuff again
    statusCode: 200,
    body: event.body
  })
}

if (process.env.BOT_MODE === 'LOCAL') {
  console.log('=============== LOCAL POLLING ===============')
  bot.startPolling()
}
