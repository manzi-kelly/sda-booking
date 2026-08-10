import { Router } from 'express'
import crypto from 'crypto'
import dns from 'node:dns'
import nodemailer from 'nodemailer'
import admin from 'firebase-admin'
import { verifyToken } from '../middleware/auth.js'
import { db } from '../config/firebase.js'

const router = Router()
const usersCol = db.collection('users')
const otpsCol = db.collection('otps')

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

// Dev-only in-memory OTP store, used ONLY if Firestore is not available
// (e.g. Firestore API disabled in the Firebase project). Production uses Firestore.
const memoryOtps = new Map()
let useMemoryStore = false
const markFirestoreUnavailable = () => { useMemoryStore = true }

const generateCode = () => {
  // Cryptographically secure 6-digit code (000000 - 999999).
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0')
}

// Never store the plain OTP - store an HMAC-SHA256 digest instead.
const OTP_HASH_SECRET = process.env.OTP_HASH_SECRET || 'sda-booking-otp-hash-secret'
const hashOtp = (email, code) => {
  return crypto
    .createHmac('sha256', OTP_HASH_SECRET)
    .update(`${email.toLowerCase()}:${code}`)
    .digest('hex')
}

const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000 // 60 seconds
const MAX_ATTEMPTS = 5

// ------------------------------------------------------------------
// Simple in-memory rate limiting for OTP requests
// Limits: 3 sends per email per 15 minutes, plus a global cap.
// ------------------------------------------------------------------
const otpRateStore = new Map()

const isRateLimited = (email) => {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const perEmailMax = 3
  const globalMax = 50

  const hits = (otpRateStore.get(email) || []).filter((t) => now - t < windowMs)
  if (hits.length >= perEmailMax) return true

  const globalHits = Array.from(otpRateStore.values())
    .flat()
    .filter((t) => now - t < windowMs)
  if (globalHits.length >= globalMax) return true

  hits.push(now)
  otpRateStore.set(email, hits)
  return false
}

// ------------------------------------------------------------------
// Nodemailer transport (Gmail / Google SMTP). Credentials come from env
// vars only - never hard-coded and never exposed to the frontend.
// ------------------------------------------------------------------
const buildTransport = async () => {
  const isConfigured = (v) => v && !v.startsWith('your_')
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!isConfigured(host) || !isConfigured(user) || !isConfigured(pass)) {
    return null
  }

  const port = Number(process.env.SMTP_PORT || 465)

  // Nodemailer resolves SMTP hostnames via dns.resolve(), which queries the
  // DNS server directly and hangs on some networks (VPNs, corporate or
  // network-wide DNS). Resolve the hostname through the OS resolver
  // (dns.lookup) and connect to the IP instead, keeping the hostname in
  // tls.servername so TLS certificate validation still works.
  let ip = host
  try {
    const { address } = await dns.promises.lookup(host, { family: 4 })
    ip = address
  } catch {
    // Fall back to the hostname if lookup fails
  }

  return nodemailer.createTransport({
    host: ip,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { servername: host }
  })
}

const sendOtpEmail = async (email, code) => {
  const transport = await buildTransport()
  const from = process.env.OTP_FROM_EMAIL || process.env.SMTP_USER

  if (!transport || !from) {
    // Development fallback only - never log the OTP in production.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[OTP] SMTP not configured. Code for', email, ':', code)
    }
    return false
  }

  try {
    await transport.sendMail({
      from: `SDA Booking <${from}>`,
      to: email,
      subject: 'SDA Booking Verification',
      html: `<html><body>
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#0f766e;margin:0 0 16px;">SDA Booking Verification</h2>
        <p style="color:#374151;font-size:15px;line-height:1.6;">Your verification code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0f172a;background:#f1f5f9;border-radius:8px;padding:16px;text-align:center;margin:16px 0;">${code}</div>
        <p style="color:#6b7280;font-size:13px;line-height:1.6;">This code expires in 5 minutes.<br/>Do not share this code with anyone.</p>
      </div>
    </body></html>`
    })
    return true
  } catch (err) {
    // Development fallback only - never leak the OTP in production.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[OTP] SMTP send failed, returning dev code. Error:', err.message)
      console.warn('[OTP] Code for', email, ':', code)
      return false
    }
    throw err
  }
}

// ------------------------------------------------------------------
// Create or overwrite the OTP record for an email.
// Overwriting invalidates any previous OTP (prevents reuse).
// ------------------------------------------------------------------
const storeOtp = async (email, purpose) => {
  const code = generateCode()
  const codeHash = hashOtp(email, code)
  const now = Date.now()

  try {
    await otpsCol.doc(email).set({
      email,
      codeHash,
      purpose,
      attempts: 0,
      verified: false,
      createdAt: admin.firestore.Timestamp.fromMillis(now),
      expiresAt: admin.firestore.Timestamp.fromMillis(now + OTP_TTL_MS)
    })
  } catch (err) {
    if (err.code === 7 || /PERMISSION_DENIED|NOT_FOUND/i.test(err.message || '')) {
      markFirestoreUnavailable()
      memoryOtps.set(email, {
        email,
        codeHash,
        purpose,
        attempts: 0,
        verified: false,
        createdAtMs: now,
        expiresAtMs: now + OTP_TTL_MS
      })
    } else {
      throw err
    }
  }

  return code
}

