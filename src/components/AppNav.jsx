const TABS = [
  {
    label: 'Ad slot demos',
    href: '/',
    paths: ['/', '/300x250'],
  },
  {
    label: 'ADM Generator',
    href: '/generator',
    paths: ['/generator'],
  },
]

function AppNav({ currentPath }) {
  return (
    <header className="app-nav">
      <p className="app-nav-brand">Programmatic ad slots</p>
      <nav className="app-nav-tabs" aria-label="Main sections">
        {TABS.map((tab) => {
          const isActive = tab.paths.includes(currentPath)

          return (
            <a
              key={tab.href}
              href={tab.href}
              className={isActive ? 'active' : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
            </a>
          )
        })}
      </nav>
    </header>
  )
}

export default AppNav
