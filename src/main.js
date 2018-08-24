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

const keyboard = Markup.inlineKeyboard([
  Markup.callbackButton('👍', 'upvote'),
  Markup.callbackButton('👎', 'downvote'),
  Markup.callbackButton('Vote Cost', 'cost')
])

const PostType = {
  POST: '0x2fca5a5e',
  COMMENT: '0x6bf78b95',
  AIRDROP: '0x04bc4e7a',
  MILESTONE: '0xf7003d25'
}

const validGroups = new Set(['botTest2', 'MilestoneChatbot Test'])

function isValidGroup (group) {
  return validGroups.has(group)
}

function voteNumFormat (voteType, counter) {
  if (counter === 0) return ''
  return voteType + counter
}

const helpMsg = 'Milestone Bot\n\n' +
      'Milestone bot provides a simple way to interact with milestone community \n\n' +
      '/rep — view current reputation\n'

bot.start((ctx) => ctx.reply(`Hello, ${ctx.from.first_name} \n\n` + helpMsg))

bot.help((ctx) => ctx.reply(helpMsg))

bot.command('rep', async (ctx) => {
  try {
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

    console.log(result.data)
    let _reply = null
    if (result.data.ok) {
      _reply = result.data.reputations
    } else {
      _reply = result.data.message
    }

    await ctx.reply('Current reputation: ' + _reply)
  } catch (error) {
    console.log(error)
  }
})

// DEV TEST ONLY
bot.command('refuel', async (ctx) => {
  try {
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
      await ctx.reply('Refuel completed')
    } else {
      await ctx.reply(result.data)
    }
  } catch (error) {
    console.log(error)
  }
})

bot.action('upvote', async (ctx) => {
  try {
    let callbackQuery = ctx.update.callback_query
    let upvoter = ctx.update.callback_query.from.username
    let upvoterId = ctx.update.callback_query.from.id
    let replyMessage = ctx.update.callback_query.message.reply_to_message
    let replyMessageId = replyMessage.message_id
    let replyMessageChat = replyMessage.chat
    let replyMessageChatTitle = replyMessageChat.title

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
      let voteInfo = result.data.voteInfo

      ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
        Markup.callbackButton('👍 ' + voteNumFormat('+', voteInfo.upvoteCount), 'upvote'),
        Markup.callbackButton('👎 ' + voteNumFormat('-', voteInfo.downvoteCount), 'downvote'),
        Markup.callbackButton('Vote Cost', 'cost')
      ]))

      // send notification
      await ctx.telegram.answerCbQuery(callbackQuery.id, 'Upvoted msg (#' + replyMessageId + ') ' + ', reputation cost: ' + voteInfo.cost)
    } else {
      // send error message
      let errorMsg = JSON.parse(result.data.message)
      if (errorMsg.errorCode === 'InsuffientReputaionsAmount') {
        // insufficient reputation error
        await ctx.telegram.answerCbQuery(callbackQuery.id, 'Insufficient MS, require ' + errorMsg.errorData.diff + ' more')
      } else {
        await ctx.telegram.sendMessage(upvoterId, errorMsg)
      }
    }
  } catch (error) {
    console.log(error)
  }
})

bot.action('downvote', async (ctx) => {
  try {
    let callbackQuery = ctx.update.callback_query
    let upvoter = ctx.update.callback_query.from.username
    let upvoterId = ctx.update.callback_query.from.id
    let replyMessage = ctx.update.callback_query.message.reply_to_message
    let replyMessageId = replyMessage.message_id
    let replyMessageChat = replyMessage.chat
    let replyMessageChatTitle = replyMessageChat.title

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

    if (result.data.ok) {
      let voteInfo = result.data.voteInfo

      ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
        Markup.callbackButton('👍 ' + voteNumFormat('+', voteInfo.upvoteCount), 'upvote'),
        Markup.callbackButton('👎 ' + voteNumFormat('-', voteInfo.downvoteCount), 'downvote'),
        Markup.callbackButton('Vote Cost', 'cost')
      ]))

      // send notification
      await ctx.telegram.answerCbQuery(callbackQuery.id, 'Downvoted msg (#' + replyMessageId + ') ' + ', MS cost: ' + voteInfo.cost)
    } else {
      // send error message
      let errorMsg = JSON.parse(result.data.message)
      if (errorMsg.errorCode === 'InsuffientReputaionsAmount') {
        // insufficient reputation error
        await ctx.telegram.answerCbQuery(callbackQuery.id, 'Insufficient MS, require ' + errorMsg.errorData.diff + ' more')
      } else {
        await ctx.telegram.sendMessage(upvoterId, errorMsg)
      }
    }
  } catch (error) {
    console.log(error)
  }
})

// estimate vote cost
bot.action('cost', async (ctx) => {
  try {
    let callbackQuery = ctx.update.callback_query
    let upvoter = ctx.update.callback_query.from.username
    let upvoterId = ctx.update.callback_query.from.id
    let replyMessage = ctx.update.callback_query.message.reply_to_message
    let replyMessageId = replyMessage.message_id
    let replyMessageChat = replyMessage.chat
    let replyMessageChatTitle = replyMessageChat.title

    // invoke vote api
    const result = await axios.post(
      `${process.env.BOT_FEED_END_POINT}/feed-upvote`,
      {
        actor: upvoter,
        boardId: replyMessageChatTitle,
        postHash: replyMessageId.toString(),
        value: 0
      }
    )

    if (result.data.ok) {
      let voteInfo = result.data.voteInfo

      // send notification
      await ctx.telegram.answerCbQuery(callbackQuery.id, 'Estimated MS cost: ' + voteInfo.cost)
    } else {
      // send error message
      await ctx.telegram.sendMessage(upvoterId, result.data)
    }
  } catch (error) {
    console.log(error)
  }
})

bot.command('p', async (ctx) => {
  try {
    let user = ctx.message.from
    let messageId = ctx.message.message_id
    let chat = ctx.message.chat
    let messageText = ctx.message.text.slice(3)

    // must be in a valid group
    if (!isValidGroup(chat.title)) return

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
    } else {
      // send error message
      await ctx.telegram.sendMessage(user.id, result.data.message)
    }
  } catch (error) {
    console.log(error)
  }
})

// process replies
bot.on('message', async (ctx) => {
  try {
    let user = ctx.message.from
    let messageId = ctx.message.message_id
    let chat = ctx.message.chat
    let messageText = ctx.message.text

    // must be a reply
    if (!ctx.message.reply_to_message) return

    let replyTo = ctx.message.reply_to_message
    let replyToMessage = replyTo.text

    // must be a reply to a post
    if (!replyToMessage.startsWith('/p ')) return

    // must be in a valid group
    if (!isValidGroup(chat.title)) return

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
    } else {
      // send error message
      await ctx.telegram.sendMessage(user.id, result.data.message)
    }
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