const getOtpRecord = async (email) => {
  const doc = await otpsCol.doc(email).get()
  if (!doc.exists) return null
  const data = doc.data()
  return {
    ...data,
    createdAtMs: data.createdAt ? data.createdAt.toMillis() : 0,
    expiresAtMs: data.expiresAt ? data.expiresAt.toMillis() : 0
  }
}

// Fetch an OTP record from Firestore, falling back to the dev memory store.
const fetchOtpRecord = async (email) => {
  if (useMemoryStore) {
    return memoryOtps.get(email) || null
  }
  try {
    return await getOtpRecord(email)
  } catch (err) {
    if (err.code === 7 || /PERMISSION_DENIED|NOT_FOUND/i.test(err.message || '')) {
      markFirestoreUnavailable()
      return memoryOtps.get(email) || null
    }
    throw err
  }
}

const updateOtpRecord = async (email, updates) => {
  if (useMemoryStore) {
    const rec = memoryOtps.get(email)
    if (rec) Object.assign(rec, updates)
    return
  }
  try {
    await otpsCol.doc(email).update(updates)
  } catch (err) {
    if (err.code === 7 || /PERMISSION_DENIED|NOT_FOUND/i.test(err.message || '')) {
      markFirestoreUnavailable()
      const rec = memoryOtps.get(email)
      if (rec) Object.assign(rec, updates)
    } else {
      throw err
    }
  }
}

const deleteOtpRecord = async (email) => {
  memoryOtps.delete(email)
  if (useMemoryStore) return
  try {
    await otpsCol.doc(email).delete()
  } catch (err) {
    if (err.code !== 7 && !/PERMISSION_DENIED|NOT_FOUND/i.test(err.message || '')) throw err
  }
}

// Save a user profile. Firestore is the source of truth; if it is not
// available (dev), keep the request from failing so Firebase Auth still works.
const saveUserProfile = async (uid, data) => {
  try {
    await usersCol.doc(uid).set(data, { merge: true })
  } catch (err) {
    if (err.code === 7 || /PERMISSION_DENIED|NOT_FOUND/i.test(err.message || '')) {
      console.warn('[users] Firestore unavailable - user profile not persisted')
    } else {
      throw err
    }
  }
}

// ------------------------------------------------------------------
// POST /api/auth/send-email-otp
// Generate + store + email a 6-digit OTP.
// ------------------------------------------------------------------
router.post('/send-email-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }

    const record = await fetchOtpRecord(email)
    if (record && Date.now() - record.createdAtMs < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - record.createdAtMs)) / 1000)
      return res.status(429).json({ error: `Please wait ${wait}s before requesting another code.` })
    }

    if (isRateLimited(email)) {
      return res.status(429).json({ error: 'Too many code requests. Please try again later.' })
    }

    const code = await storeOtp(email, req.body.purpose || 'generic')
    const sent = await sendOtpEmail(email, code)

    const response = { ok: true, email, via: sent ? 'email' : 'console' }
    // Development fallback only.
    if (!sent && process.env.NODE_ENV !== 'production') response.devCode = code

    res.json(response)
  } catch (err) {
    res.status(500).json({ error: 'Failed to send the verification code. Please try again.', details: err.message })
  }
})

// ------------------------------------------------------------------
// POST /api/auth/resend-email-otp
// Same as send but strictly enforces the 60s resend cooldown.
// ------------------------------------------------------------------
router.post('/resend-email-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }

    const record = await fetchOtpRecord(email)
    if (!record) {
      return res.status(400).json({ error: 'No code was sent to this email yet. Send a code first.' })
    }

    const elapsed = Date.now() - record.createdAtMs
    if (elapsed < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
      return res.status(429).json({ error: `Please wait ${wait}s before resending.` })
    }

    if (isRateLimited(email)) {
      return res.status(429).json({ error: 'Too many code requests. Please try again later.' })
    }

    // Generate a new code - this invalidates the previous one.
    const code = await storeOtp(email, record.purpose || 'generic')
    const sent = await sendOtpEmail(email, code)

    const response = { ok: true, email, via: sent ? 'email' : 'console' }
    if (!sent && process.env.NODE_ENV !== 'production') response.devCode = code

    res.json(response)
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend the verification code. Please try again.', details: err.message })
  }
})

