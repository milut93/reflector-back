import 'module-alias/register'
import express                from 'express'
import bodyParser             from 'body-parser'
import cors                   from 'cors'
import fileUpload             from 'express-fileupload'
import configuration          from '../config/index'
import path from 'path'
import {
    createAccessToken,
    createRefreshToken,
    verifyRefreshToken
}                             from 'sequelize/graphql/resolvers/Auth'
import { User } from 'sequelize/models'
import {initSequelize}        from 'sequelize/sequelize'
import createApolloServer     from 'apolloServer'
import { createTestData } from 'test/Init'

const app = express()
app.use(bodyParser.json({limit: '50mb'}))
app.use(fileUpload({
    limits: {fileSize: 50 * 1024 * 1024},
}))

const corsOptions = {
    credentials: true,
    origin: function(origin, callback) {
        if (configuration.corsOrigin.whitelist.indexOf(origin) !== -1 || !origin || origin.startsWith('http://192.168.')) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}


app.use(cors(corsOptions))

const dir = path.join(__dirname, '../images')

app.use(express.static(dir))

app.post('/upload_image/', async (req, resp) => {
    // if (!req.files) {
    //     return resp.status(400).send({'message': 'image is required'})
    // }
    // const file = req.files as any
    // const {image} = file
    // const {driveThumbnailUrlPath, googleDriveFolderItemId} = configuration.GOOGLE
    // const uploadedData = await uploadFileFromBuffer(image, googleDriveFolderItemId)
    // if (!uploadedData) {
    //     return resp.status(400).send({'message': 'Image not exists'})
    // }
    // const {id, name, size} = uploadedData
    // const itemId = req.body.itemId
    // const itemImage = await ItemsImages.insertUpdateImages({
    //     name: name,
    //     googleId: id,
    //     url: `${driveThumbnailUrlPath}${id}`,
    //     itemId: Number(itemId),
    //     type: IMAGE_TYPES.PRIMARY,
    //     size: Number(size)
    // })
    // if (!itemImage) {
    //     return resp.status(400).send({'message': 'Image not exists '})
    // }
    // return resp.status(200).send({ok: true})
})

app.get('/refresh_token', async (req, resp) => {
    let token = null
    const authorization = req.headers['authorization']
    if (authorization) {
        token = authorization.replace(/Bearer\s+/, '').trim()
    }

    if (!token) {
        const token = req.cookies['refresh-token']
    }

    if (!token) {
        return resp.send({ok: false})
    }

    let payload: any = null
    try {
        payload = verifyRefreshToken(token)
    } catch (err) {
        return resp.send({ok: false})
    }
    const user = await User.findByPk(payload.userId)
    if (!user) {
        throw new Error('User not found in system')
    }
    const refresh = createRefreshToken(user, resp)
    return resp.send({ok: true, data_token: {token: createAccessToken(user), refresh}})
});

(async () => {
    await initSequelize('test', false)
    const server = createApolloServer()
    const PORT = configuration.PORT || 4000
    server.applyMiddleware({app, path: '/graphql', cors: corsOptions})
    app.listen({port: PORT}, () => {
        console.log(`Apollo Server reflector on http://localhost:${PORT}/graphql`)
    })


    await createTestData()

})()
