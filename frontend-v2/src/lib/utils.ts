import type { ScryfallCard } from './types'

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function formatUSD(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

export function cardReferencePrice(card: ScryfallCard) {
  return Number(card.prices.usd ?? card.prices.usd_foil ?? 0)
}

export function cardFoilPrice(card: ScryfallCard) {
  return Number(card.prices.usd_foil ?? 0)
}

export function cardImage(card: ScryfallCard, size: 'small' | 'normal' = 'normal') {
  return card.image_uris?.[size] ?? card.card_faces?.[0]?.image_uris?.[size] ?? ''
}

export function gainLoss(current: number, buy: number, qty = 1) {
  return (current - buy) * qty
}

export function gainLossPct(current: number, buy: number) {
  if (!buy) return 0
  return ((current - buy) / buy) * 100
}

export function formatPercent(value: number) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}
