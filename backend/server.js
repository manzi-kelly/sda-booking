import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import bookingRoutes from './routes/bookings.js'
import geoRoutes from './routes/geo.js'
import adminRoutes from './routes/admin.js'
import bookRoutes from './routes/books.js'
import { seedDefaultBooks } from './seedBooks.js'

const app = express()
const PORT = process.env.PORT || 5000

const corsOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : ['*']

app.use(cors({ origin: corsOrigins }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SDA Booking backend' })
})

app.use('/api/auth', authRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/geo', geoRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/books', bookRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, async () => {
  console.log(`SDA Booking backend running on http://localhost:${PORT}`)
  const result = await seedDefaultBooks()
  if (result.skipped) return
  console.log(`Seeded ${result.seeded} default book(s) into Firestore.`)
  if (result.error) console.warn(result.error)
})
