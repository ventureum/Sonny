import 'babel-polyfill'
import axios from 'axios'
const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')

const bot = new Telegraf(process.env.BOT_TOKEN, {
  // set to false for local testing
  webhookReply: process.env.BOT_MODE === 'WEBHOOK'
})

if (process.env.BOT_LOCAL === 'true') {
  console.log('=============== LOCAL TESTING MODE ===============')
  bot.telegram.deleteWebhook()
} else {
  bot.telegram.setWebhook(process.env.BOT_WEBHOOK_URL)
}

var voteCounter = {}

const keyboard = Markup.inlineKeyboard([
  Markup.callbackButton('👍', 'upvote'),
  Markup.callbackButton('👎', 'downvote')
])

function voteNumFormat (voteType, counter) {
  if (counter === 0) return ''
  return voteType + counter
}

bot.command('/rep', async (ctx) => {
  console.log(ctx.update)
  let username = ctx.message.from.username
  let userId = ctx.message.from.id
  let chatId = ctx.message.chat.id

  // Can only be called in a private chat
  if (userId !== chatId) return

  const result = await axios.post(
    `${process.env.BOT_FEED_END_POINT}/get-reputations`,
    {
      UserAddress: username
    }
  )

  let _reply = null
  if (result.data.ok) {
    _reply = result.data.reputations
  } else {
    _reply = result.data.message
  }

  return ctx.reply('Current reputation: ' + _reply)
})

// DEV TEST ONLY
bot.command('/refuel', async (ctx) => {
  console.log(ctx.update)
  let username = ctx.message.from.username
  let userId = ctx.message.from.id
  let chatId = ctx.message.chat.id
  let repAmount = ctx.message.text.split(' ')[1]

  // Can only be called in a private chat
  if (userId !== chatId) return

  const result = await axios.post(
    `${process.env.BOT_FEED_END_POINT}/refuel-reputations`,
    {
      UserAddress: username,
      reputations: parseInt(repAmount)
    }
  )

  if (result.data.ok) {
    return ctx.reply('Refuel completed')
  } else {
    return ctx.reply(result.data)
  }
})

bot.action('upvote', async (ctx) => {
  let upvoterId = ctx.update.callback_query.from.id
  let replyMessage = ctx.update.callback_query.message.reply_to_message
  let replyMessageId = replyMessage.message_id
  let replyMessageUser = replyMessage.from
  let replyMessageUsername = replyMessageUser.username
  let replyMessageChat = replyMessage.chat
  let replyMessageChatTitle = replyMessageChat.title
  let replyMessageChatId = replyMessageChat.id

  voteCounter[replyMessageId].upvote++

  let counter = voteCounter[replyMessageId]

  ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
    Markup.callbackButton('👍 ' + voteNumFormat('+', counter.upvote), 'upvote'),
    Markup.callbackButton('👎 ' + voteNumFormat('-', counter.downvote), 'downvote')
  ]))

  await ctx.telegram.forwardMessage(upvoterId, replyMessageChatId, replyMessageId, {disable_notification: true})
  await ctx.telegram.sendMessage(upvoterId, 'You just upvoted the above message (#' + replyMessageId + ') posted by @' + replyMessageUsername + ' from group ' + replyMessageChatTitle, {disable_notification: true})

})

bot.action('downvote', async (ctx) => {
  let upvoterId = ctx.update.callback_query.from.id
  let replyMessage = ctx.update.callback_query.message.reply_to_message
  let replyMessageId = replyMessage.message_id
  let replyMessageUser = replyMessage.from
  let replyMessageUsername = replyMessageUser.username
  let replyMessageChat = replyMessage.chat
  let replyMessageChatTitle = replyMessageChat.title
  let replyMessageChatId = replyMessageChat.id

  voteCounter[replyMessageId].downvote++

  let counter = voteCounter[replyMessageId]

  ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
    Markup.callbackButton('👍 ' + voteNumFormat('+', counter.upvote), 'upvote'),
    Markup.callbackButton('👎 ' + voteNumFormat('-', counter.downvote), 'downvote')
  ]))

  await ctx.telegram.forwardMessage(upvoterId, replyMessageChatId, replyMessageId, {disable_notification: true})
  await ctx.telegram.sendMessage(upvoterId, 'You just downvoted the above message (#' + replyMessageId + ') posted by @' + replyMessageUsername + ' from group ' + replyMessageChatTitle, {disable_notification: true})
})

bot.command('p', (ctx) => {
  let user = ctx.message.from
  let messageId = ctx.message.message_id
  let chat = ctx.message.chat
  voteCounter[messageId] = {upvote: 0, downvote: 0}
  ctx.telegram.sendMessage(ctx.chat.id, 'Post #' + messageId, {reply_to_message_id: ctx.message.message_id, reply_markup: keyboard, disable_notification: false})

  // send a notification to user
  ctx.telegram.sendMessage(user.id, 'You just posted a message (#' + messageId + ') in group ' + chat.title, {disable_notification: true})
})

bot.command('r', (ctx) => {
  let user = ctx.message.from
  let messageId = ctx.message.message_id
  let replyTo = ctx.message.reply_to_message
  let chat = ctx.message.chat
  voteCounter[messageId] = {upvote: 0, downvote: 0}
  ctx.telegram.sendMessage(ctx.chat.id, 'Reply #' + messageId + ' to message #' + replyTo.message_id, {reply_to_message_id: ctx.message.message_id, reply_markup: keyboard, disable_notification: false})

  // send a notification to user
  ctx.telegram.sendMessage(user.id, 'You just replied to message (#' + replyTo.message_id + ') in group ' + chat.title, {disable_notification: true})
})

exports.handler = async (event, context, callback) => {
  const body = event.body // get data passed to us
  bot.handleUpdate(body) // make Telegraf process that data
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
