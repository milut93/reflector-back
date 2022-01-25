import 'reflect-metadata'
import { Arg, Ctx, Field, ID, Int, Mutation, ObjectType, Resolver, UseMiddleware } from 'type-graphql'
import {
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from 'sequelize-typescript'
import { setUserFilterToWhereSearch, throwArgumentValidationError } from './index'
import { createBaseResolver, IContextApp, TModelResponse, TModelResponseSelectAll } from '../graphql/resolvers/basic'
import { ArticlesType } from '../graphql/types/Category'
import { checkJWT } from '../graphql/middlewares'
import Category from './Category.model'
import User from './User.model'
import ArticleImgVideo from './ArticleImgVideo.model'
import {omit as _omit} from 'lodash'
import path from "path";
import fs from "fs";

@ObjectType()
@Table({
  tableName: 'articles',
  charset: 'utf8',
  collate: 'utf8_general_ci'
})

export default class Article extends Model {
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
      type: DataType.STRING(512)
    })
    header: string

    @Field()
    @Column({
      allowNull: false,
      type: DataType.TEXT
    })
    content: string

    @Field(type => Int)
    @ForeignKey(() => Category)
    @Column({
      allowNull: false,
      type: DataType.INTEGER.UNSIGNED,
      field: 'fk_category_id'
    })
    categoryId: number

    @Field(type => Int)
    @ForeignKey(() => User)
    @Column({
      allowNull: false,
      type: DataType.INTEGER.UNSIGNED,
      field: 'fk_user_id',
    })
    userId: number

    @Field()
    @Column({
      allowNull: true,
      type: DataType.INTEGER,
      defaultValue: 0
    })
    views: number

    @Field({nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: 0,
        field: 'use_link',
    })
    useLink: number

    @Field({nullable: true})
    @Column({
        allowNull: false,
        type: DataType.STRING(512)
    })
    link: string

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

    @Field(type => User)
    @BelongsTo(() => User, {onDelete: 'CASCADE'})
    user: User

    @Field(type => Category)
    @BelongsTo(() => Category)
    category: Category

    @Field(type => [ArticleImgVideo], { nullable: true })
    @HasMany(() => ArticleImgVideo)
    articleImgVideo: ArticleImgVideo[]

    public static async selectOne (id: number, ctx?: IContextApp): TModelResponse<Article> {
      return Article.findOne({
        where: {
          id
        },
        include: [
          {
            model: Category,
            as: 'category',
            required: false
          },
          {
            model: User,
            as: 'user',
            required: true
          },
          {
            model: ArticleImgVideo,
            as: 'articleImgVideo',
            required: false
          }
        ]
      })
    }

    public static async deleteOne (id: number, ctx: IContextApp): Promise<string> {
      const transaction = await Article.sequelize.transaction()
      const options = { transaction }

      try {
        const instance = await Article.findOne({
          where: {
            id
          },
          ...options
        })

        if (!instance) {
          throwArgumentValidationError('id', {}, { message: 'Article not exists' })
        }

        await instance.destroy(options)
        await Article.unlinkArticleImage(id)
        await transaction.commit()
        return 'OK'
      } catch (e) {
        transaction.rollback()
        throw e
      }
    }

    public static async updateOne (id: number, data: ArticlesType, ctx: IContextApp): TModelResponse<Article> {
      const transaction = await Article.sequelize.transaction()
      const options = { transaction }

      try {
        const instance = await Article.findOne({
          where: {
            id: id
          },
          ...options
        })

        if (!instance) {
          throwArgumentValidationError('id', data, { message: 'Article not exists' })
        }
        await instance.update({
            ..._omit(data,['image'])
        }, options)
        if(data.image) {
            await ArticleImgVideo.updateOne({
                articleId: instance.id,
                image:data.image
            },ctx,options)
        }
        await transaction.commit()
        return Article.selectOne(id, ctx)
      } catch (e) {
        transaction.rollback()
        throw e
      }
    }

    public static async insertOne (data: ArticlesType, ctx: IContextApp): Promise<Article> {
      const transaction = await Article.sequelize.transaction()
      const options = { transaction }

      try {
        const instance = await Article.create({
          ..._omit(data,['image']),
            userId: ctx.userId
        }, options)
        if(data.image) {
            await ArticleImgVideo.insertOne({
                articleId: instance.id,
                image:data.image
            }, ctx,options)
        }
        await transaction.commit()
        return Article.selectOne(instance.id, ctx)
      } catch (e) {
        transaction.rollback()
        throw e
      }
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<Article> {
      options = setUserFilterToWhereSearch(options, ctx)
      return Article.findAndCountAll(options)
    }

    public static async updateView (id: number, ctx: IContextApp): TModelResponse<Article> {
      // eslint-disable-next-line no-useless-catch
      try {
        const article = await Article.selectOne(id, ctx)
        if (!article) {
          throw Error('Article not exist in database')
        }
        await article.update({ views: article.views + 1 })
        return Article.selectOne(id, ctx)
      } catch (e) {
        throw e
      }
    }

    public static async unlinkArticleImage (articleId: number) {
        const dirPath = path.resolve(`images/articles/${articleId}/`)
        if (!fs.existsSync(path.resolve('images'))) {
            throwArgumentValidationError('id', {}, { message: 'Article image delete failed' })
        }
        if (!fs.existsSync(path.resolve('images/articles'))) {
            throwArgumentValidationError('id', {}, { message: 'Article image delete failed' })
        }
        if (!fs.existsSync(dirPath)) {
            throwArgumentValidationError('id', {}, { message: 'Article image delete failed' })
        }
        const dir = await fs.readdirSync(dirPath)
        if (dir.length !== 0) {
           const promise = dir.map(d=> fs.unlinkSync(`${dirPath}/${d}`))
            await Promise.all(promise)
        }
        if (fs.existsSync(dirPath)) {
            await fs.rmdirSync(dirPath)
        }
    }
}

const BaseResolver = createBaseResolver(Article, {
  updateInputType: ArticlesType,
  insertInputType: ArticlesType
})

@Resolver()
export class ArticleResolver extends BaseResolver {
    @UseMiddleware(checkJWT)
    @Mutation(returns => String, { name: 'deleteArticle' })
  async _deleteArticle (@Arg('id', type => Int) id: number,
                         @Ctx() ctx: IContextApp) {
    return Article.deleteOne(id, ctx)
  }

    @UseMiddleware(checkJWT)
    @Mutation(returns => Article, { name: 'updateArticleView' })
    async _updateArticleView (@Arg('id', type => Int) id: number,
                             @Ctx() ctx: IContextApp) {
      return Article.updateView(id, ctx)
    }
}