// ------------------------------------------------------------------
// POST /api/auth/verify-email-otp
// Verify email, code, expiration, attempts and verified status.
// ------------------------------------------------------------------
router.post('/verify-email-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email)
    const userCode = String(req.body.code || '').trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }
    if (!/^\d{6}$/.test(userCode)) {
      return res.status(400).json({ error: 'Please enter the 6-digit code.' })
    }

    const record = await fetchOtpRecord(email)
    if (!record) {
      return res.status(400).json({ error: 'No code was sent to this email yet. Send a code first.' })
    }
    if (record.verified) {
      return res.status(400).json({ error: 'This code was already verified.' })
    }

    // Reject expired OTPs.
    if (Date.now() > record.expiresAtMs) {
      await deleteOtpRecord(email)
      return res.status(400).json({ error: 'This code has expired. Please request a new one.' })
    }

    // Attempt limit - prevents brute-force.
    if (record.attempts >= MAX_ATTEMPTS) {
      await deleteOtpRecord(email)
      return res.status(400).json({ error: 'Too many wrong attempts. Please request a new code.' })
    }

    // Compare using the stored hash (constant-time).
    const codeHash = hashOtp(email, userCode)
    if (!safeEqual(codeHash, record.codeHash)) {
      await updateOtpRecord(email, { attempts: record.attempts + 1 })
      return res.status(400).json({ error: 'Incorrect code. Please check and try again.' })
    }

    // Valid - mark verified and keep the record until it is consumed by
    // register/reset-password (which delete it), so it cannot be reused.
    await updateOtpRecord(email, { verified: true })
    res.json({ ok: true, email, purpose: record.purpose })
  } catch (err) {
    res.status(500).json({ error: 'Verification failed. Please try again.', details: err.message })
  }
})

// Require a valid, verified, unexpired OTP for the email.
const requireVerifiedOtp = async (email) => {
  const record = await fetchOtpRecord(email)
  if (!record) return { ok: false, error: 'No code was sent to this email yet. Send a code first.' }
  if (record.expiresAtMs && record.expiresAtMs < Date.now()) {
    await deleteOtpRecord(email)
    return { ok: false, error: 'This code has expired. Please request a new one.' }
  }
  if (!record.verified) {
    return { ok: false, error: 'Please verify your code first.' }
  }
  return { ok: true, record, email }
}

// ------------------------------------------------------------------
// POST /api/auth/register - create an email-based account (one per email)
// ------------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { name, password } = req.body
    const email = normalizeEmail(req.body.email)

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Please enter your full name' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password must contain at least 6 characters' })
    }

    // Email must have been verified via OTP first.
    const check = await requireVerifiedOtp(email)
    if (!check.ok) {
      return res.status(400).json({ error: check.error })
    }

    // One account per email address.
    try {
      await admin.auth().getUserByEmail(email)
      return res.status(409).json({ error: 'This email is already registered. Please login instead.' })
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: String(name).trim(),
      emailVerified: true
    })

    const data = {
      name: String(name).trim(),
      email,
      uid: userRecord.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }
    await saveUserProfile(userRecord.uid, data)

    // OTP was consumed by this registration.
    await deleteOtpRecord(email)

    res.status(201).json({ uid: userRecord.uid, ...data })
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'This email is already registered. Please login instead.' })
    }
    res.status(500).json({ error: err.message })
  }
})

// ------------------------------------------------------------------
// POST /api/auth/reset-password - after OTP is verified, set a new password
// ------------------------------------------------------------------
router.post('/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body
    const email = normalizeEmail(req.body.email)

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must contain at least 6 characters' })
    }

    const check = await requireVerifiedOtp(email)
    if (!check.ok) {
      return res.status(400).json({ error: check.error })
    }

    let uid = null
    try {
      const userRecord = await admin.auth().getUserByEmail(email)
      uid = userRecord.uid
    } catch (err) {
      if (err.code !== 'auth/user-not-found') throw err
    }

    if (!uid) {
      return res.status(404).json({ error: 'No account found with this email' })
    }

    await admin.auth().updateUser(uid, { password: String(newPassword) })
    await deleteOtpRecord(email)

    res.json({ ok: true, message: 'Password updated. You can now login.' })
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed. Please try again.', details: err.message })
  }
})

// ------------------------------------------------------------------
// GET /api/auth/me - fetch the current user's profile from Firestore
// ------------------------------------------------------------------
router.get('/me', verifyToken, async (req, res) => {
  try {
    const doc = await usersCol.doc(req.user.uid).get()

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ uid: doc.id, ...doc.data() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ------------------------------------------------------------------
// POST /api/auth/users - create or update a user profile after Firebase login
// ------------------------------------------------------------------
router.post('/users', verifyToken, async (req, res) => {
  try {
    const { name } = req.body
    const uid = req.user.uid

    const data = {
      name: name || req.user.name || '',
      email: req.user.email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }

    await saveUserProfile(uid, data)

    res.json({ uid, ...data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
