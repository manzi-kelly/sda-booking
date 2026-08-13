import { Router } from 'express'
import crypto from 'crypto'
import admin from 'firebase-admin'
import { db } from '../config/firebase.js'
import { broadcastBooksChanged } from '../lib/broadcast.js'
import { sendBookArrived, sendBookArrivedToAdmin } from '../lib/mailer.js'
import { sendBookArrivedSms } from '../lib/sms.js'

const router = Router()
const bookingsCol = db.collection('bookings')
const booksCol = db.collection('books')

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'manzikelly07@gmail.com').trim().toLowerCase()
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123'
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'sda-booking-admin-token-secret'
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

// ------------------------------------------------------------------
// Signed admin session token (stateless, HMAC-SHA256)
// Format: base64url(payload).base64url(signature)
// ------------------------------------------------------------------
const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')

const signToken = (email) => {
  const payload = { email, exp: Date.now() + TOKEN_TTL_MS }
  const data = base64url(payload)
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

const verifyToken = (token) => {
  if (!token) return null
  const [data, sig] = String(token).split('.')
  if (!data || !sig) return null

  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (!payload.email || payload.exp < Date.now()) return null
    if (payload.email !== ADMIN_EMAIL) return null
    return payload
  } catch {
    return null
  }
}

const requireAdmin = (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const payload = verifyToken(token)
  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized. Please login as admin.' })
  }
  req.admin = payload
  next()
}

// ------------------------------------------------------------------
// POST /api/admin/login - validate admin credentials, issue a token
// ------------------------------------------------------------------
router.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }

  const token = signToken(email)
  res.json({ token, email })
})

// ------------------------------------------------------------------
// POST /api/admin/books - post a new book to the user dashboard (admin only)
// ------------------------------------------------------------------
router.post('/books', requireAdmin, async (req, res) => {
  try {
    const title = String(req.body.title || '').trim()
    const price = Number(req.body.price)

    if (!title) {
      return res.status(400).json({ error: 'Title is required' })
    }
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'A valid price is required' })
    }

    const book = {
      title,
      author: String(req.body.author || '').trim(),
      category: String(req.body.category || 'General').trim(),
      description: String(req.body.description || '').trim(),
      image: String(req.body.image || '').trim(),
      gradient: String(req.body.gradient || 'from-teal-500 to-emerald-700').trim(),
      copies: Math.max(0, Number(req.body.copies) || 1),
      price,
      postedBy: req.admin.email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    const docRef = await booksCol.add(book)
    broadcastBooksChanged({ action: 'create', id: docRef.id })
    res.status(201).json({ id: docRef.id, ...book })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ------------------------------------------------------------------
// PATCH /api/admin/books/:id - update a posted book (admin only)
// ------------------------------------------------------------------
router.patch('/books/:id', requireAdmin, async (req, res) => {
  try {
    const docRef = booksCol.doc(req.params.id)
    const doc = await docRef.get()
    if (!doc.exists) {
      return res.status(404).json({ error: 'Book not found' })
    }

    const body = req.body || {}
    const updates = {}

    if (body.title !== undefined) {
      const title = String(body.title).trim()
      if (!title) return res.status(400).json({ error: 'Title is required' })
      updates.title = title
    }
    if (body.price !== undefined) {
      const price = Number(body.price)
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: 'A valid price is required' })
      }
      updates.price = price
    }
    if (body.author !== undefined) updates.author = String(body.author).trim()
    if (body.category !== undefined) updates.category = String(body.category).trim()
    if (body.description !== undefined) updates.description = String(body.description).trim()
    if (body.image !== undefined) updates.image = String(body.image).trim()
    if (body.gradient !== undefined) updates.gradient = String(body.gradient).trim()
    if (body.copies !== undefined) updates.copies = Math.max(0, Number(body.copies) || 1)

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp()
    await docRef.update(updates)

    const updated = { id: docRef.id, ...doc.data(), ...updates }
    updated.updatedAt = new Date().toISOString()
    broadcastBooksChanged({ action: 'update', id: docRef.id })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ------------------------------------------------------------------
// DELETE /api/admin/books/:id - remove a posted book (admin only)
// ------------------------------------------------------------------
router.delete('/books/:id', requireAdmin, async (req, res) => {
  try {
    const docRef = booksCol.doc(req.params.id)
    const doc = await docRef.get()
    if (!doc.exists) {
      return res.status(404).json({ error: 'Book not found' })
    }

    await docRef.delete()
    broadcastBooksChanged({ action: 'delete', id: req.params.id })
    res.json({ id: req.params.id, deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ------------------------------------------------------------------
// GET /api/admin/bookings - list ALL bookings (admin only)
// ------------------------------------------------------------------
router.get('/bookings', requireAdmin, async (req, res) => {
  try {
    const snapshot = await bookingsCol.orderBy('createdAt', 'desc').limit(500).get()
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ------------------------------------------------------------------
// PATCH /api/admin/bookings/:id - update booking status (admin only)
// ------------------------------------------------------------------
router.patch('/bookings/:id', requireAdmin, async (req, res) => {
  try {
    const { status, notifyEmail, notifyPhone } = req.body
    if (!status) {
      return res.status(400).json({ error: 'Status is required' })
    }

    const docRef = bookingsCol.doc(req.params.id)
    const doc = await docRef.get()
    if (!doc.exists) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    const nextStatus = String(status)
    const isDelivery = nextStatus === 'Delivered' || nextStatus === 'Complete'

    const updates = {
      status: nextStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
    if (isDelivery && !doc.data().deliveredAt) {
      updates.deliveredAt = admin.firestore.FieldValue.serverTimestamp()
    }
    await docRef.update(updates)

    // When the book arrives at the church, notify the customer (by email
    // and SMS) and the admin by email. Email/phone can be provided by the
    // admin in the "Confirm & Notify" form, otherwise fall back to the
    // contact details captured at checkout.
    if (isDelivery) {
      try {
        const updatedDoc = await docRef.get()
        if (updatedDoc.exists) {
          const data = { id: req.params.id, ...updatedDoc.data() }
          const customerEmail = String(notifyEmail || data.email || '').trim()
          const customerPhone = String(notifyPhone || data.phone || '').trim()

          if (customerEmail) await sendBookArrived({ ...data, email: customerEmail })
          await sendBookArrivedToAdmin(data)
          if (customerPhone) await sendBookArrivedSms({ ...data, phone: customerPhone })
        }
      } catch (err) {
        console.warn('[admin] Arrival notification failed:', err.message)
      }
    }

    res.json({ id: req.params.id, status: nextStatus })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ------------------------------------------------------------------
// DELETE /api/admin/bookings/:id - delete a booking (admin only)
// ------------------------------------------------------------------
router.delete('/bookings/:id', requireAdmin, async (req, res) => {
  try {
    const docRef = bookingsCol.doc(req.params.id)
    const doc = await docRef.get()
    if (!doc.exists) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    await docRef.delete()
    res.json({ id: req.params.id, deleted: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
