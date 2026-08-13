import { EventEmitter } from 'events'

export const BOOKS_EVENT = 'books-changed'
export const BOOKINGS_EVENT = 'bookings-changed'
export const CATEGORIES_EVENT = 'categories-changed'

export const booksBus = new EventEmitter()
export const bookingsBus = new EventEmitter()
export const categoriesBus = new EventEmitter()

export const broadcastBooksChanged = (data = {}) => {
  booksBus.emit(BOOKS_EVENT, {
    type: BOOKS_EVENT,
    at: Date.now(),
    ...data
  })
}

export const broadcastBookingsChanged = (data = {}) => {
  bookingsBus.emit(BOOKINGS_EVENT, {
    type: BOOKINGS_EVENT,
    at: Date.now(),
    ...data
  })
}

export const broadcastCategoriesChanged = (data = {}) => {
  categoriesBus.emit(CATEGORIES_EVENT, {
    type: CATEGORIES_EVENT,
    at: Date.now(),
    ...data
  })
}
