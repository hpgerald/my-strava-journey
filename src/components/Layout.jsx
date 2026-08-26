import Nav from './Nav.jsx'
import Footer from './Footer.jsx'

// Shared page frame: skip link, sticky nav, main landmark, footer.
export default function Layout({ children }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </>
  )
}
