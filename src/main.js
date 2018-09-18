import 'babel-polyfill'
import axios from 'axios'
const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')

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

const keyboard = Markup.inlineKeyboard([
  Markup.callbackButton('👍', 'upvote'),
  Markup.callbackButton('👎', 'downvote')
])

const mainMenu = Markup.inlineKeyboard([
  Markup.urlButton('Portal', 'http://www.milest.one'),
  Markup.callbackButton('Profile', 'profile'),
  Markup.callbackButton('Language', 'language'),
  Markup.callbackButton('Tutorial', 'tutorial')
], { columns: 3 }).extra()

const backToMainMenu = Markup.inlineKeyboard([
  Markup.callbackButton('Back', 'backToMainMenu')
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

const helpMsg = 'Milestone bot provides a simple way to interact with milestone community \n\n' +
      '/profile — view your profile \n'

const TutorialMsg = 'This is a tutorial'

bot.start(async (ctx) => {
  try {
    await ctx.reply(`Hello, ${ctx.from.first_name} \n\n`)

    let username = ctx.message.from.username
    // first check if user has registered
    const result = await axios.post(
      `${process.env.BOT_FEED_END_POINT}/get-profile`,
      {
        actor: username
      }
    )

    let text = ''
    if (!result.data.ok) {
      // error
      // check if we have received actor prifile not exist error
      let msg = result.data.message
      if (msg.errorCode === 'NoActorExisting') {
        // no actor exists
        // automatically register for the user
        let regResult = await axios.post(
          `${process.env.BOT_FEED_END_POINT}/profile`,
          {
            actor: username,
            userType: 'USER'
          }
        )

        if (regResult.data.ok) {
          text = text + 'I have created an account for you in our system!'
        } else {
          await ctx.reply(regResult.data.message)
        }
      }
    } else {
      text = text + 'You have already registered with us.'
    }
    return ctx.reply(text + '\n\n' + helpMsg, mainMenu)
  } catch (error) {
    console.log(error)
  }
})

bot.help((ctx) => {
  let userId = ctx.message.from.id
  let chatId = ctx.message.chat.id

  // Can only be called in a private chat
  if (userId !== chatId) return

  ctx.reply(helpMsg, mainMenu)
})

bot.command('profile', async (ctx) => {
  try {
    let username = ctx.message.from.username
    let userId = ctx.message.from.id
    let chatId = ctx.message.chat.id

    // Can only be called in a private chat
    if (userId !== chatId) return

    const result = await axios.post(
      `${process.env.BOT_FEED_END_POINT}/get-profile`,
      {
        actor: username
      }
    )

    let _reply = null
    if (result.data.ok) {
      let data = result.data.profile
      _reply = 'Username: ' + data.actor + ' \n' +
        'User Type: ' + data.actorType + ' \n' +
        'Fuel: ' + data.rewardsInfo.fuel + ' liters \n' +
        'Reputation: ' + data.rewardsInfo.reputation + ' \n' +
        'Milestone Points: ' + data.rewardsInfo.milestonePoints
    } else {
      _reply = result.data.message
    }

    await ctx.reply(_reply)
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
    let fuel = ctx.message.text.split(' ')[1]
    let reputation = ctx.message.text.split(' ')[2]
    let milestonePoints = ctx.message.text.split(' ')[3]

    // Can only be called in a private chat
    if (userId !== chatId) return

    const result = await axios.post(
      `${process.env.BOT_FEED_END_POINT}/refuel`,
      {
        actor: username,
        fuel: parseInt(fuel),
        reputation: parseInt(reputation),
        milestonePoints: parseInt(milestonePoints)
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

bot.action('profile', async (ctx) => {
  try {
    let username = ctx.update.callback_query.from.username
    const result = await axios.post(
      `${process.env.BOT_FEED_END_POINT}/get-profile`,
      {
        actor: username
      }
    )

    let _reply = null
    if (result.data.ok) {
      let data = result.data.profile
      _reply = 'Username: ' + data.actor + ' \n' +
        'User Type: ' + data.actorType + ' \n' +
        'Fuel: ' + data.rewardsInfo.fuel + ' liters \n' +
        'Reputation: ' + data.rewardsInfo.reputation + ' \n' +
        'Milestone Points: ' + data.rewardsInfo.milestonePoints
    } else {
      _reply = result.data.message
    }

    await ctx.editMessageText(_reply)
    await ctx.editMessageReplyMarkup(backToMainMenu)
  } catch (error) {
    console.log(error)
  }
})

bot.action('language', async (ctx) => {
  try {
    await ctx.editMessageText('Coming soon ...', { parse_mode: 'Markdown', reply_markup: backToMainMenu })
  } catch (error) {
    console.log(error)
  }
})

bot.action('tutorial', async (ctx) => {
  try {
    await ctx.editMessageText(TutorialMsg, { parse_mode: 'Markdown', reply_markup: backToMainMenu })
  } catch (error) {
    console.log(error)
  }
})

bot.action('backToMainMenu', async (ctx) => {
  try {
    await ctx.editMessageText(helpMsg, mainMenu)
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
      let postVoteCountInfo = voteInfo.postVoteCountInfo

      ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
        Markup.callbackButton('👍 ' + voteNumFormat('+', postVoteCountInfo.upvoteCount), 'upvote'),
        Markup.callbackButton('👎 ' + voteNumFormat('-', postVoteCountInfo.downvoteCount), 'downvote')
      ]))

      // send notification
      await ctx.telegram.answerCbQuery(callbackQuery.id, 'Upvoted msg (#' + replyMessageId + ')')
    } else {
      // send error message
      let errorMsg = result.data.message
      if (errorMsg.errorCode === 'InsuffientReputaionsAmount') {
        // insufficient reputation error
        await ctx.telegram.answerCbQuery(callbackQuery.id, 'Insufficient MS, require ' + errorMsg.errorData.diff + ' more')
      } else if (errorMsg.errorCode === 'ExceedingUpvoteLimit') {
        // can only vote once
        await ctx.telegram.answerCbQuery(callbackQuery.id, 'You have already upvoted')
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
      let postVoteCountInfo = voteInfo.postVoteCountInfo

      ctx.editMessageReplyMarkup(Markup.inlineKeyboard([
        Markup.callbackButton('👍 ' + voteNumFormat('+', postVoteCountInfo.upvoteCount), 'upvote'),
        Markup.callbackButton('👎 ' + voteNumFormat('-', postVoteCountInfo.downvoteCount), 'downvote')
      ]))

      // send notification
      await ctx.telegram.answerCbQuery(callbackQuery.id, 'Downvoted msg (#' + replyMessageId + ')')
    } else {
      // send error message
      let errorMsg = result.data.message
      if (errorMsg.errorCode === 'InsuffientReputaionsAmount') {
        // insufficient reputation error
        await ctx.telegram.answerCbQuery(callbackQuery.id, 'Insufficient MS, require ' + errorMsg.errorData.diff + ' more')
      } else if (errorMsg.errorCode === 'ExceedingDownvoteLimit') {
        // can only vote once
        await ctx.telegram.answerCbQuery(callbackQuery.id, 'You have already downvoted')
      } else {
        await ctx.telegram.sendMessage(upvoterId, errorMsg)
      }
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
      await ctx.telegram.sendMessage(ctx.chat.id, 'by @' + user.username, { reply_markup: keyboard, disable_notification: false })
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
      await ctx.telegram.sendMessage(ctx.chat.id, 'by @' + user.username, { reply_markup: keyboard, disable_notification: false })
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
