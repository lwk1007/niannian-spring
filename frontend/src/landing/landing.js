import { petSVG } from '../shared/pets.js'
import '../styles/base.css'
import '../styles/landing.css'

const host = document.getElementById('heroPet')
if (host) host.innerHTML = petSVG('cat')

const items = document.querySelectorAll('.reveal')
if (!('IntersectionObserver' in window)) {
  items.forEach((el) => el.classList.add('in'))
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('in')
          io.unobserve(en.target)
        }
      })
    },
    { threshold: 0.12 }
  )
  items.forEach((el) => io.observe(el))
}
