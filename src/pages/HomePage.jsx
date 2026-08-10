import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import About from '../components/About'
import Services from '../components/Services'
import Contact from '../components/Contact'
import Footer from '../components/Footer'
import ScrollToTop from '../components/ScrollToTop'
import { scrollToSection } from '../utils/navigation'

const HomePage = () => {
  const location = useLocation()

  useEffect(() => {
    const id = location.state?.scrollTo
    if (id) {
      const timer = setTimeout(() => scrollToSection(id), 60)
      return () => clearTimeout(timer)
    }
    window.scrollTo(0, 0)
  }, [location])

  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Services />
      <Contact />
      <Footer />
      <ScrollToTop />
    </>
  )
}

export default HomePage