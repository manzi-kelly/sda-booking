import { Router } from 'express'
import geoip from 'geoip-lite'

const router = Router()

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return String(forwarded).split(',')[0].trim()
  const realIp = req.headers['x-real-ip']
  if (realIp) return String(realIp).trim()
  return req.ip || req.socket?.remoteAddress || ''
}

function cleanIp(ip) {
  const value = String(ip || '').trim()
  if (!value) return ''
  if (value === '::1' || value === '127.0.0.1' || value === 'localhost') return ''
  return value.replace(/^::ffff:/, '')
}

// GET /api/geo/country
router.get('/country', (req, res) => {
  const ip = cleanIp(getClientIp(req))
  if (!ip) {
    return res.json({ country: null })
  }
  const lookup = geoip.lookup(ip)
  res.json({ country: lookup && lookup.country ? lookup.country : null })
})

export default router
