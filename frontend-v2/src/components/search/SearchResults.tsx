import type { ScryfallCard } from '../../lib/types'
import { routeHref } from '../../app/router'
import { cardImage, cardReferencePrice, formatUSD } from '../../lib/utils'

type SearchResultsProps = {
  cards: ScryfallCard[]
}

export function SearchResults({ cards }: SearchResultsProps) {
  return (
    <div className="results-grid">
      {cards.map((card) => (
        <article key={card.id} className="result-card">
          <img src={cardImage(card, 'small')} alt={card.name} />
          <div className="result-card__body">
            <div className="result-card__topline">
              <div>
                <h3>{card.name}</h3>
                <p>
                  {card.set_name} · #{card.collector_number} · {card.rarity}
                </p>
              </div>
              <strong>{formatUSD(cardReferencePrice(card))}</strong>
            </div>
            <p className="result-card__excerpt">Reference pricing from Scryfall. Real checkout paths stay inside Guam-only listing flow.</p>
            <div className="chip-row">
              <span className="chip chip--accent">Reference market</span>
              <span className="chip">Local listing ready</span>
            </div>
            <div className="result-card__actions">
              <a className="button button--primary" href={routeHref({ name: 'card', cardId: card.id })}>
                Open card
              </a>
              <a className="button button--secondary" href={routeHref({ name: 'sell' })}>
                List similar
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
