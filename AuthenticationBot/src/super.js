var jwt = require('jsonwebtoken')

const SUPER_KEY_PRIVATE = `-----BEGIN RSA PRIVATE KEY-----\n${process.env.SUPER_KEY_PRIVATE}\n-----END RSA PRIVATE KEY-----`

async function generateSuperToken () {
  console.log(SUPER_KEY_PRIVATE)
  const token = await jwt.sign({
    data: {
      actor: 'Tim_super_bot_token',
      telegramId: '110',
      username: 'Tim'
    }
  },
  SUPER_KEY_PRIVATE,
  { algorithm: 'RS256' }
  )
  console.log('super JWT generated:', token)
}

generateSuperToken()
