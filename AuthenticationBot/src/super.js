var jwt = require('jsonwebtoken')

const SUPER_KEY_PRIVATE = `-----BEGIN RSA PRIVATE KEY-----\n${process.env.SUPER_KEY_PRIVATE}\n-----END RSA PRIVATE KEY-----`

async function generateSuperToken () {
  const token = await jwt.sign({
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30), // expires in 30 days
    data: {
      actor: 'vincentSuperToken',
      superId: '003',
      username: 'Vincent'
    }
  },
  SUPER_KEY_PRIVATE,
  { algorithm: 'RS256' }
  )
  console.log('super JWT generated:', token)
}

generateSuperToken()
