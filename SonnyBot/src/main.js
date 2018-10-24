import 'babel-polyfill'
import axios from 'axios'
const Telegraf = require('telegraf')
const Markup = require('telegraf/markup')
const shake128 = require('js-sha3').shake128
const sha3_256 = require('js-sha3').sha3_256
const uuidParse = require('uuid-parse')

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
  Markup.callbackButton('Refuel', 'refuel'),
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

function getId (telegramId) {
  const shakeHash = shake128(String(telegramId), 128)
  const hashBytes = Buffer.from(shakeHash, 'hex')
  const id = uuidParse.unparse(hashBytes)
  return id
}

bot.start(async (ctx) => {
  try {
    await ctx.reply(`Hello, ${ctx.from.first_name} \n\n`)

    let user = ctx.message.from
    let username = user.username

    // first generate uuid from telegram id
    let id = getId(user.id)

    // first check if user has registered
    const result = await axios.post(
      `${process.env.BOT_FEED_END_POINT}/get-profile`,
      {
        actor: id
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
            actor: id,
            userType: 'USER',
            username: username,
            telegamId: String(user.id)
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
    let userId = ctx.message.from.id
    let chatId = ctx.message.chat.id

    // first generate uuid from telegram id
    let id = getId(userId)

    // Can only be called in a private chat
    if (userId !== chatId) return

    const result = await axios.post(
      `${process.env.BOT_FEED_END_POINT}/get-profile`,
      {
        actor: id
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

bot.action('refuel', async (ctx) => {
  try {
    let query = ctx.update.callback_query
    let userId = query.from.id
    let chatId = query.message.chat.id

    // first generate uuid from telegram id
    let id = getId(userId)

    // Can only be called in a private chat
    if (userId !== chatId) return

    const result = await axios.post(
      `${process.env.BOT_FEED_END_POINT}/refuel`,
      {
        actor: id
      }
    )

    if (result.data.ok) {
      await ctx.reply('Refueled ' + result.data.refuelAmount)
    } else {
      await ctx.reply(result.data.message)
    }
  } catch (error) {
    console.log(error)
  }
})

// DEV TEST ONLY
bot.command('devRefuel', async (ctx) => {
  try {
    let userId = ctx.message.from.id
    let chatId = ctx.message.chat.id
    let fuel = ctx.message.text.split(' ')[1]
    let reputation = ctx.message.text.split(' ')[2]
    let milestonePoints = ctx.message.text.split(' ')[3]

    // first generate uuid from telegram id
    let id = getId(userId)

    // Can only be called in a private chat
    if (userId !== chatId) return

    const result = await axios.post(
      `${process.env.BOT_FEED_END_POINT}/dev-refuel`,
      {
        actor: id,
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
    let userId = ctx.update.callback_query.from.id

    // first generate uuid from telegram id
    let id = getId(userId)

    const result = await axios.post(
      `${process.env.BOT_FEED_END_POINT}/get-profile`,
      {
        actor: id
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
      console.log(result)
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
    let upvoterId = ctx.update.callback_query.from.id
    let message = ctx.update.callback_query.message
    let replyMessageId = message.message_id - 1
    let replyMessageChat = message.chat

    // first generate uuid from telegram id
    let id = getId(upvoterId)

    // invoke vote api
    const result = await axios.post(
      `${process.env.BOT_FEED_END_POINT}/feed-upvote`,
      {
        actor: id,
        boardId: '0x'+sha3_256(replyMessageChat.id.toString()),
        postHash: replyMessageChat.id + '_' + replyMessageId.toString(),
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
    let downvoterId = ctx.update.callback_query.from.id
    let message = ctx.update.callback_query.message
    let replyMessageId = message.message_id - 1
    let replyMessageChat = message.chat

    // first generate uuid from telegram id
    let id = getId(downvoterId)

    // invoke vote api
    const result = await axios.post(
      `${process.env.BOT_FEED_END_POINT}/feed-upvote`,
      {
        actor: id,
        boardId: '0x'+sha3_256(replyMessageChat.id.toString()),
        postHash: replyMessageChat.id + '_' + replyMessageId.toString(),
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
        await ctx.telegram.sendMessage(downvoterId, errorMsg)
      }
    }
  } catch (error) {
    console.log(error)
  }
})

bot.command('p', async (ctx) => {
  try {
    let user = ctx.message.from
    let message = ctx.message
    let messageId = ctx.message.message_id
    let chat = ctx.message.chat
    let messageText = ctx.message.text.slice(3)

    // first generate uuid from telegram id
    let id = getId(user.id)

    // must be in a valid group
    if (!isValidGroup(chat.title)) return

    let data = {
      actor: id,
      boardId: '0x'+sha3_256(chat.id.toString()),
      postHash: chat.id + '_' + messageId.toString(),
      parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000', // no parent
      typeHash: PostType.POST,
      content: {
        title: '@' + user.username + ' From telegram',
        subtitle: messageText.slice(0, 50) + '...',
        text: messageText,
        meta: JSON.stringify(message.entities)
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
      await ctx.telegram.sendSticker(ctx.chat.id, 'CAADAQADBQADLCEmHesoPkiTdaEtAg', { reply_markup: keyboard, disable_notification: false })
      await ctx.telegram.sendSticker(ctx.chat.id, 'CAADAQADBQADLCEmHesoPkiTdaEtAg')
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

    // first generate uuid from telegram id
    let id = getId(user.id)

    // must be a reply
    if (!ctx.message.reply_to_message) return

    let replyTo = ctx.message.reply_to_message
    let replyToMessage = replyTo.text

    // must be a reply to a post
    if (!replyToMessage.startsWith('/p ')) return

    // must be in a valid group
    if (!isValidGroup(chat.title)) return

    let data = {
      actor: id,
      boardId: '0x'+sha3_256(chat.id.toString()),
      postHash: chat.id + '_' + messageId.toString(),
      parentHash: chat.id + '_' + replyTo.message_id.toString(),
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
      await ctx.telegram.sendSticker(ctx.chat.id, 'CAADAQADBQADLCEmHesoPkiTdaEtAg', { reply_markup: keyboard, disable_notification: false })
      await ctx.telegram.sendSticker(ctx.chat.id, 'CAADAQADBQADLCEmHesoPkiTdaEtAg')
    } else {
      // send error message
      await ctx.telegram.sendMessage(user.id, result.data.message)
    }
  } catch (error) {
    console.log(error)
  }
})

exports.handler = async (event, context, callback) => {
  /*
   * Test Web3 1.0.0 in lambda
   * Remove them if not needed.
   */
  const Web3 = require('web3')
  const web3 = new Web3()
  console.log("web3 keys: ")
  console.log(Object.keys(web3))
  console.log("web3 version: " + web3['version'])

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
