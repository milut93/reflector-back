import 'module-alias/register'
import express from 'express'
import bodyParser from 'body-parser'
import configuration from '../config/index'
import {initSequelize} from './sequelize/sequelize'
import createApolloServer from './apolloServer'
import cookieParser from 'cookie-parser'
import path from 'path'
import Article from "./sequelize/models/Article.model";
import Category from "./sequelize/models/Category.model";
import User from "./sequelize/models/User.model";
import ArticleImgVideo from "./sequelize/models/ArticleImgVideo.model";
import authMobile from "./mobile/middleware";

const app = express()
app.use(bodyParser.json({limit: '50mb'}))
app.use(cookieParser())

const dir = path.join(__dirname, '../images')

app.use(express.static(dir))


app.get('/images/articles/:id/:file', authMobile, async (req, resp) => {
    resp.sendFile(path.join(__dirname, `../${req.originalUrl}`))
});

app.use((error, req, res, next) => {
    const status = error.statusCode || 500;
    const message = error.message
    const data = error.data
    res.status(status).send({message: message, result: data})
})

app.get('/articles', authMobile, async (req, resp, next) => {
    try {
        const articles = await Article.findAll({
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
        resp.status(200).json({
            data: articles
        })
        return
    } catch (e) {
        next(e)
    }
});

app.get('/article/:id', authMobile, async (req, resp,next) => {
    try {
        const id = req.params.id;
        if(!id) {
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
        if(!article) {
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



app.get('/articles/:categoryId', authMobile, async (req, resp,next) => {
    try {
        const categoryId = req.params.categoryId;
        if(!categoryId) {
            resp.status(400).send('Bad request');
            return
        }
        const articles = await Article.findAll({
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
        })
        if(!articles) {
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



(async () => {
    await initSequelize('test', false)
    const PORT = configuration.MOBILE_PORT || 8888
    app.listen({port: PORT}, () => {
        console.log(`Apollo Server on http://localhost:${PORT}/graphql`)
    })
})()
