type EmptyStateProps = {
  title: string
  description: string
  action?: string
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="panel empty-panel">
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <span className="ghost-label">{action}</span> : null}
    </div>
  )
}
