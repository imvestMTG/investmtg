/**
 * App.jsx — Root app component (dev/next branch)
 * Simplified shell for incremental porting.
 */
import React from 'react';
import HomeView from './components/HomeView';

export default function App() {
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header placeholder */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-2xl font-bold font-display text-primary tracking-tight">
            investMTG
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-text-muted">
            <a href="#search" className="hover:text-text transition-colors">Search</a>
            <a href="#store" className="hover:text-text transition-colors">Store</a>
            <a href="#movers" className="hover:text-text transition-colors">Market</a>
            <a href="#portfolio" className="hover:text-text transition-colors">Portfolio</a>
          </nav>
          <div className="flex items-center gap-3">
            <a href="#cart" className="text-text-muted hover:text-text transition-colors" aria-label="Cart">
              🛒
            </a>
            <span className="px-3 py-1.5 text-xs font-semibold bg-warning/10 text-warning rounded-full">
              DEV
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>
        <HomeView />
      </main>

      {/* Footer placeholder */}
      <footer className="border-t border-border py-8 text-center text-xs text-text-muted">
        <p>investMTG — The Fair Play Economy</p>
        <p className="mt-1">Development Preview (next branch)</p>
      </footer>
    </div>
  );
}
