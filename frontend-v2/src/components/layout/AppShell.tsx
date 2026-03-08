import { Bell, MoonStar, Search, ShieldCheck, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { routeHref, useRoute } from '../../app/router'
import { useTheme } from '../../hooks/useTheme'

const primaryNav = [
  { route: { name: 'search' as const }, label: 'Search', detail: 'Cards and listings', icon: Search },
  { route: { name: 'portfolio' as const }, label: 'Portfolio', detail: 'Track value', icon: WalletCards },
  { route: { name: 'sell' as const }, label: 'Sell', detail: 'Guam listing flow', icon: ShieldCheck },
]

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { theme, toggleTheme } = useTheme()
  const currentRoute = useRoute()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4">
              <path d="M14 44 32 14l18 30" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M23 44h18" strokeLinecap="round" />
              <path d="M32 24v25" strokeLinecap="round" />
              <circle cx="32" cy="18" r="4" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div>
            <strong>investMTG</strong>
            <span>Guam-only marketplace</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {primaryNav.map((item) => {
            const Icon = item.icon
            const isActive = currentRoute.name === item.route.name

            return (
              <a key={item.label} href={routeHref(item.route)} className={`nav-link ${isActive ? 'is-active' : ''}`}>
                <Icon size={18} />
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
              </a>
            )
          })}
        </nav>

        <div className="sidebar-panel">
          <span className="eyebrow">Trust model</span>
          <h3>Pickup and island delivery first</h3>
          <p>Guam-only fulfillment, verified sellers, and cleaner local listing signals replace the old global marketplace framing.</p>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div>
            <span className="eyebrow">Production rewrite preview</span>
            <h1>Modern front end for fair local MTG trade</h1>
          </div>
          <div className="topbar-actions">
            <span className="status-pill">Guam only</span>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              <MoonStar size={18} />
            </button>
          </div>
        </header>

        <main className="content-area">{children}</main>

        <footer className="site-footer">
          <p>Built for Guam players with transparent pricing and local seller trust.</p>
          <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer">
            Created with Perplexity Computer
          </a>
        </footer>
      </div>
    </div>
  )
}
