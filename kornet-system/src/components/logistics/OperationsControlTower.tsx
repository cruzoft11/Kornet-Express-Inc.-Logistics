import { AlertTriangle, ArrowRight, CheckCircle2, FolderOpen, Landmark, LayoutDashboard, RefreshCw, Truck, Waves, Wind, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useLogisticsStore } from '../../stores/logisticsStore'
import { useIntegrationsStore } from '../../stores/integrationsStore'

interface Props {
  onOpenModule: (module: 'ocean' | 'air' | 'vehicles' | 'pd' | 'fleet' | 'bridge' | 'tracking') => void
}

function Metric({ label, value, detail, icon, tone = 'blue', onClick }: { label: string; value: number; detail: string; icon: React.ReactNode; tone?: 'blue' | 'red' | 'green' | 'amber'; onClick: () => void }) {
  return (
    <motion.button type="button" onClick={onClick} className={`stitch-metric stitch-metric-${tone}`} whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}>
      <div className="stitch-metric-head"><span>{label}</span>{icon}</div>
      <strong>{value}</strong>
      <span className="stitch-metric-detail">{detail}</span>
    </motion.button>
  )
}

export default function OperationsControlTower({ onOpenModule }: Props) {
  const { shipments, vehicles, pdOrders, bridgeQueue, dispatchRoutes, trackingItems } = useLogisticsStore()
  const integrations = useIntegrationsStore((state) => state.items)
  const openFiles = shipments.filter((shipment) => shipment.status === 'Open').length
  const inTransit = shipments.filter((shipment) => /transit/i.test(shipment.status)).length + trackingItems.filter((item) => /transit/i.test(item.currentStatus)).length
  const vehicleHolds = vehicles.filter((vehicle) => vehicle.status === 'Hold' || vehicle.customsTitleRejected).length
  const pendingPd = pdOrders.filter((order) => !/completed|delivered/i.test(order.status)).length
  const dispatchAttention = dispatchRoutes.filter((route) => /draft|arrived/i.test(route.status)).length
  const bridgePending = bridgeQueue.filter((item) => item.status !== 'Posted').length
  const connectedIntegrations = integrations.filter((integration) => integration.status === 'connected').length
  const activeAlerts = vehicleHolds + dispatchAttention

  return (
    <div className="stitch-control-tower">
      <section className="stitch-context-bar">
        <div>
          <div className="stitch-eyebrow"><span /> OPERATIONS CONTROL TOWER</div>
          <h1>Live operational overview</h1>
          <p>Company-scoped activity across freight, fleet, customer visibility, and accounting handoff.</p>
        </div>
        <div className="stitch-context-meta">
          <span className="stitch-live-dot" />
          <span>Live records</span>
          <span className="stitch-code">KORNET / CONTROL</span>
        </div>
      </section>

      <section className="stitch-metrics-grid" aria-label="Operational metrics">
        <Metric label="Open files" value={openFiles} detail={`${shipments.length} total shipments`} icon={<FolderOpen size={17} />} onClick={() => onOpenModule('ocean')} />
        <Metric label="In transit" value={inTransit} detail="Shipments and tracking" icon={<Waves size={17} />} onClick={() => onOpenModule('tracking')} />
        <Metric label="Vehicles on hold" value={vehicleHolds} detail="Customs or title review" icon={<AlertTriangle size={17} />} tone="red" onClick={() => onOpenModule('vehicles')} />
        <Metric label="Pending P/D" value={pendingPd} detail="Awaiting completion" icon={<Truck size={17} />} onClick={() => onOpenModule('pd')} />
        <Metric label="Dispatch attention" value={dispatchAttention} detail="Routes needing action" icon={<Wind size={17} />} tone="amber" onClick={() => onOpenModule('fleet')} />
        <Metric label="Bridge queue" value={bridgePending} detail="Ready for posting" icon={<Landmark size={17} />} onClick={() => onOpenModule('bridge')} />
      </section>

      <section className="stitch-section-header">
        <div className="stitch-section-title"><span className="stitch-section-icon stitch-section-icon-red"><AlertTriangle size={16} /></span><div><h2>Operational priorities</h2><p>{activeAlerts ? `${activeAlerts} records require attention` : 'No active operational exceptions'}</p></div></div>
        <button type="button" className="stitch-secondary-button"><RefreshCw size={14} /> Refresh view</button>
      </section>

      <section className="stitch-priority-grid">
        <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className={vehicleHolds ? 'stitch-priority stitch-priority-red' : 'stitch-priority stitch-priority-clear'}>
          <div className="stitch-priority-label">CUSTOMS / TITLE REVIEW</div>
          <h3>{vehicleHolds ? `${vehicleHolds} vehicle${vehicleHolds === 1 ? '' : 's'} on hold` : 'Vehicle staging is clear'}</h3>
          <p>{vehicleHolds ? 'Review customs or title records before assigning affected units to a container.' : 'No staged vehicle is currently blocked by a customs or title hold.'}</p>
          <button type="button" onClick={() => onOpenModule('vehicles')}>{vehicleHolds ? 'Review holds' : 'Open staging'} <ArrowRight size={14} /></button>
        </motion.article>
        <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className={dispatchAttention ? 'stitch-priority stitch-priority-amber' : 'stitch-priority stitch-priority-clear'}>
          <div className="stitch-priority-label">FLEET / DISPATCH</div>
          <h3>{dispatchAttention ? `${dispatchAttention} route${dispatchAttention === 1 ? '' : 's'} need attention` : 'Dispatch routes are current'}</h3>
          <p>{dispatchAttention ? 'Review draft or arrival-stage routes and confirm the next operational handoff.' : 'No route is currently waiting for an operational transition.'}</p>
          <button type="button" onClick={() => onOpenModule('fleet')}>{dispatchAttention ? 'Open dispatch' : 'View fleet'} <ArrowRight size={14} /></button>
        </motion.article>
        <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="stitch-priority stitch-priority-blue">
          <div className="stitch-priority-label">INTEGRATION GATEWAY</div>
          <h3>{connectedIntegrations} connected service{connectedIntegrations === 1 ? '' : 's'}</h3>
          <p>{integrations.length ? `${integrations.length - connectedIntegrations} integration${integrations.length - connectedIntegrations === 1 ? '' : 's'} require configuration or attention.` : 'Integration status is still loading for this company.'}</p>
          <button type="button" onClick={() => useIntegrationsStore.getState().openSettings()}>Open integrations <ArrowRight size={14} /></button>
        </motion.article>
      </section>

      <section className="stitch-section-header stitch-section-header-spaced">
        <div className="stitch-section-title"><span className="stitch-section-icon stitch-section-icon-blue"><LayoutDashboard size={16} /></span><div><h2>Live activity stream</h2><p>Most recent operational records from the current company</p></div></div>
        <span className="stitch-code">{shipments.length + trackingItems.length} records loaded</span>
      </section>
      <section className="stitch-activity-panel">
        {shipments.slice(0, 5).map((shipment) => (
          <button key={shipment.id || shipment.fileNo} type="button" onClick={() => onOpenModule(shipment.type.startsWith('Air') ? 'air' : 'ocean')} className="stitch-activity-row">
            <span className="stitch-activity-marker"><CheckCircle2 size={14} /></span>
            <span className="stitch-activity-code">{shipment.fileNo}</span>
            <span className="stitch-activity-description">{shipment.shipper || 'Shipment'} <span>to</span> {shipment.consignee || 'consignee not provided'}</span>
            <span className="stitch-status-pill">{shipment.status}</span>
            <ArrowRight size={14} />
          </button>
        ))}
        {!shipments.length && <div className="stitch-empty-state"><XCircle size={23} /><span>No shipment activity is loaded for this company.</span></div>}
      </section>
    </div>
  )
}
