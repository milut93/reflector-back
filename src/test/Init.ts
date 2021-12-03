import {
    User,
}               from '../sequelize/models'
import bcrypt   from 'bcryptjs'

import configuration  from '../../config'

export const createTestData = async () => {

    /** This part should be out of test - KEEP in production too */

    let user = await User.findByPk(1)
    if (configuration.TEST && !user) {
        user = await User.create({
            userName: 'stefan',
            nickname: 'stefan',
            description: 'Stefan Milutinovic',
            password: await bcrypt.hash('test123!', 12),
            role: 1,
        })

         user = await User.create({
            userName: 'acasax',
            nickname:  'acasax',
            description: 'Aleksandar Djordjevic',
            password: await bcrypt.hash('test123!', 12),
            role: 1,  
         })
    }


}
