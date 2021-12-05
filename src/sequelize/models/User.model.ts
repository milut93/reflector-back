import 'reflect-metadata'
import { Arg, Ctx, Field, ID, Int, Mutation, ObjectType, Query, Resolver, UseMiddleware } from 'type-graphql'
import {
  AutoIncrement,
  BeforeCount,
  BeforeCreate,
  BeforeUpdate,
  Column,
  CreatedAt,
  DataType,
  IsEmail,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from 'sequelize-typescript'
import * as validations from './validations'
import { CONSTANT_MODEL } from '../constants'
import { setUserFilterToWhereSearch, throwArgumentValidationError } from './index'
import { createBaseResolver, IContextApp, TModelResponse, TModelResponseSelectAll } from '../graphql/resolvers/basic'
import { ChangePasswordLinkType, UserChangePasswordType, UserType } from '../graphql/types/User'
import { merge as _merge, random as _random } from 'lodash'
import bcrypt from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import configuration from '../../../config/index'
import { checkJWT, checkJWTRefresh } from '../graphql/middlewares'
import { LoginResponseType, LoginType } from '../graphql/types/Login'
import Sequelize, { FindOptions } from 'sequelize'

@ObjectType()
@Table({
  tableName: 'user'
})

export default class User extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.INTEGER.UNSIGNED
    })
      id: number

    @Field({ nullable: true })
    @IsEmail
    @Column({
      allowNull: true,
      type: DataType.STRING(63)
    })
      email: string

    @Field()
    @Column({
      allowNull: false,
      field: 'user_name',
      type: DataType.STRING(63)
    })
      userName: string

    @Field()
    @Column({
      allowNull: false,
      field: 'password',
      type: DataType.STRING(127)
    })
      password: string

    @Column({
      field: 'token',
      type: DataType.STRING(127)
    })
      token: string

    @Field(type => Int)
    @Column({
      allowNull: false,
      type: DataType.TINYINT,
      defaultValue: CONSTANT_MODEL.STATUS.ACTIVE,
      validate: {
        isValid: (value) => validations.isStatusValid.bind(null, 'User')(value)
      }
    })
      status: number

    @Field()
    @CreatedAt
    @Column({
      field: 'created_at'
    })
      createdAt: Date

    @Field({ nullable: true })
    @Column({
      allowNull: true,
      type: DataType.STRING(127),
      field: 'created_by'
    })
      createdBy: string

    @Field()
    @UpdatedAt
    @Column({
      field: 'updated_at'
    })
      updatedAt: Date

    static async _validateUser (instance: User, options: any = {}, update: boolean) {
      let user = {} as User
      if (instance.email) {
        user = await User.findOne({
          where: {
            email: instance.email
          }
        })
        user && (!update || user.id !== instance.id) && throwArgumentValidationError('email', instance, { message: 'Email already used' })
      }

      user = await User.findOne({
        where: {
          userName: instance.userName
        }
      })
      user && (!update || user.id !== instance.id) && throwArgumentValidationError('userName', instance, { message: 'Username already used' })
    }

    /** parts for hooks */
    @BeforeCreate({ name: 'beforeCreateHook' })
    static async _beforeCreateHook (instance: User, options: any) {
      await User._validateUser(instance, options, false)
    }

    @BeforeUpdate({ name: 'beforeUpdateHook' })
    static async _beforeUpdate (instance: User, options: any) {
      await User._validateUser(instance, options, true)
    }

    @BeforeCount({ name: 'beforeCountHook' })
    static async _beforeCountHook (options: any) {
      if (options.include && options.include.length > 0) {
        options.distinct = true
        options.col = options.col || `"${options.name.singular}".id`
      }

      if (options.include && options.include.length > 0) {
        options.include = null
      }
    }

    static generateTempPassword () {
      return Math.random().toString(36)
        .slice(-8)
    }

    static generatePinCode () {
      return _random(1000, 9999)
    }

    public static async selectOne (id: number, ctx?: IContextApp): TModelResponse<User> {
      return User.findOne({
        where: {
          id
        }
      })
    }

    public static async selectAll (options: any, ctx?: IContextApp): TModelResponseSelectAll<User> {
      options = setUserFilterToWhereSearch(options, ctx)
      return User.findAndCountAll(options)
    }

    /** insert user by admin **/
    public static async insertOne (data: UserType, ctx: IContextApp): TModelResponse<User> {
      const transaction = await User.sequelize.transaction()
      if (!transaction) {
        throw Error('Transaction can\'t be open')
      }
      const options = { transaction, validate: true }
      try {
        /** createdBy and updatedBy need to add in userInsertObject */
        const dataPassword = data.password ? data.password : User.generateTempPassword()
        const hash = await bcrypt.hash(dataPassword, 12)

        const user = await User.create(_merge({}, {
          password: hash
        }), options)
        if (!user) {
          throw Error('User not found')
        }
        await transaction.commit()
        return User.selectOne(user.id, ctx)
      } catch (e) {
        transaction.rollback()
        throw (e)
      }
    }

    /** insert user by admin **/
    public static async updateOne (id: number, data: UserType, ctx: IContextApp): TModelResponse<User> {
      const transaction = await User.sequelize.transaction()
      if (!transaction) {
        throw Error('Transaction can\'t be open')
      }
      const options = { transaction, validate: true }
      try {
        let user = await User.findOne({
          where: {
            id: id
          },
          ...options
        })
        if (!user) {
          throw Error('User not found')
        }
        const newData = data
        if (newData) {
          user = await user.update({
            ...newData
          }, options)
        }
        await transaction.commit()
        return User.selectOne(user.id, ctx)
      } catch (e) {
        transaction.rollback()
        throw (e)
      }
    }

    public static async changePasswordUser (userId: number, data: UserChangePasswordType, ctx: IContextApp): TModelResponse<User> {
      const transaction = await User.sequelize.transaction()
      if (!transaction) {
        throw Error('Transaction can\'t be open')
      }
      const options = { transaction, validate: true }
      try {
        const user = await User.findOne({
          where: {
            id: userId
          },
          ...options
        })
        if (!user || user.status !== CONSTANT_MODEL.STATUS.ACTIVE) {
          throw Error('User not found')
        }
        const valid = await bcrypt.compare(data.currentPassword, user.password)
        if (!valid) {
          throwArgumentValidationError('currentPassword', {}, { message: 'Current password not match' })
        }
        if (data.currentPassword === data.password) {
          throwArgumentValidationError('pin', {}, { message: 'Pin is same with current pin.' })
        }
        const hash = await bcrypt.hash(data.password, 12)
        await user.update({
          password: hash
        })
        await transaction.commit()
        return User.selectOne(user.id, ctx)
      } catch (e) {
        transaction.rollback()
        throw (e)
      }
    }
}

