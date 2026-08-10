export const PRODUCTS_ROUTE = '/dashboard'

export const HOME_SECTIONS = ['home', 'about', 'services', 'contact']

export const isLoggedIn = () => localStorage.getItem('isLoggedIn') === 'true'

export const scrollToSection = (id, behavior = 'smooth') => {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior })
  } else {
    window.scrollTo({ top: 0, behavior })
  }
}

// Navigate to a home-page section from any page: if we are not on the
// home page yet, go there first and scroll once it has mounted.
export const goToSection = (navigate, location, id) => {
  if (location.pathname === '/') {
    scrollToSection(id)
  } else {
    navigate('/', { state: { scrollTo: id } })
  }
}

// Shared "Book Now"-style CTA: signed-in users go straight to the
// dashboard, everyone else is asked to log in first.
export const openBooking = (navigate, openAuth) => {
  if (isLoggedIn()) {
    navigate(PRODUCTS_ROUTE)
  } else {
    openAuth()
  }
}
