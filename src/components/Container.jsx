export default function Container({ children, as: Tag = 'div', className = '', ...rest }) {
  return (
    <Tag className={`container ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  )
}
