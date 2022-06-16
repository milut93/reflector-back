import admin from 'firebase-admin'
import serviceAccount from '../../config/reflektor-7fa3e-firebase-adminsdk-y965v-d6bf4aa619.json'



admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
    databaseURL: "firebase-adminsdk-y965v@reflektor-7fa3e.iam.gserviceaccount.com"
})

export default admin
