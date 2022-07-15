import 'module-alias/register'
import express from 'express'
import bodyParser from 'body-parser'
import configuration from '../config/index'
import {initSequelize} from './sequelize/sequelize'
import cookieParser from 'cookie-parser'
import path from 'path'
import Article from "./sequelize/models/Article.model";
import Category from "./sequelize/models/Category.model";
import User from "./sequelize/models/User.model";
import ArticleImgVideo from "./sequelize/models/ArticleImgVideo.model";
import authMobile from "./mobile/middleware";
import fs from "fs";
import {requestOptions} from "./sequelize/graphql/FilterRequest";
import {modelSTATUS} from "./sequelize/models/validations";
import {cloneDeep, omit} from "lodash";

const app = express()
app.use(bodyParser.json({limit: '50mb'}))
app.use(cookieParser())

const dir = path.join(__dirname, '../images')

app.use(express.static(dir))

app.get('/images/users/:id', authMobile, async (req, resp) => {
    const dirPath = path.join(__dirname, `../${req.originalUrl}`)
    const dir = fs.readdirSync(dirPath)
    if (!dir || !dir.length) throw Error('Not exists user image')
    const _img = `${dirPath}/${dir[0]}`
    resp.sendFile(_img)
});

app.get('/images/articles/:id/:file', authMobile, async (req, resp) => {
    resp.sendFile(path.join(__dirname, `../${req.originalUrl}`))
});

app.use((error, req, res, next) => {
    const status = error.statusCode || 500;
    const message = error.message
    const data = error.data
    res.status(status).send({message: message, result: data})
})

app.post('/articles', authMobile, async (req, resp, next) => {
    try {
        const _data = req.body
        const rrs = {
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
        }
        const options = requestOptions(_data)
        const opp = {
            ...options,
            ...rrs,
        }
        const promises = await Promise.all([Article.findAll(opp), Article.count(cloneDeep(opp))])
        resp.status(200).json({
            data: {
                total: promises[1] || 0,
                rows: promises[0]
            }
        })
        return
    } catch (e) {
        next(e)
    }
});


app.get('/users', authMobile, async (req, resp, next) => {
    try {
        const users = await User.findAll({
            where: {
                status: modelSTATUS.ACTIVE
            }
        })
        resp.status(200).json({
            data: users
        })
        return
    } catch (e) {
        next(e)
    }
});


app.get('/user/:id', authMobile, async (req, resp, next) => {
    try {
        const id = req.params.id;
        if (!id) {
            resp.status(400).send('Bad request');
            return
        }
        const user = await User.findOne({
            where: {
                id
            }
        })
        if (!user) {
            resp.status(400).send('User not exists');
            return
        }
        resp.status(200).json({
            data: user
        })
        return
    } catch (e) {
        next(e)
    }
});

app.get('/article/:id', authMobile, async (req, resp, next) => {
    try {
        const id = req.params.id;
        if (!id) {
            resp.status(400).send('Bad request');
            return
        }
        const article = await Article.findOne({
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
        if (!article) {
            resp.status(400).send('Article not exists');
            return
        }
        resp.status(200).json({
            data: article
        })
        return
    } catch (e) {
        next(e)
    }
});


app.post('/articles-category', authMobile, async (req, resp, next) => {
    try {
        const _data = req.body
        const categoryId = _data?.categoryId
        if (!categoryId) {
            resp.status(400).send('Bad request');
            return
        }
        const rrs = {
            where: {
                categoryId
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
        }
        const opt = omit(_data, ['categoryId']) as any
        const options = requestOptions(opt)
        const opp = {
            ...options,
            ...rrs,
        }
        const promises = await Promise.all([Article.findAll(opp), Article.count(cloneDeep(opp))])
        resp.status(200).json({
            data: {
                total: promises[1] || 0,
                rows: promises[0]
            }
        })
        return
    } catch (e) {
        next(e)
    }
});


app.post('/articles-user', authMobile, async (req, resp, next) => {
    try {
        const body = req.body;
        if(!body || !body.userId) {
            resp.status(400).send('Bad request');
            return
        }
        const {userId, ...options} = body
        const articles = await Article.findAll({
            where: {
                userId
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
            ],
            ...options
        })
        if (!articles) {
            resp.status(400).send('Articles not exists');
            return
        }
        resp.status(200).json({
            data: articles
        })
        return
    } catch (e) {
        next(e)
    }
});


app.get('/categories', authMobile, async (req, resp, next) => {
    try {
        const categories = await Category.findAll()
        if (!categories) {
            resp.status(400).send('Categories not exists');
            return
        }
        resp.status(200).json({
            data: categories
        })
        return
    } catch (e) {
        next(e)
    }
});


app.post('/articles-video', authMobile, async (req, resp, next) => {
    try {

        const opt = requestOptions({
            ...req.body,
        } as any)

        const options = {
            ...opt,
            where: {
                useLink: 1
            },
            include: [
                {
                    model: ArticleImgVideo,
                    as: 'articleImgVideo',
                    required: false
                },
                {
                    model: Category,
                    as: 'category',
                    required: false
                },
                {
                    model: User,
                    as: 'user',
                    required: true
                }
            ]
        }

        const promises = await Promise.all([Article.findAll(options), Article.count(cloneDeep(options))])
        resp.status(200).json({
            data: {
                total: promises[1] || 0,
                rows: promises[0]
            }
        })
        return
    } catch (e) {
        next(e)
    }
});

app.get('/articles-views', authMobile, async (req, resp, next) => {
    try {
        const articles = await Article.findAll({
            include: [
                {
                    model: ArticleImgVideo,
                    as: 'articleImgVideo',
                    required: false,
                    where: {
                        type: 1
                    }
                },
                {
                    model: Category,
                    as: 'category',
                    required: false
                },
                {
                    model: User,
                    as: 'user',
                    required: true
                }
            ],
            order: [
                ['views', 'DESC']
            ]
        })
        if (!articles) {
            resp.status(400).send('Articles not exists');
            return
        }
        resp.status(200).json({
            data: articles
        })
        return
    } catch (e) {
        next(e)
    }
});


app.post('/article-view', authMobile, async (req, resp, next) => {
    try {
        const {articleId} = req.body
        if (!articleId) {
            resp.status(400).send('Bad request');
            return
        }
        let article = await Article.selectOne(articleId)
        if (!article) {
            resp.status(400).send('Article not exists');
            return
        }
        await Article.update({
            views: article.views + 1
        }, {
            where: {
                id: article.id
            }
        })
        article = await Article.selectOne(article.id)
        resp.status(200).json({
            data: article
        })
        return
    } catch (e) {
        next(e)
    }
});


(async () => {
    await initSequelize('test', false)
    const PORT = configuration.MOBILE_PORT || 8888
    app.listen({port: PORT}, () => {
        console.log(`Apollo Server on http://localhost:${PORT}/graphql`)
    })
})()
