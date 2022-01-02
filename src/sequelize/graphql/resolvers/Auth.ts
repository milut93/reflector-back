import { Arg, Ctx, Query, Resolver } from 'type-graphql'
import { throwArgumentValidationError, User } from '../../models'

import bcrypt from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import configuration from '../../../../config'
import { IContextApp } from './basic'
import { AuthUserLogin, LoginResponse } from '../types/Auth'

@Resolver()
export default class AuthResolver {
    private static createTempToken = () => {
      // eslint-disable-next-line array-callback-return
      const token = [...new Array(127)].map(x => {
        let char = Math.floor((Math.random() * (122 - 48))) + 48
        while (char) {
          if ((char >= 48 && char <= 57) || (char >= 65 && char <= 90) || (char >= 97 && char <= 122)) {
            return char
          }
          char = Math.floor((Math.random() * (122 - 48))) + 48
        }
      }).map(x => String.fromCharCode(x))
        .join('')

      return token
    }

    @Query(returns => LoginResponse, { name: 'authLogin' })
    async authLogin (@Arg('data') data: AuthUserLogin,
                    @Ctx() ctx: IContextApp) {
      /**   First thy to find user by user name, we can check before this is userName valid email  */
      const user = await User.findOne({
        where: {
          userName: data.userName
        }
      })

      !user && throwArgumentValidationError('userName', {}, { message: 'Korisničko ime ili lozinka se ne podudaraju' })
      const valid = await bcrypt.compare(data.password, user.password)
      !valid && throwArgumentValidationError('password', {}, { message: 'Korisničko ime ili lozinka se ne podudaraju' })
      createRefreshTokenCookie(user, ctx.res)
      return {
        token: createAccessToken(user),
        user
      }
    }

  // @Mutation(returns => String, { name: 'authRegistration' })
  // async authRegistration(@Ctx() ctx: IContextApp,
  //     @Arg('data') data: AuthUserRegister) {

  //     const user = await User.findOne({
  //         where: {
  //             email: data.email,
  //         }
  //     })
  //     if (user) {
  //         if (data.userName !== data.userName) {
  //             throwArgumentValidationError('userName', data, { message: 'User Name  already exists' })
  //         }
  //         if (user.status !== 0) {
  //             throw new Error('User account is already active !')
  //         }
  //         const token = AuthResolver.createTempToken()
  //         await user.update({
  //             token
  //         })
  //         // sendEmailRegistration(user, token, 'Verification', 'confirm-registration')
  //         throw new Error('User account exists, check email to confirm !')
  //     }

  //     const transaction = await User.sequelize.transaction()
  //     if (!transaction) {
  //         throw Error('Transaction can\'t be open')
  //     }
  //     const options = { transaction, validate: true }
  //     const token = AuthResolver.createTempToken()

  //     try {

  //         const hash = await bcrypt.hash(data.password, 12)
  //         await User.create({
  //             password: hash,
  //             userName: data.userName,
  //             email: data.email,
  //             token: token,
  //             status: CONSTANT_MODEL.USER_STATUS.REQUESTED
  //         }, options)
  //         transaction.commit()
  //     } catch (e) {
  //         transaction.rollback()
  //         throw (e)
  //     }
  //     return 'OK'
  // }

  // @Mutation(returns => String, { name: 'authConfirmation' })
  // async confirmation(@Arg('key', type => String) key: string,) {

  //     const data = /(.*),(.*)/.exec(key)
  //     if (!data || !Array.isArray(data) || data.length < 2) {
  //         throw Error('Data are not valid')
  //     }
  //     const user = await User.findByPk(data[1])
  //     if (!user || user.status !== CONSTANT_MODEL.USER_STATUS.REQUESTED) {
  //         throw Error('Account not found')
  //     }
  //     const dataToken = jsonwebtoken.verify(data[2], user.token)
  //     if (dataToken.userId !== user.id || dataToken.email !== user.email) {
  //         throw ('Data not valid')
  //     }

  //     /** here active but should be  approved  and then to active by admin*/
  //     await user.update({
  //         status: CONSTANT_MODEL.USER_STATUS.ACTIVE
  //     })

  //     return 'OK'
  // }

  // @Mutation(returns => String, { name: 'authPasswordChange' })
  // async changePassword(@Ctx() ctx: IContextApp,
  //     @Arg('data') data: AuthChangePassword) {

  //     const keyData = /(.*),(.*)/.exec(data.key)
  //     if (!keyData || !Array.isArray(keyData) || keyData.length < 2) {
  //         throw Error('Data are not valid')
  //     }
  //     const user = await User.findByPk(keyData[1])
  //     if (!user || user.status !== 1) {
  //         throw Error('Account not found')
  //     }
  //     const dataToken = jsonwebtoken.verify(keyData[2], user.token)
  //     if (dataToken.userId !== user.id || dataToken.email !== user.email) {
  //         throw ('Data not valid')
  //     }

  //     const hash = await bcrypt.hash(data.password, 12)
  //     await user.update({
  //         password: hash
  //     })
  //     return 'OK'
  // }

  // @Mutation(returns => String, { name: 'authPasswordRecovery' })
  // async accountRecoverPasswordByEmail(@Arg('email', type => String) email: string) {
  //     const user = await User.findOne({
  //         where: {
  //             email: email
  //         }
  //     })
  //     if (!user) {
  //         throwArgumentValidationError('email', {}, { message: 'Email not exists in system' })
  //     }

  //     if (user.status !== CONSTANT_MODEL.USER_STATUS.ACTIVE) {
  //         throwArgumentValidationError('email', {}, { message: 'Account is not active any more, contact admin!' })
  //     }

  //     const token = AuthResolver.createTempToken()
  //     await user.update({
  //         token
  //     })

  //     return 'OK'
  // }

  /*
  /!** Returns current logged account *!/

      @UseMiddleware(checkJWT)
      @Query(returns => Account, {name: 'authLogged'})
      async accountLogged(@Ctx() ctx: IContextApp) {
          return Account.selectOne(ctx.accountId, ctx)
      } */
}

export const createAccessToken = (user: User) => {
  return jsonwebtoken.sign({ userId: user.id },
    configuration.JWT.KEY,
    { expiresIn: configuration.JWT.KEY_EXPIRE })
}

export const createRefreshTokenCookie = (user: User, resp: any) => {
  const token = jsonwebtoken.sign({ userId: user.id },
    configuration.JWT.KEY_REFRESH,
    { expiresIn: configuration.JWT.KEY_REFRESH_EXPIRE })
  resp.cookie('refresh-token', token, {
    httpOnly: true,
    path: '/refresh_token'
  })
  console.log(token, resp.cookie)
}

export const verifyRefreshToken = (token: string) => {
  const key = configuration.JWT.KEY_REFRESH
  return jsonwebtoken.verify(token, key)
}
