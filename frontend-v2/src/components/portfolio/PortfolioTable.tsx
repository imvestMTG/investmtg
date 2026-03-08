import type { PortfolioPosition, ScryfallCard } from '../../lib/types'
import { cardReferencePrice, formatDate, formatPercent, formatUSD, gainLoss, gainLossPct } from '../../lib/utils'

type PortfolioTableProps = {
  positions: PortfolioPosition[]
  cards: ScryfallCard[]
}

export function PortfolioTable({ positions, cards }: PortfolioTableProps) {
  return (
    <div className="panel table-panel">
      <div className="section-title section-title--compact">
        <span>Tracked inventory</span>
        <h2>Position monitor</h2>
        <p>Reference prices are live. Execution stays local.</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Card</th>
              <th>Qty</th>
              <th>Cost</th>
              <th>Reference</th>
              <th>P/L</th>
              <th>Acquired</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const card = cards.find((item) => item.id === position.cardId)
              const current = card ? cardReferencePrice(card) : 0
              const delta = gainLoss(current, position.buyPrice, position.qty)
              const deltaPct = gainLossPct(current, position.buyPrice)

              return (
                <tr key={position.id}>
                  <td>
                    <div className="table-card-cell">
                      <strong>{position.name}</strong>
                      <span>{position.setName}</span>
                    </div>
                  </td>
                  <td>{position.qty}</td>
                  <td>{formatUSD(position.buyPrice)}</td>
                  <td>{formatUSD(current)}</td>
                  <td>
                    <div className={`pill-stat ${delta >= 0 ? 'pill-stat--positive' : 'pill-stat--negative'}`}>
                      {formatUSD(delta)} · {formatPercent(deltaPct)}
                    </div>
                  </td>
                  <td>{formatDate(position.acquiredAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
