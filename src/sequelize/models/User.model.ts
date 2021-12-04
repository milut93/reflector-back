import 'reflect-metadata'
import {
  Arg,
  Ctx,
  Field,
  ID,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  UseMiddleware
} from 'type-graphql'
import path from 'path'
import {
  AutoIncrement,
  BeforeCount,
  BeforeCreate,
  BeforeUpdate,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  HasOne,
  IsEmail,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from 'sequelize-typescript'
import * as validations from './validations'
import { CONSTANT_MODEL } from '../constants'
import {
  setUserFilterToWhereSearch,
  throwArgumentValidationError
} from './index'
import {
  createBaseResolver,
  IContextApp,
  TModelResponse,
  TModelResponseSelectAll
} from '../graphql/resolvers/basic'
import {
  ChangePasswordLinkType,
  UploadType,
  UserChangePasswordType,
  UserType
} from '../graphql/types/User'
import {
  merge as _merge,
  omit as _omit,
  random as _random
} from 'lodash'
import bcrypt from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import configuration from '../../../config/index'
import {
  checkJWT,
  checkJWTRefresh
} from '../graphql/middlewares'
import {
  LoginResponseType,
  LoginType
} from '../graphql/types/Login'
import Sequelize, { FindOptions } from 'sequelize'
import * as fs from 'fs'
import { GraphQLUpload } from 'apollo-server-core'

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

    @Field()
    @Column({
      allowNull: false,
      type: DataType.STRING(63)
    })
    nickname: string

    @Field()
    @Column({
      allowNull: false,
      field: 'user_name',
      type: DataType.STRING(63)
    })
    userName: string

    @Field({ nullable: true })
    @Column({
      allowNull: true,
      type: DataType.STRING(256)
    })
    image: string

    @Field()
    @Column({
      allowNull: false,
      field: 'password',
      type: DataType.STRING(127)
    })
    password: string

    @Field()
    @Column({
      allowNull: false,
      type: DataType.TINYINT,
      comment: ' 0 - Writer, 1 - Administrator'
    })
    role: number

    @Field({ nullable: true })
    @Column({
      allowNull: true,
      type: DataType.STRING(512)
    })
    description: string

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

    @Field()
    @UpdatedAt
    @Column({
      field: 'updated_at'
    })
    updatedAt: Date

    static async _validateUser (instance: User, options: any = {}, update: boolean) {
      let user = {} as User
      if (instance.nickname) {
        user = await User.findOne({
          where: {
            nickname: instance.nickname
          }
        })
        user && (!update || user.id !== instance.id) && throwArgumentValidationError('nickname', instance, { message: 'Nickname already used' })
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
        let user = await User.findOne({
          where: {
            userName: data.userName
          },
          ...options
        })
        /** createdBy and updatedBy need to add in userInsertObject */
        const dataPassword = data.password ? data.password : User.generateTempPassword()
        const hash = await bcrypt.hash(dataPassword, 12)

        user = await User.create(_merge({}, {
          password: hash,
          ..._omit(data, ['image'])
        }), options)
        if (!user) {
          throw Error('User not found')
        }
        if (data.image) {
          await User.uploadImage(data.image, ctx)
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
            id
          },
          ...options
        })
        if (!user) {
          throw Error('User not found')
        }
        const newData = data
        if (newData) {
          user = await user.update({
            ..._omit(newData, ['image'])
          }, options)
        }
        if (newData.image) {
          await User.uploadImage(newData.image, ctx)
        }
        await transaction.commit()
        return User.selectOne(user.id, ctx)
      } catch (e) {
        await transaction.rollback()
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
          throwArgumentValidationError('password', {}, { message: 'Password is same with current password.' })
        }
        const hash = await bcrypt.hash(data.password, 12)
        await user.update({
          password: hash
        }, options)
        await transaction.commit()
        return User.selectOne(user.id, ctx)
      } catch (e) {
        transaction.rollback()
        throw (e)
      }
    }

    public static async uploadImage (file: UploadType, ctx: IContextApp) {
      const { createReadStream, filename } = await file
      const pathName = path.resolve(`images/users/${ctx.userId}/${filename}`)
      const dirPath = path.resolve(`images/users/${ctx.userId}/`)
      if (!fs.existsSync(path.resolve('images'))) {
        await fs.mkdirSync(path.resolve('images/'))
      }
      if (!fs.existsSync(path.resolve('images/users'))) {
        await fs.mkdirSync(path.resolve('images/users/'))
      }
      if (!fs.existsSync(dirPath)) {
        await fs.mkdirSync(dirPath)
      }
      const dir = await fs.readdirSync(dirPath)
      if (dir.length !== 0) {
        await fs.unlinkSync(`${dirPath}/${dir[0]}`)
      }
      return new Promise((resolve, reject) => {
        createReadStream()
          .pipe(fs.createWriteStream(pathName))
          .on('finish', () => resolve(`${ctx.userId}/${filename}`))
          .on('error', () => reject())
      })
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
    // @Mutation(returns => String, {name: 'changePasswordByLink'})
    // async changePasswordByLink (@Ctx() ctx: IContextApp,
    //     @Arg('data') data: ChangePasswordLinkType) {

    //     const keyData = /(.*),(.*)/.exec(data.key)
    //     if (!keyData || !Array.isArray(keyData) || keyData.length < 2) {
    //         throw Error('Data are not valid')
    //     }
    //     const user = await User.findByPk(keyData[1])
    //     if (!user || user.status !== 1) {
    //         throw Error('Account not found')
    //     }
    //     const dataToken = jsonwebtoken.verify(keyData[2], user.token)
    //     if (dataToken.accountId !== user.id || dataToken.email !== user.email) {
    //         throw ('Data not valid')
    //     }
    //     const hash = await bcrypt.hash(data.password, 12)
    //     await user.update({
    //         password: hash
    //     })
    //     return 'OK'
    // }

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

      const token = jsonwebtoken.sign({ userId: user.id, nickname: user.nickname },
        configuration.JWT.KEY,
        { expiresIn: configuration.JWT.KEY_EXPIRE })
      const refresh = jsonwebtoken.sign({ userId: user.id, nickname: user.nickname },
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
            { nickname: data.nickname },
            { userName: data.userName }
          ]
        }
      }
      const user = await User.findOne(options)
      if (!user) {
        throwArgumentValidationError('userName', {}, { message: 'User name or password not match' })
      }
      const valid = await bcrypt.compare(data.password, user.password)
      if (!valid) {
        throwArgumentValidationError('userName', {}, { message: 'User name or password not match' })
      }
      const token = jsonwebtoken.sign({ userId: user.id, nickname: user.nickname },
        configuration.JWT.KEY,
        { expiresIn: configuration.JWT.KEY_EXPIRE })
      const refresh = jsonwebtoken.sign({ userId: user.id, nickname: user.nickname },
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

    // @Query(returns => String, {name: 'userPasswordRecovery'})
    // async userRecoverPasswordByEmail (@Arg('email', type => String) email: string) {
    //     const user = await User.findOne({
    //         where: {
    //             email: email
    //         }
    //     })
    //     if (!user) {
    //         throwArgumentValidationError('email', {}, {message: 'Email not exists in system'})
    //     }

    //     if (user.status !== CONSTANT_MODEL.STATUS.ACTIVE) {
    //         throwArgumentValidationError('email', {}, {message: 'Account is not active any more, contact admin!'})
    //     }

    //     await UserResolver.sendEmail(user, 'Change Password', 'change-password')
    //     return 'OK'
    // }

    @UseMiddleware(checkJWT)
    @Mutation(returns => User, { name: 'changePasswordUser' })
    async _changePasswordUser (@Arg('data') data: UserChangePasswordType,
        @Arg('userId', type => Int) userId: number,
        @Ctx() ctx: IContextApp) {
      return User.changePasswordUser(userId, data, ctx)
    }

    @UseMiddleware(checkJWT)
    @Query(returns => String, { nullable: true, name: 'getUserImageUrl' })
    async getUserImageUrl (@Arg('userId', type => Int) userId: number,
        @Ctx() ctx: IContextApp) {
      const pathName = path.resolve(`images/users/${userId}/`)
      if (!fs.existsSync(pathName)) { return '' }
      const files = await fs.readdirSync(pathName)
      if (!files.length) { return '' }
      return `${userId}/${files[0]}`
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => String, { name: 'uploadImage' })
    uploadImage (@Arg('file', () => GraphQLUpload) file: UploadType,
        @Ctx() ctx: IContextApp) {
      return User.uploadImage(file, ctx)
    }
}

