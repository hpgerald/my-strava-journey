export default function Tag({ children, solid = false, className = '' }) {
  return <span className={`tag ${solid ? 'tag--solid' : ''} ${className}`.trim()}>{children}</span>
}
