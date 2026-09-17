interface PageHeaderProps {
  breadcrumb?: string        // e.g. "TRANSACTION LEDGER / FY 2023-24"
  title: string              // e.g. "Voucher Entry"
  subtitle?: string
  actions?: React.ReactNode  // e.g. Posting Preview + Save & Post buttons
}

export default function PageHeader({ breadcrumb, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        {breadcrumb && (
          <div className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mb-1.5">
            {breadcrumb}
          </div>
        )}
        <h1 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-on-surface-variant mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 flex-shrink-0 ml-6">
          {actions}
        </div>
      )}
    </div>
  )
}
