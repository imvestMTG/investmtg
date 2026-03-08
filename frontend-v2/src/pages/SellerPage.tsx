import { HandCoins, Map, Shield, Truck } from 'lucide-react'
import { draftListing, guamZones, sellerTasks } from '../data/mockData'
import { SellerChecklist } from '../components/seller/SellerChecklist'
import { StatCard } from '../components/ui/StatCard'

export function SellerPage() {
  return (
    <div className="page-stack">
      <section className="seller-hero panel">
        <div>
          <span className="eyebrow">Sell flow rewrite</span>
          <h2>Guide sellers through a cleaner Guam-first listing process.</h2>
          <p>
            The old no-feedback listing button becomes a deliberate workflow with local meetup zones, delivery rules,
            and clearer trust expectations.
          </p>
        </div>
        <div className="seller-hero__stats chip-row">
          <span className="chip chip--accent"><Shield size={14} /> Verified seller prompts</span>
          <span className="chip"><Truck size={14} /> Island delivery controls</span>
          <span className="chip"><Map size={14} /> Meetup zone visibility</span>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Draft price" value={`$${draftListing.price}`} hint={draftListing.cardName} icon={<HandCoins size={16} />} />
        <StatCard label="Condition" value={draftListing.condition} hint={draftListing.setName} icon={<Shield size={16} />} />
        <StatCard label="Fulfillment" value={draftListing.fulfillment.length === 2 ? 'Pickup + delivery' : 'Pickup only'} hint={draftListing.location} icon={<Truck size={16} />} />
      </section>

      <section className="seller-grid">
        <article className="panel seller-form-card">
          <div className="section-title section-title--compact">
            <span>Draft listing</span>
            <h2>{draftListing.cardName}</h2>
            <p>Prototype of the form state the production flow should manage.</p>
          </div>

          <div className="form-preview">
            <label>
              <span>Set</span>
              <input value={draftListing.setName} readOnly />
            </label>
            <label>
              <span>Condition</span>
              <input value={draftListing.condition} readOnly />
            </label>
            <label>
              <span>Price</span>
              <input value={`$${draftListing.price}`} readOnly />
            </label>
            <label>
              <span>Meetup zone</span>
              <input value={draftListing.location} readOnly />
            </label>
            <label className="form-preview__full">
              <span>Seller notes</span>
              <textarea value={draftListing.notes} readOnly rows={5} />
            </label>
          </div>
        </article>

        <article className="panel seller-zones-card">
          <div className="section-title section-title--compact">
            <span>Coverage map</span>
            <h2>Guam delivery zones</h2>
            <p>Make delivery promises explicit before buyers message the seller.</p>
          </div>
          <div className="zone-list">
            {guamZones.map((zone) => (
              <div key={zone.name} className="zone-item">
                <strong>{zone.name}</strong>
                <p>{zone.coverage}</p>
                <span>{zone.eta}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <SellerChecklist tasks={sellerTasks} />
    </div>
  )
}