const BaseResolver = createBaseResolver(User, {
  insertInputType: UserType,
  updateInputType: UserType
})

@Resolver()
export class UserResolver extends BaseResolver {
    @UseMiddleware(checkJWT)
    @Mutation(returns => String, { name: 'resetPasswordByAdmin' })
  async resetPasswordByAdmin (@Arg('id', type => Int) id: number,
                               @Ctx() ctx: IContextApp) {
    const user = await User.findOne({
      where: {
        id
      }
    })
    if (!user) {
      throw Error('User not found.')
    }
    const password = User.generateTempPassword()
    const hash = await bcrypt.hash(password, 12)
    await user.update({ password: hash })
    return `${password}`
  }

    @UseMiddleware(checkJWT)
    @Mutation(returns => String, { name: 'userChangePassword' })
    async changePassword (@Arg('data') data: UserChangePasswordType,
                         @Ctx() ctx: IContextApp) {
      const user = await User.findByPk(ctx.userId)
      if (!user || user.status !== CONSTANT_MODEL.STATUS.ACTIVE) {
        throw Error('User not found')
      }
      const valid = await bcrypt.compare(data.currentPassword, user.password)
      if (!valid) {
        throwArgumentValidationError('currentPassword', {}, { message: 'Current password not match' })
      }
      const hash = await bcrypt.hash(data.password, 12)
      await user.update({
        password: hash
      })
      return 'OK'
    }

    /** new added */

    /** change password by link from email */
    @Mutation(returns => String, { name: 'changePasswordByLink' })
    async changePasswordByLink (@Ctx() ctx: IContextApp,
                               @Arg('data') data: ChangePasswordLinkType) {
      const keyData = /(.*),(.*)/.exec(data.key)
      if (!keyData || !Array.isArray(keyData) || keyData.length < 2) {
        throw Error('Data are not valid')
      }
      const user = await User.findByPk(keyData[1])
      if (!user || user.status !== 1) {
        throw Error('Account not found')
      }
      const dataToken = jsonwebtoken.verify(keyData[2], user.token)
      if (dataToken.accountId !== user.id || dataToken.email !== user.email) {
        throw Error('Data not valid')
      }
      const hash = await bcrypt.hash(data.password, 12)
      await user.update({
        password: hash
      })
      return 'OK'
    }

