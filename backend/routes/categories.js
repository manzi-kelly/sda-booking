import { Router } from 'express'
import { db } from '../config/firebase.js'
import { categoriesBus, CATEGORIES_EVENT } from '../lib/broadcast.js'

const router = Router()
const categoriesCol = db.collection('categories')

// GET /api/categories - list all categories (public)
router.get('/', async (req, res) => {
  try {
    const snapshot = await categoriesCol.orderBy('name', 'asc').get()
    const items = snapshot.docs.map((d) => ({ id: d.id, name: d.data().name }))
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/categories/events - Server-Sent Events stream for category changes
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  })
  res.write(': connected\n\n')

  const onChanged = (data) => {
    res.write(`event: ${CATEGORIES_EVENT}\ndata: ${JSON.stringify(data)}\n\n`)
  }
  categoriesBus.on(CATEGORIES_EVENT, onChanged)

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000)

  req.on('close', () => {
    clearInterval(heartbeat)
    categoriesBus.off(CATEGORIES_EVENT, onChanged)
    res.end()
  })
})

export default router
