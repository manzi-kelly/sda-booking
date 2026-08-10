import { Router } from 'express'
import { db } from '../config/firebase.js'
import { booksBus, BOOKS_EVENT } from '../lib/broadcast.js'

const router = Router()
const booksCol = db.collection('books')

// GET /api/books - list all posted books (public)
router.get('/', async (req, res) => {
  try {
    const snapshot = await booksCol.orderBy('createdAt', 'desc').limit(200).get()
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/books/events - Server-Sent Events stream for real-time book changes
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  })
  res.write(': connected\n\n')

  const onBooksChanged = (data) => {
    res.write(`event: ${BOOKS_EVENT}\ndata: ${JSON.stringify(data)}\n\n`)
  }
  booksBus.on(BOOKS_EVENT, onBooksChanged)

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000)

  req.on('close', () => {
    clearInterval(heartbeat)
    booksBus.off(BOOKS_EVENT, onBooksChanged)
    res.end()
  })
})

export default router
