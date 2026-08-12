import { useEffect, useRef } from 'react'

const useReveal = (threshold = 0.15) => {
  const ref = useRef(null)

  useEffect(() => {
    const section = ref.current
    if (!section) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target
              .querySelectorAll('.slide-up')
              .forEach((el) => el.classList.add('visible'))
          }
        })
      },
      { threshold }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [threshold])

  return ref
}

export default useReveal
