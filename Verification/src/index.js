const jwt = require('jsonwebtoken')

const JWTRS256_PUBLIC = `-----BEGIN PUBLIC KEY-----\n${process.env.JWTRS256_PUBLIC}\n-----END PUBLIC KEY-----`

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
  return {
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
}

exports.handler = async (event, context, callback) => {
  const { authorizationToken, methodArn } = event
  try {
    const verifiedJWT = await jwt.verify(authorizationToken, JWTRS256_PUBLIC, { algorithms: ['RS256'] })
    console.log('verifiedJWT:', verifiedJWT)
    context.succeed(generatePolicy(verifiedJWT.data.actor, 'Allow', methodArn))
  } catch (e) {
    context.succeed(generatePolicy('badUser', 'Deny', methodArn))
  }
}
