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

const PostType = {
  POST: '0x2fca5a5e',
  COMMENT: '0x6bf78b95',
  AIRDROP: '0x04bc4e7a',
  MILESTONE: '0xf7003d25'
}

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
  let upvoter = ctx.update.callback_query.from.username
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

  // invoke vote api
  const result = await axios.post(
    `${process.env.BOT_FEED_END_POINT}/feed-upvote`,
    {
      actor: upvoter,
      boardId: replyMessageChatTitle,
      postHash: replyMessageId.toString(),
      value: 1
    }
  )

  if (result.data.ok) {
    await ctx.telegram.forwardMessage(upvoterId, replyMessageChatId, replyMessageId, {disable_notification: true})
    await ctx.telegram.sendMessage(upvoterId, 'You just upvoted the above message (#' + replyMessageId + ') posted by @' + replyMessageUsername + ' from group ' + replyMessageChatTitle, {disable_notification: true})
  } else {
    // send error message
    return ctx.telegram.sendMessage(upvoterId, result.data)
  }
})

bot.action('downvote', async (ctx) => {
  let upvoter = ctx.update.callback_query.from.username
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

  // invoke vote api
  const result = await axios.post(
    `${process.env.BOT_FEED_END_POINT}/feed-upvote`,
    {
      actor: upvoter,
      boardId: replyMessageChatTitle,
      postHash: replyMessageId.toString(),
      value: -1
    }
  )

  console.log(result.data)

  if (result.data.ok) {
    await ctx.telegram.forwardMessage(upvoterId, replyMessageChatId, replyMessageId, {disable_notification: true})
    await ctx.telegram.sendMessage(upvoterId, 'You just downvoted the above message (#' + replyMessageId + ') posted by @' + replyMessageUsername + ' from group ' + replyMessageChatTitle, {disable_notification: true})
  } else {
    // send error message
    return ctx.telegram.sendMessage(upvoterId, result.data)
  }
})

bot.command('p', async (ctx) => {
  let user = ctx.message.from
  let messageId = ctx.message.message_id
  let chat = ctx.message.chat
  let messageText = ctx.message.text.slice(3)

  voteCounter[messageId] = {upvote: 0, downvote: 0}

  let data = {
    actor: user.username,
    boardId: chat.title,
    postHash: messageId.toString(),
    parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000', // no parent
    typeHash: PostType.POST,
    content: {
      title: '@' + user.username + ' From telegram',
      subtitle: messageText.slice(0, 50) + '...',
      text: messageText
    },
    getStreamApiKey: process.env.STREAM_API_KEY,
    getStreamApiSecret: process.env.STREAM_API_SECRET
  }

  const result = await axios.post(
    `${process.env.BOT_FEED_END_POINT}/feed-post`,
    data
  )

  if (result.data.ok) {
    // send a notification to user
    await ctx.telegram.sendMessage(ctx.chat.id, 'Post #' + messageId, {reply_to_message_id: ctx.message.message_id, reply_markup: keyboard, disable_notification: false})
    return ctx.telegram.sendMessage(user.id, 'You just posted a message (#' + messageId + ') in group ' + chat.title, {disable_notification: true})
  } else {
    // send error message
    return ctx.telegram.sendMessage(user.id, result.data)
  }
})

bot.command('r', async (ctx) => {
  let user = ctx.message.from
  let messageId = ctx.message.message_id
  let replyTo = ctx.message.reply_to_message
  let chat = ctx.message.chat
  let messageText = ctx.message.text.slice(3)

  voteCounter[messageId] = {upvote: 0, downvote: 0}

  let data = {
    actor: user.username,
    boardId: chat.title,
    postHash: messageId.toString(),
    parentHash: replyTo.message_id.toString(),
    typeHash: PostType.COMMENT,
    content: {
      title: '@' + user.username + ' From telegram',
      subtitle: messageText.slice(0, 50) + '...',
      text: messageText
    },
    getStreamApiKey: process.env.STREAM_API_KEY,
    getStreamApiSecret: process.env.STREAM_API_SECRET
  }

  const result = await axios.post(
    `${process.env.BOT_FEED_END_POINT}/feed-post`,
    data
  )

  if (result.data.ok) {
    // send a notification to user
    await ctx.telegram.sendMessage(ctx.chat.id, 'Reply #' + messageId + ' to message #' + replyTo.message_id, {reply_to_message_id: ctx.message.message_id, reply_markup: keyboard, disable_notification: false})
    return ctx.telegram.sendMessage(user.id, 'You just replied to message (#' + replyTo.message_id + ') in group ' + chat.title, {disable_notification: true})
  } else {
    // send error message
    return ctx.telegram.sendMessage(user.id, result.data)
  }
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
