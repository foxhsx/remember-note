import jwt from 'jsonwebtoken'
import { Next, ParameterizedContext } from 'koa'
import Router from 'koa-router'
import cache from './cache.js'

const secret = 'cecil_study_always_@$%@'
// jwt 默认算法 SHA256
function genToken(name: string) {
  const token = jwt.sign(
    {
      data: 'createToken',
      name,
    },
    secret,
  )
  return token
}

// jwt 验证 token，解密的默认算法是 HS384
async function verifyToken(
  ctx: ParameterizedContext<
    unknown,
    Router.IRouterParamContext<unknown, Record<string, unknown>>,
    unknown
  >,
  next: Next
) {
  const authString = ctx.header.authorization
  try {
    const token = authString?.split(' ')[1] || ''
    const payload = await jwt.verify(token.trim(), secret, {
      algorithms: ['HS256'],
    })

    let data: string;
    let name = '';

    if (typeof payload === 'string') {
      const jsonPayload = JSON.parse(payload)
      data = jsonPayload.data
      name = jsonPayload.name
    } else {
      data = payload.data
      name = payload.name
    }

    if (name && !cache.getCache('fromUser')) {
      cache.setCache('fromUser', name)
    }
    if (data !== 'createToken') {
      ctx.throw(401, '没有权限')
    }
    await next()
  } catch (error) {
    if (error) {
      ctx.throw(401, '没有权限')
    }
    await next()
  }
}

export default {
  genToken,
  verifyToken
}
