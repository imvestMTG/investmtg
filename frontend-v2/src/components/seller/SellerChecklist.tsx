import type { SellerTask } from '../../lib/types'

type SellerChecklistProps = {
  tasks: SellerTask[]
}

export function SellerChecklist({ tasks }: SellerChecklistProps) {
  return (
    <div className="panel checklist-panel">
      <div className="section-title section-title--compact">
        <span>Seller workflow</span>
        <h2>Go-live checklist</h2>
        <p>Surface the exact things that make Guam handoffs smooth.</p>
      </div>
      <div className="checklist">
        {tasks.map((task) => (
          <article key={task.label} className={`checklist-item ${task.done ? 'is-done' : ''}`}>
            <div className="checklist-dot" aria-hidden="true" />
            <div>
              <strong>{task.label}</strong>
              <p>{task.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
