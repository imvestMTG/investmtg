import type { ScryfallCard } from '../../lib/types'
import { cardFoilPrice, cardReferencePrice, formatUSD } from '../../lib/utils'

type PrintingsTableProps = {
  printings: ScryfallCard[]
}

export function PrintingsTable({ printings }: PrintingsTableProps) {
  return (
    <div className="panel table-panel">
      <div className="section-title section-title--compact">
        <span>Print ladder</span>
        <h2>Recent printings</h2>
        <p>Use this as a pricing anchor before setting Guam listing spread.</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Set</th>
              <th>No.</th>
              <th>Market</th>
              <th>Foil</th>
            </tr>
          </thead>
          <tbody>
            {printings.slice(0, 8).map((printing) => (
              <tr key={printing.id}>
                <td>{printing.set_name}</td>
                <td>#{printing.collector_number}</td>
                <td>{formatUSD(cardReferencePrice(printing))}</td>
                <td>{formatUSD(cardFoilPrice(printing))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