    static sendEmail = async (user: any, subject: string, action: string) => {
      /**
         *  this is send email function from basicGQL
         * */
      /* let settings = await Settings.selectOneByKeyType(SETTINGS_APPLICATION_CONFIRM_EMAIL)
            if (settings) {
                let data = JSON.stringify(settings.valueJSON)
                settings = await Settings.selectOneByKeyType(SETTINGS_APPLICATION_DOMAIN)
                if (settings) {
                    const token = jsonwebtoken.sign({accountId: account.id, userId: account.userId, email:account.email, userName: account.userName},
                        account.token,
                        {expiresIn: '30m'})
                    data = data.replace(/href=LINK_TO_REPLACE/,`href="${settings.value}/auth/${action}?key=${account.id},${token}"`)
                    await Email.insertOneIntern(account.email,subject,data)
                }
            }*/
    }

    getNewToken = async (ctx: IContextApp) => {
      const user = await User.findByPk(ctx.jwtData.userId)
      if (!user) {
        throw new Error('User not found in system')
      }

      const token = jsonwebtoken.sign({ userId: user.id, email: user.email },
        configuration.JWT.KEY,
        { expiresIn: configuration.JWT.KEY_EXPIRE })
      const refresh = jsonwebtoken.sign({ userId: user.id, accountEmail: user.email },
        configuration.JWT.KEY_REFRESH,
        { expiresIn: configuration.JWT.KEY_REFRESH_EXPIRE })

      const decod = jsonwebtoken.decode(token)
      return {
        token,
        refresh,
        refreshTime: (decod.exp - decod.iat)
      }
    }

    @UseMiddleware(checkJWT)
    @Query(returns => LoginResponseType, { name: 'triggerToken' })
    async triggerToken (@Ctx() ctx: IContextApp) {
      return this.getNewToken(ctx)
    }

    @UseMiddleware(checkJWTRefresh)
    @Query(returns => LoginResponseType, { name: 'refreshToken' })
    async refreshToken (@Ctx() ctx: IContextApp) {
      return this.getNewToken(ctx)
    }

    @Query(returns => LoginResponseType, { name: 'login' })
    async login (@Arg('data') data: LoginType,
                @Ctx() ctx: IContextApp) {
      /** First thy to find user by user name, we can check before this is userName valid email*/
      const options: FindOptions = {
        where: {
          [Sequelize.Op.or]: [
            { email: data.email },
            { userName: data.userName }
          ]
        }
      }
      const user = await User.findOne(options)
      if (!user) {
        throwArgumentValidationError('email', {}, { message: 'User name or password not match' })
      }
      const valid = await bcrypt.compare(data.password, user.password)
      if (!valid) {
        throwArgumentValidationError('email', {}, { message: 'User name or password not match' })
      }
      const token = jsonwebtoken.sign({ userId: user.id, userEmail: user.email },
        configuration.JWT.KEY,
        { expiresIn: configuration.JWT.KEY_EXPIRE })
      const refresh = jsonwebtoken.sign({ userId: user.id, userEmail: user.email },
        configuration.JWT.KEY_REFRESH,
        { expiresIn: configuration.JWT.KEY_REFRESH_EXPIRE })
      const decod = jsonwebtoken.decode(token)
      return {
        token,
        refresh,
        refreshTime: (decod.exp - decod.iat)
      }
    }

    @UseMiddleware(checkJWT)
    @Query(returns => User, { name: 'logged' })
    async userLogged (@Ctx() ctx: IContextApp) {
      return User.selectOne(ctx.userId, ctx)
    }

    @Query(returns => String, { name: 'userPasswordRecovery' })
    async userRecoverPasswordByEmail (@Arg('email', type => String) email: string) {
      const user = await User.findOne({
        where: {
          email: email
        }
      })
      if (!user) {
        throwArgumentValidationError('email', {}, { message: 'Email not exists in system' })
      }

      if (user.status !== CONSTANT_MODEL.STATUS.ACTIVE) {
        throwArgumentValidationError('email', {}, { message: 'Account is not active any more, contact admin!' })
      }

      await UserResolver.sendEmail(user, 'Change Password', 'change-password')
      return 'OK'
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => User, { name: 'changePasswordUser' })
    async _changePasswordUser (@Arg('data') data: UserChangePasswordType,
                              @Arg('userId', type => Int) userId: number,
                              @Ctx() ctx: IContextApp) {
      return User.changePasswordUser(userId, data, ctx)
    }
}

