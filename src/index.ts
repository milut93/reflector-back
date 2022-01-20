import 'module-alias/register'
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import configuration from '../config/index'
import cookieParser from 'cookie-parser'
import path from 'path'
import { createAccessToken, createRefreshTokenCookie, verifyRefreshToken } from 'sequelize/graphql/resolvers/Auth'
import { User } from 'sequelize/models'
import { initSequelize } from 'sequelize/sequelize'
import createApolloServer from 'apolloServer'
import { createTestData } from 'test/Init'

const app = express()
app.use(bodyParser.json({ limit: '50mb' }))
app.use(cookieParser())

const corsOptions = {
  credentials: true,
  origin: function(origin, callback) {
    callback(null, true)
    // if (configuration.corsOrigin.whitelist.indexOf(origin) !== -1 || !origin || origin.startsWith('http://192.168.')) {
    //     callback(null, true)
    // } else {
    //     callback(new Error('Not allowed by CORS'))
    // }
  }
}

app.use(cors(corsOptions))

const dir = path.join(__dirname, '../images')

app.use(express.static(dir))

app.get('/images/users/:id/:file', async (req, resp) => {
  resp.sendFile(path.join(__dirname, `../${req.originalUrl}`))
})

app.get('/images/articles/:id/:file', async (req, resp) => {
  resp.sendFile(path.join(__dirname, `../${req.originalUrl}`))
})

app.get('/refresh_token', async (req, resp) => {
  const token = req.cookies['refresh-token']
  if (!token) {
    return resp.send({ ok: false })
  }
  let payload: any = null
  try {
    payload = verifyRefreshToken(token)
  } catch (err) {
    return resp.send({ ok: false })
  }
  const user = await User.findByPk(payload.userId)
  if (!user) {
    throw new Error('User not found in system')
  }
  createRefreshTokenCookie(user, resp)
  return resp.send({ ok: true, token: createAccessToken(user) })
});

(async () => {
  await initSequelize('test', false)
  const server = createApolloServer()
  const PORT = configuration.PORT || 4000
  server.applyMiddleware({ app, path: '/graphql', cors: corsOptions })
  app.listen({ port: PORT }, () => {
    console.log(`Apollo Server reflector on http://localhost:${PORT}/graphql`)
  })

  await createTestData()
})()
