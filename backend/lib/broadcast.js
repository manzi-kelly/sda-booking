import { EventEmitter } from 'events'

export const BOOKS_EVENT = 'books-changed'

export const booksBus = new EventEmitter()

export const broadcastBooksChanged = (data = {}) => {
  booksBus.emit(BOOKS_EVENT, {
    type: BOOKS_EVENT,
    at: Date.now(),
    ...data
  })
}
