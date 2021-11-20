import 'reflect-metadata'
import {
    Arg,
    Ctx,
    Field,
    ID,
    Int,
    Mutation,
    ObjectType,
    InputType,
    Resolver,
    UseMiddleware
} from 'type-graphql'
import {
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
    BelongsTo,
    ForeignKey
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
import { checkJWT } from '../graphql/middlewares'
import Article from './Article.model'



@InputType({isAbstract: true})
export class ArticlesVideo {

    @Field()
    url: string

    @Field(type=> Int, {nullable: true})
    type: number

    @Field(type=> Int)
    articleId: number
}



@ObjectType()
@Table({
    tableName: 'article_img_video'
})

export default class ArticleImgVideo extends Model {

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
        type: DataType.STRING(128),
    })
    url: string

    @Field({ nullable: true })
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: 0,
        comment: 'photo - 0, video - 1'
    })
    type: number

    @Field(type => Int)
    @ForeignKey(() => Article)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_article_id'
    })
    articleId: number


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


    @Field(type => Article)
    @BelongsTo(() => Article)
    article: Article




    public static async selectOne(id: number, ctx?: IContextApp): Promise<ArticleImgVideo> {
        return ArticleImgVideo.findOne({
            where: {
                id
            }
        })
    }


    public static async deleteOne(id: number, ctx: IContextApp): TModelResponse<ArticleImgVideo> {
        const transaction = await ArticleImgVideo.sequelize.transaction()
        const options = { transaction }

        try {

            const instance = await ArticleImgVideo.findOne({
                where: {
                    id
                }, ...options
            })

            if (!instance) {
                throwArgumentValidationError('id', {}, { message: `Article image video not exists` })
            }


            await instance.destroy(options)
            await transaction.commit()
            return null
        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async updateOne(id: number, data: ArticlesVideo, ctx: IContextApp): TModelResponse<ArticleImgVideo> {
        const transaction = await ArticleImgVideo.sequelize.transaction()
        const options = { transaction }

        try {

            let instance = await ArticleImgVideo.findOne({
                where: {
                    id: id
                },
                ...options
            })

            if (!instance) {
                throwArgumentValidationError('id', data, { message: 'Article image video not exists' })
            }

            await instance.update(data, options)
            await transaction.commit()
            return ArticleImgVideo.selectOne(id, ctx)

        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async insertOne(data: ArticlesVideo, ctx: IContextApp): Promise<ArticleImgVideo> {

        const transaction = await ArticleImgVideo.sequelize.transaction()
        const options = { transaction }

        try {

            const instance = await ArticleImgVideo.create({
                ...data,
            }, options)
            await transaction.commit()
            return ArticleImgVideo.selectOne(instance.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async selectAll(options: any, ctx: IContextApp): TModelResponseSelectAll<ArticleImgVideo> {
        options = setUserFilterToWhereSearch(options, ctx)
        return ArticleImgVideo.findAndCountAll(options)
    }
}

const BaseResolver = createBaseResolver(ArticleImgVideo, {
    updateInputType: ArticlesVideo,
    insertInputType: ArticlesVideo
})

@Resolver()
export class ArticleImgVideoResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Mutation(returns => ArticleImgVideo, { name: 'deleteArticleImgVideo' })
    async _deleteArticleImgVideo(@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
        return ArticleImgVideo.deleteOne(id, ctx)
    }

}

