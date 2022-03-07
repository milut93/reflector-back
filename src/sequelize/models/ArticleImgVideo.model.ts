import 'reflect-metadata'
import {Arg, Ctx, Field, ID, InputType, Int, Mutation, ObjectType, Resolver, UseMiddleware} from 'type-graphql'
import {
    AutoIncrement,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
} from 'sequelize-typescript'
import {setUserFilterToWhereSearch, throwArgumentValidationError} from './index'
import {createBaseResolver, IContextApp, TModelResponse, TModelResponseSelectAll} from '../graphql/resolvers/basic'
import {checkJWT} from '../graphql/middlewares'
import Article from './Article.model'
import {UploadType} from "../graphql/types/User";
import path from "path";
import fs from "fs";
import {GraphQLUpload} from "apollo-server-express";
import {omit as _omit} from 'lodash'

@InputType({isAbstract: true})
export class ArticlesVideo {

    @Field(type => GraphQLUpload, {nullable: true})
    image: UploadType

    @Field(type => Int)
    articleId: number
}

@ObjectType()
@Table({
    tableName: 'article_img_video',
    charset: 'utf8',
    collate: 'utf8_general_ci'
})

export default class ArticleImgVideo extends Model {
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
        type: DataType.STRING(128)
    })
    url: string

    @Field({nullable: true})
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
        const options = {transaction}

        try {
            const instance = await ArticleImgVideo.findOne({
                where: {
                    id
                },
                ...options
            })

            if (!instance) {
                throwArgumentValidationError('id', {}, {message: 'Article image video not exists'})
            }

            await instance.destroy(options)
            await transaction.commit()
            return null
        } catch (e) {
            transaction.rollback()
            throw e
        }
    }

    public static async updateOne(data: ArticlesVideo, ctx: IContextApp, options = {}) {
        let instance = await ArticleImgVideo.findOne({
            where: {
                articleId: data.articleId
            },
            ...options
        })

        if (!instance) {
            throwArgumentValidationError('id', data, {message: 'Article image video not exists'})
        }
        let _data = {
            ..._omit(data, ['image', 'articleId'])
        }
        if (data.image) {
            let file = await ArticleImgVideo.uploadImage(data.articleId, data.image, ctx) as string
            file = file.replace(/\s+/gm, '-')
            const url = `/images/articles/${file}`

            await instance.update({
                ..._data,
                url,
                type: 0
            }, options)
        }
        await instance.update(data, options)
    }

    public static async insertOne(data: ArticlesVideo, ctx: IContextApp, options = {}) {
        let file = await ArticleImgVideo.uploadImage(data.articleId, data.image, ctx)  as string
        file = file.replace(/\s+/gm, '-')
        const url = `/images/articles/${file}`
        await ArticleImgVideo.create({
            articleId: Number(data.articleId),
            url,
            type: 0
        }, options)
    }

    public static async selectAll(options: any, ctx: IContextApp): TModelResponseSelectAll<ArticleImgVideo> {
        options = setUserFilterToWhereSearch(options, ctx)
        return ArticleImgVideo.findAndCountAll(options)
    }


    public static async uploadImage(articleId: number, file: UploadType, ctx: IContextApp) {
        const {createReadStream, filename} = await file
        let _filename = filename.replace(/\s+/gm,'-')
        const pathName = path.resolve(`images/articles/${articleId}/${_filename}`)
        const dirPath = path.resolve(`images/articles/${articleId}/`)
        if (!fs.existsSync(path.resolve('images'))) {
            await fs.mkdirSync(path.resolve('images/'))
        }
        if (!fs.existsSync(path.resolve('images/articles/'))) {
            await fs.mkdirSync(path.resolve('images/articles/'))
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
                .on('finish', () => resolve(`${articleId}/${_filename}`))
                // eslint-disable-next-line prefer-promise-reject-errors
                .on('error', () => reject())
        })
    }
}

const BaseResolver = createBaseResolver(ArticleImgVideo, {
    updateInputType: ArticlesVideo,
    insertInputType: ArticlesVideo
})

@Resolver()
export class ArticleImgVideoResolver extends BaseResolver {
    @UseMiddleware(checkJWT)
    @Mutation(returns => ArticleImgVideo, {name: 'deleteArticleImgVideo'})
    async _deleteArticleImgVideo(@Arg('id', type => Int) id: number,
                                 @Ctx() ctx: IContextApp) {
        return ArticleImgVideo.deleteOne(id, ctx)
    }
}

