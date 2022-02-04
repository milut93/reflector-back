import 'reflect-metadata'
import { MiddlewareFn } from 'type-graphql'
import { get } from 'lodash'
import configuration from '../../../config/index'
import jsonwebtoken from 'jsonwebtoken'
import { IContextApp } from './resolvers/basic'

export const updateModelBefore: MiddlewareFn = async ({ root, args, context, info }, next) => {
  const { id, data } = args
  data.id = id
  return next()
}

/** check JWT for standard KEY */

const createTestData = () => {
  return {
    userId: 1
  }
}

const _checkJWT = (key, tokenVar): MiddlewareFn<IContextApp> => async ({ root, args, context, info }, next) => {
  const token = get(context, tokenVar) || ''

  if (configuration.TEST) {
    context.jwtData = { ...createTestData() }
    Object.defineProperty(context, 'userId', {
      get () {
        return 1
      }
    })
    return next()
  }

  try {
    const data = jsonwebtoken.verify(token, key)
    context.jwtData = { ...data }
    Object.defineProperty(context, 'userId', {
      get () {
        return context.jwtData.userId
      }
    })
  } catch (err) {
    return Error('JWT validation failed')
  }
  return next()
}

const mobileApp = (tokenVar):MiddlewareFn<IContextApp> => async ({root, args, context, info }, next) => {

}

export const checkJWT: MiddlewareFn<IContextApp> = _checkJWT(configuration.JWT.KEY, 'accessToken')
export const checkJWTRefresh: MiddlewareFn<IContextApp> = _checkJWT(configuration.JWT.KEY_REFRESH, 'refreshToken')

