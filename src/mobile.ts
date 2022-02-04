import 'module-alias/register'
import express from 'express'
import bodyParser from 'body-parser'
import configuration from '../config/index'
import {initSequelize} from './sequelize/sequelize'
import createApolloServer from './apolloServer'
import cookieParser from 'cookie-parser'
import path from 'path'

const app = express()
app.use(bodyParser.json({limit: '50mb'}))
app.use(cookieParser())

const dir = path.join(__dirname, '../images')

app.use(express.static(dir))


app.get('/images/articles/:id/:file', async (req, resp) => {
    resp.sendFile(path.join(__dirname, `../${req.originalUrl}`))
});

(async () => {
    await initSequelize('test', false)
    const server = createApolloServer()
    const PORT = configuration.MOBILE_PORT || 8888
    server.applyMiddleware({app, path: '/graphql'})
    app.listen({port: PORT}, () => {
        console.log(`Apollo Server on http://localhost:${PORT}/graphql`)
    })
})()
