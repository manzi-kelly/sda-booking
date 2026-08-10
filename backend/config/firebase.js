import admin from 'firebase-admin'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json'
const fullPath = path.resolve(__dirname, '..', serviceAccountPath)

if (!existsSync(fullPath)) {
  throw new Error(
    `Firebase service account key not found at ${fullPath}.\n` +
    'Download it from Firebase Console > Project Settings > Service accounts > Generate new private key,\n' +
    'then save it in the backend folder as serviceAccountKey.json'
  )
}

const serviceAccount = JSON.parse(readFileSync(fullPath, 'utf8'))

if (!serviceAccount.project_id || serviceAccount.project_id.startsWith('REPLACE')) {
  throw new Error(
    'serviceAccountKey.json is not valid. Replace it with the private key JSON you downloaded from Firebase Console.'
  )
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

export const auth = admin.auth()
export const db = admin.firestore()
export default admin
