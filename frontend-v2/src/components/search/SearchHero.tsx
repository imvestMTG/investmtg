import { ArrowRight, ShieldCheck, Truck } from 'lucide-react'

type SearchHeroProps = {
  query: string
  onQueryChange: (value: string) => void
}

export function SearchHero({ query, onQueryChange }: SearchHeroProps) {
  return (
    <section className="hero-card">
      <div className="hero-copy">
        <span className="eyebrow">Guam search flow</span>
        <h2>Search staples, price them fast, and route buyers into local fulfillment.</h2>
        <p>
          The new shell treats Scryfall pricing as a reference layer, then pushes every real action into Guam pickup,
          island delivery, and trusted seller messaging.
        </p>
        <div className="hero-actions">
          <label className="search-input" aria-label="Search cards">
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search cards, sets, or commanders"
            />
            <ArrowRight size={18} />
          </label>
          <div className="chip-row">
            <span className="chip chip--accent"><ShieldCheck size={14} /> Verified sellers</span>
            <span className="chip"><Truck size={14} /> Guam delivery only</span>
          </div>
        </div>
      </div>
      <div className="hero-side panel">
        <span className="eyebrow">Rewrite priorities</span>
        <ul className="metric-list">
          <li><strong>Faster search</strong><span>Live results with stable page state</span></li>
          <li><strong>Real trust signals</strong><span>Seller verification, reply time, meetup zones</span></li>
          <li><strong>No global clutter</strong><span>Removed Europe-first purchase paths and noise</span></li>
        </ul>
      </div>
    </section>
  )
}
