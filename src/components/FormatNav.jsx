const NAV_ITEMS = [
  { href: '/', label: '300x600', path: '/' },
  { href: '/300x250', label: '300x250', path: '/300x250' },
]

function FormatNav({ currentPath }) {
  return (
    <nav className="format-nav" aria-label="Ad format pages">
      {NAV_ITEMS.map((item) => (
        <a
          key={item.path}
          href={item.href}
          aria-current={currentPath === item.path ? 'page' : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}

export default FormatNav
