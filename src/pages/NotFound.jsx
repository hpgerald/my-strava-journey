import { Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import Container from '../components/Container.jsx'

export default function NotFound({ message }) {
  return (
    <Layout>
      <Container>
        <div style={{ paddingBlock: 'var(--sp-9)' }}>
          <p className="eyebrow">404</p>
          <h1 className="display" style={{ fontSize: 'var(--fs-3xl)', margin: 'var(--sp-3) 0' }}>
            Nothing here.
          </h1>
          <p className="measure text-muted">
            {message || 'That page does not exist in this dataset.'}
          </p>
          <p style={{ marginTop: 'var(--sp-5)' }}>
            <Link to="/" className="mono" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
              ← Back to the start
            </Link>
          </p>
        </div>
      </Container>
    </Layout>
  )
}
