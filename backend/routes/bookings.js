import { Router } from 'express'
import admin from 'firebase-admin'
import { verifyToken } from '../middleware/auth.js'
import { db, auth } from '../config/firebase.js'
import { sendBookingConfirmation } from '../lib/mailer.js'
import { bookingsBus, BOOKINGS_EVENT, broadcastBookingsChanged } from '../lib/broadcast.js'

const router = Router()
const bookingsCol = db.collection('bookings')

// Resolve the Firestore uid from the (optional) Firebase token.
// Booking creation is public so guests can order without an account.
const resolveUid = async (req) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return 'guest'
  try {
    const decoded = await auth.verifyIdToken(token)
    return decoded.uid || 'guest'
  } catch {
    return 'guest'
  }
}

// POST /api/bookings - create a booking (logged-in users or guests)
router.post('/', async (req, res) => {
  try {
    const uid = await resolveUid(req)

    const booking = {
      uid,
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

    const created = { id: docRef.id, ...booking }

    // Tell every connected admin dashboard that a new order arrived.
    broadcastBookingsChanged({ action: 'create', id: docRef.id })

    // Thank-you email (fire-and-forget; never fails the request).
    try {
      await sendBookingConfirmation(created)
    } catch (err) {
      console.warn('[bookings] Confirmation email failed:', err.message)
    }

    res.status(201).json(created)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/bookings/events - Server-Sent Events stream so admin dashboards
// refresh instantly whenever a booking is created or updated. It only emits
// "something changed" signals (never booking data); clients re-fetch with auth.
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  })
  res.write(': connected\n\n')

  const onChanged = (data) => {
    res.write(`event: ${BOOKINGS_EVENT}\ndata: ${JSON.stringify(data)}\n\n`)
  }
  bookingsBus.on(BOOKINGS_EVENT, onChanged)

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000)

  req.on('close', () => {
    clearInterval(heartbeat)
    bookingsBus.off(BOOKINGS_EVENT, onChanged)
    res.end()
  })
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
