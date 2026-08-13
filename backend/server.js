import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import bookingRoutes from './routes/bookings.js'
import geoRoutes from './routes/geo.js'
import adminRoutes from './routes/admin.js'
import bookRoutes from './routes/books.js'
import categoryRoutes from './routes/categories.js'
import { seedDefaultBooks, seedDefaultCategories } from './seedBooks.js'

const app = express()
const PORT = process.env.PORT || 5000

const rawOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',').map((s) => s.trim()).filter(Boolean)

const corsOrigins = rawOrigins.includes('*') ? '*' : rawOrigins

app.use(cors(corsOrigins === '*' || corsOrigins.length === 0 ? undefined : { origin: corsOrigins }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SDA Booking backend' })
})

app.use('/api/auth', authRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/geo', geoRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/books', bookRoutes)
app.use('/api/categories', categoryRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, async () => {
  console.log(`SDA Booking backend running on http://localhost:${PORT}`)
  const result = await seedDefaultBooks()
  if (result.skipped) {
    console.log('Default books already seeded — skipping.')
  } else if (result.seeded > 0) {
    console.log(`Seeded ${result.seeded} default book(s) into Firestore.`)
  }
  if (result.error) console.warn(result.error)
  const catResult = await seedDefaultCategories()
  if (catResult.seeded > 0) console.log(`Seeded ${catResult.seeded} default categorie(s).`)
  if (catResult.error) console.warn(catResult.error)
})
