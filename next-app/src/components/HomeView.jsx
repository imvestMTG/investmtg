/**
 * HomeView.jsx — Homepage with live backend prices (modern JSX + Tailwind)
 * Port of production components/HomeView.js
 */
import React, { useState, useEffect } from 'react';
import { fetchFeatured, fetchTrending, fetchBudget, formatUSD } from '../utils/api';

// Placeholder components until full port is done
function CardCarousel({ cards, label }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
      {cards.map((card) => (
        <a
          key={card.id}
          href={`#card/${card.id}`}
          className="snap-start shrink-0 w-48 group"
        >
          <div className="relative overflow-hidden rounded-xl bg-surface-2 border border-border shadow-md transition-transform duration-200 group-hover:scale-[1.03] group-hover:shadow-lg">
            <img
              src={card.image_uris?.small || card.image_small || ''}
              alt={card.name}
              className="w-full aspect-[5/7] object-cover"
              loading="lazy"
            />
            <div className="p-3">
              <h3 className="text-sm font-semibold text-text truncate">{card.name}</h3>
              <p className="text-xs text-text-muted">{card.set_name}</p>
              <p className="text-sm font-bold text-primary mt-1">
                {formatUSD(card.prices?.usd || card.price_usd)}
              </p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="w-48 shrink-0 animate-pulse">
          <div className="aspect-[5/7] bg-surface-2 rounded-xl" />
          <div className="mt-2 h-3 bg-surface-2 rounded w-3/4" />
          <div className="mt-1 h-3 bg-surface-2 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="text-center px-4 py-3">
      <div className="text-lg font-bold text-primary">{value}</div>
      <div className="text-xs text-text-muted uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function HomeView() {
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [budget, setBudget] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroSearch, setHeroSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchFeatured(), fetchTrending(), fetchBudget()])
      .then(([f, t, b]) => {
        if (!cancelled) {
          setFeatured(f);
          setTrending(t);
          setBudget(b);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function handleHeroSearch(e) {
    e.preventDefault();
    if (heroSearch.trim()) {
      window.location.hash = 'search';
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('investmtg-search', { detail: heroSearch }));
      }, 50);
    }
  }

  const stats = [
    { value: 'Real Prices', label: 'No Guesswork' },
    { value: 'Guam Built', label: 'For The Island' },
    { value: 'Live Data', label: 'Every Visit' },
    { value: '100% Free', label: 'Always' },
  ];

  return (
    <div>
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0d0d0d] via-bg to-bg py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display text-text mb-4 tracking-tight">
          Know What Your Cards Are Worth
        </h1>
        <p className="text-lg text-text-muted max-w-2xl mx-auto mb-8 leading-relaxed">
          Guam's MTG marketplace with live market pricing, portfolio tracking, and zero markup.
          Real cards. Real data. Fair play.
        </p>

        {/* Search bar */}
        <form onSubmit={handleHeroSearch} className="relative max-w-xl mx-auto mb-10">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            type="search"
            placeholder="Search any printed Magic card..."
            value={heroSearch}
            onChange={(e) => setHeroSearch(e.target.value)}
            aria-label="Search cards"
            className="w-full pl-12 pr-4 py-4 bg-surface border border-border rounded-2xl text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-base"
          />
        </form>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-6">
          {stats.map((s) => (
            <StatCard key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </section>

      {/* ── Card Carousels ── */}
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
        {/* Featured */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">✨</span>
            <div>
              <h2 className="text-2xl font-bold text-text">Featured Cards</h2>
              <p className="text-sm text-text-muted">High-value Reserved List and Legacy staples</p>
            </div>
          </div>
          {loading ? <SkeletonRow /> : <CardCarousel cards={featured} label="Featured" />}
        </section>

        {/* Trending */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">📈</span>
            <div>
              <h2 className="text-2xl font-bold text-text">Trending Now</h2>
              <p className="text-sm text-text-muted">Hot picks moving the market this week</p>
            </div>
          </div>
          {loading ? <SkeletonRow /> : <CardCarousel cards={trending} label="Trending" />}
        </section>

        {/* Budget */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">⭐</span>
            <div>
              <h2 className="text-2xl font-bold text-text">Budget Staples</h2>
              <p className="text-sm text-text-muted">Powerful cards that won't break the bank</p>
            </div>
          </div>
          {loading ? <SkeletonRow /> : <CardCarousel cards={budget} label="Budget" />}
        </section>
      </div>
    </div>
  );
}
