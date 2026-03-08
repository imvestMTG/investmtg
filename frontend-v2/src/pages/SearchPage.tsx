import { Activity, Search as SearchIcon, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'
import { marketPulse } from '../data/mockData'
import { useCardSearch } from '../hooks/useCardSearch'
import { EmptyState } from '../components/ui/EmptyState'
import { LoadingCard } from '../components/ui/LoadingCard'
import { SearchHero } from '../components/search/SearchHero'
import { SearchResults } from '../components/search/SearchResults'
import { StatCard } from '../components/ui/StatCard'

export function SearchPage() {
  const [query, setQuery] = useState('Rhystic Study')
  const searchQuery = useCardSearch(query)

  const cards = useMemo(() => searchQuery.data?.slice(0, 8) ?? [], [searchQuery.data])

  return (
    <div className="page-stack">
      <SearchHero query={query} onQueryChange={setQuery} />

      <section className="stats-grid">
        {marketPulse.map((item, index) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            hint={item.note}
            icon={index === 0 ? <SearchIcon size={16} /> : index === 1 ? <Activity size={16} /> : <Zap size={16} />}
          />
        ))}
      </section>

      <section className="page-section">
        <div className="section-title section-title--compact">
          <span>Search results</span>
          <h2>Reference layer</h2>
          <p>Fast search, compact cards, and cleaner actions than the old single-file shell.</p>
        </div>

        {searchQuery.isLoading ? (
          <div className="results-grid">
            {Array.from({ length: 4 }).map((_, index) => (
              <LoadingCard key={index} />
            ))}
          </div>
        ) : searchQuery.isError ? (
          <EmptyState
            title="Search is temporarily unavailable"
            description="The shell is ready, but the pricing lookup failed. Retry and the page state stays intact."
            action="Scryfall fetch error"
          />
        ) : cards.length ? (
          <SearchResults cards={cards} />
        ) : (
          <EmptyState
            title="Search a card to start"
            description="The new search view is built to stay focused on real MTG inventory and route every action into Guam-only selling."
          />
        )}
      </section>
    </div>
  )
}
