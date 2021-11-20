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
import { omit as _omit } from 'lodash'
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
import { ArticlesType } from '../graphql/types/Category'
import { checkJWT } from '../graphql/middlewares'
import Category from './Category.model'
import User from './User.model'

@ObjectType()
@Table({
    tableName: 'articles'
})

export default class Article extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED,
    })
    id: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(512),
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
        field: 'fk_user_id'
    })
    userId: number


    @Field()
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
        defaultValue: 0
    })
    views: number

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
    @BelongsTo(() => User)
    user: User


    @Field(type => Category)
    @BelongsTo(() => Category)
    category: Category

    public static async selectOne(id: number, ctx?: IContextApp): TModelResponse<Article> {
        return Article.findOne({
            where: {
                id
            },
            include: [
                {
                    model: Category,
                    as: 'category',
                    required: true
                },
                {
                    model: User,
                    as: 'user',
                    required: true
                }
            ]
        })
    }


    public static async deleteOne(id: number, ctx: IContextApp): TModelResponse<Article> {
        const transaction = await Article.sequelize.transaction()
        const options = { transaction }

        try {

            const instance = await Article.findOne({
                where: {
                    id
                }, ...options
            })

            if (!instance) {
                throwArgumentValidationError('id', {}, { message: 'Article not exists' })
            }

            await instance.destroy(options)
            await transaction.commit()
            return null
        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async updateOne (id: number, data: ArticlesType, ctx: IContextApp): TModelResponse<Article> {
        const transaction = await Article.sequelize.transaction()
        const options = {transaction}

        try {

            let instance = await Article.findOne({
                where: {
                    id: id
                },
                ...options
            })

            if (!instance) {
                throwArgumentValidationError('id', data, {message: 'Article not exists'})
            }

            await instance.update(data, options)
            await transaction.commit()
            return Article.selectOne(id, ctx)

        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async insertOne (data: ArticlesType, ctx: IContextApp): Promise<Article> {

        const transaction = await Article.sequelize.transaction()
        const options = {transaction}

        try {

            const instance = await Article.create({
                ...data,
            }, options)
            await transaction.commit()
            return Article.selectOne(instance.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async selectAll(options: any, ctx: IContextApp): TModelResponseSelectAll<Article> {
        options = setUserFilterToWhereSearch(options, ctx)
        return Article.findAndCountAll(options)
    }


    public static async updateView(id:number, ctx: IContextApp): TModelResponse<Article>{
        try {
            const article = await Article.selectOne(id, ctx)
            if(!article) {
                throw Error('Article not exist in database')
            }
            await article.update({views: article.views + 1})
            return Article.selectOne(id,ctx)
        }catch(e){
            throw e
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
    @Mutation(returns => Article, { name: 'deleteArticle' })
    async _deleteArticle(@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
        return Article.deleteOne(id, ctx)
    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => Article, { name: 'updateArticleView' })
    async _updateArticleView(@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
        return Article.updateView(id, ctx)
    }


}

