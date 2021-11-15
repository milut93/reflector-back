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
            email: 'stefan.milutinovic.rs@gmail.com',
            userName: 'stefan',
            password: await bcrypt.hash('test123!', 12)
        })

        // user = await User.create({
        //     email: 'acasax@gmail.com',
        //     userName: 'acasax',
        //     password: await bcrypt.hash('test123!', 12)
        // })
    }


}
