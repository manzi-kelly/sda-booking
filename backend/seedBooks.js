import admin from 'firebase-admin'
import { db } from './config/firebase.js'
import { defaultBooks } from './data/books.js'

export const seedDefaultBooks = async () => {
  try {
    const booksCol = db.collection('books')
    const flagRef = db.doc('_meta/booksSeeded')
    const flag = await flagRef.get()
    if (flag.exists) return { seeded: 0, skipped: true }

    let seeded = 0
    for (const book of defaultBooks) {
      const existing = await booksCol.where('title', '==', book.title).limit(1).get()
      if (!existing.empty) continue
      await booksCol.add({
        ...book,
        postedBy: 'seed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      seeded += 1
    }

    await flagRef.set({ seededAt: admin.firestore.FieldValue.serverTimestamp(), count: seeded })
    return { seeded, skipped: false }
  } catch (err) {
    console.error('Seed default books failed:', err.message)
    return { seeded: 0, skipped: false, error: err.message }
  }
}
