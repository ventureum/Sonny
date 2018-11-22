const jwt = require('jsonwebtoken')

const SUPER_KEY_PUBLIC = `-----BEGIN PUBLIC KEY-----\n${process.env.SUPER_KEY_PUBLIC}\n-----END PUBLIC KEY-----`

function generatePolicy (principal, effect, methodArn) {
  let tmp = methodArn.split(':')
  const apiGatewayArnTmp = tmp[5].split('/')
  const awsAccountId = tmp[4]
  const apiRegion = tmp[3]
  const apiID = apiGatewayArnTmp[0]
  const apiStage = apiGatewayArnTmp[1]
  const apiVerb = apiGatewayArnTmp[2]
  const pathArray = apiGatewayArnTmp.slice(3)
  let path = ''
  pathArray.forEach(resource => {
    path += `/${resource}`
  })
  const policy = {
    'principalId': principal,
    'policyDocument': {
      'Version': '2012-10-17',
      'Statement': [
        {
          'Effect': effect,
          'Action': 'execute-api:Invoke',
          'Resource': `arn:aws:execute-api:${apiRegion}:${awsAccountId}:${apiID}/${apiStage}/${apiVerb}${path}`
        }
      ]
    }
  }
  console.log('return policy:', policy)
  return policy
}

exports.handler = async (event, context, callback) => {
  const { authorizationToken, methodArn } = event
  try {
    const superJWT = await jwt.verify(authorizationToken, SUPER_KEY_PUBLIC, { algorithms: ['RS256'] })
    console.log('superJWT:', superJWT)
    context.succeed(generatePolicy(`superUser_${superJWT.data.actor}`, 'Allow', methodArn))
  } catch (e) {
    context.succeed(generatePolicy('badUser', 'Deny', methodArn))
  }
}
