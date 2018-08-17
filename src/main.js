import 'babel-polyfill'
import telegrafAws from 'telegraf-aws'
const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')

const bot = new Telegraf(process.env.BOT_TOKEN, {
  // set to false for local testing
  webhookReply: process.env.BOT_LOCAL
})

if (process.env.BOT_LOCAL) {
  console.log('=============== LOCAL TESTING MODE ===============')
} else {
  bot.telegram.setWebhook(process.env.BOT_WEBHOOK_URL)
}

const updateHandler = telegrafAws(bot, {
  timeout: 1000 // Optional parameter, after timeout, empty response will be sent to AWS and function execution will be stopped
})

var voteCounter = {}

const keyboard = Markup.inlineKeyboard([
  Markup.callbackButton('👍', 'upvote'),
  Markup.callbackButton('👎', 'downvote')
])

function voteNumFormat (voteType, counter) {
  if (counter === 0) return ''
  return voteType + counter
}

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
  console.log(ctx)
  let messageId = ctx.message.message_id
  voteCounter[messageId] = {upvote: 0, downvote: 0}
  ctx.telegram.sendMessage(ctx.chat.id, '!', {reply_to_message_id: ctx.message.message_id, reply_markup: keyboard, disable_notification: true})
})

exports.handler = async (event, context, callback) => {
  updateHandler(event, callback)
}

// local testing
if (process.env.BOT_LOCAL) {
  console.log('=============== LOCAL POLLING ===============')
  //bot.startPolling()
}
