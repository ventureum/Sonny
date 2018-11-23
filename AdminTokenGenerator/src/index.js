const jwt = require('jsonwebtoken')
const util = require('util')
const Knex = require('knex')
const { JWTRS256_PRIVATE, DB_NAME_PREFIX, STAGE, DB_USER, DB_PASSWORD, DB_HOST_POSTFIX } = process.env
const DATA_BASE = DB_NAME_PREFIX + STAGE
const PORT = 5432
const Config = {
  client: 'pg',
  connection: {
    host: `${DATA_BASE}${DB_HOST_POSTFIX}`,
    port: PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DATA_BASE
  }
}
const privateKey = `-----BEGIN RSA PRIVATE KEY-----\n${JWTRS256_PRIVATE}\n-----END RSA PRIVATE KEY-----`

async function generateAdminToken (actor, username) {
  // generate access token
  try {
    const token = await jwt.sign({
      data: {
        actor: actor,
        username: username
      }
    },
    privateKey,
    { algorithm: 'RS256' }
    )
    console.log('super JWT generated:', token)

    const knex = Knex(Config)
    // build insert query
    const insert = knex('actor_profile_records')
      .insert({
        actor,
        actor_type: 'ADMIN',
        username,
        actor_profile_status: 'ACTIVATED',
        photo_url: '',
        telegram_id: '',
        phone_number: '',
        private_key: token
      })
      .toString()
    // build update query
    const update = knex('actor_profile_records')
      .update({
        actor_type: 'ADMIN',
        actor_profile_status: 'ACTIVATED',
        private_key: token
      })
      .whereRaw(`actor_profile_records.actor = '${actor}'`)
    // build upsert query
    const query = util.format(
      '%s ON CONFLICT (actor) DO UPDATE SET %s',
      insert.toString(),
      update.toString().replace(/^update\s.*\sset\s/i, '')
    )

    await knex.transaction(trx => {
      return trx.raw(query)
    })

    knex.destroy()
    return token
  } catch (e) {
    console.log(e)
    throw e
  }
}

exports.handler = async (event, context, callback) => {
  const { actor, username } = event
  if (actor === undefined || username === undefined) {
    return {
      ok: false,
      errorMessage: 'Please provide a valid actor/username'
    }
  }
  try {
    const accessToken = await generateAdminToken(actor, username)
    return {
      ok: true,
      accessToken: accessToken
    }
  } catch (e) {
    return {
      ok: false,
      errorMessage: 'Update database error'
    }
  }
}
