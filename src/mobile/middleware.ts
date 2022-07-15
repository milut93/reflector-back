import NodeRSA from 'node-rsa'
import fs from 'fs'
import {resolve} from "path";
import {chunk, flatten, random} from "lodash";

const reflectorMobileToken = 'reflektorMobileApplicationToken'

const hideStr = (str: string) => {
    const array = chunk(str.slice(), 5).map(x => x.reverse())
    const genRandom = () => {
        const data = `${random(10000, 1000000).toString(16)}${random(10000, 1000000).toString(16)}`
        return [data, 'Alg3'].join('B').substring(0, 5)
    }
    const arr = []
    while (array.length) {
        const p = array.shift()
        arr.push(genRandom())
        arr.push(p)
    }
    const data = flatten(arr).join('')
    return data
}


const unHideStr = (str: string) => {
    const arr = chunk(str.slice(), 5).map(x => x.reverse())
    const array = []
    while (arr.length) {
        arr.shift()
        const p = arr.shift()
        array.push(p)
    }
    const data = flatten(array).join('')
    return data
}

export const encryptData = async (str: string) => {
    const buffer = Buffer.from(str, 'utf-8')
    return hideStr(buffer.toString('base64'))
}

const decryptCode = (code: string) => {
    try {
        code = unHideStr(code)
        return Buffer.from(code, "base64").toString('utf-8')
    } catch (e) {
        return null
    }
}


const authMobile = async (req, res, next) => {
    try {
        const mobileToken = req.headers?.mobileToken || req.headers?.mobiletoken ;
        if (!mobileToken){
            res.status(403).send("Access denied.");
            return;
        }

        const data = (await fs.readFileSync(resolve('src/keys/pairs.json'))).toString('utf-8')
        const keys = JSON.parse(data) as any
        const key = new NodeRSA()
        key.setOptions({encryptionScheme: 'pkcs1'});
        key.importKey(keys.private, 'pkcs1-private')
        const decrypt = key.decrypt(mobileToken, 'utf8')
        const result = decryptCode(decrypt)
        if (result !== reflectorMobileToken) {
            res.status(403).send("Access denied.");
            return
        }
        return next();
    } catch (error) {
        res.status(400).send("Invalid token");
    }
}

export default authMobile
