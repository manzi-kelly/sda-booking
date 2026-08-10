import { Router } from 'express'
import admin from 'firebase-admin'
import { verifyToken } from '../middleware/auth.js'
import { db } from '../config/firebase.js'

const router = Router()
const bookingsCol = db.collection('bookings')

// POST /api/bookings - create a booking for the authenticated user
router.post('/', verifyToken, async (req, res) => {
  try {
    const booking = {
      uid: req.user.uid,
      title: req.body.title || '',
      qty: req.body.qty || 1,
      price: req.body.price || 0,
      paymentMethod: req.body.paymentMethod || '',
      district: req.body.district || '',
      sector: req.body.sector || '',
      phone: req.body.phone || '',
      name: req.body.name || '',
      email: req.body.email || '',
      status: req.body.status || 'New',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    const docRef = await bookingsCol.add(booking)

    res.status(201).json({ id: docRef.id, ...booking })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/bookings - list bookings for the authenticated user
router.get('/', verifyToken, async (req, res) => {
  try {
    const snapshot = await bookingsCol
      .where('uid', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get()

    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/bookings/:id - delete a booking (owner only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const docRef = bookingsCol.doc(req.params.id)
    const doc = await docRef.get()

    if (!doc.exists || doc.data().uid !== req.user.uid) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    await docRef.delete()

    res.json({ id: req.params.id, deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
