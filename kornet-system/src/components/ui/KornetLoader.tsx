import { cn } from '@/lib/cn'

export interface KornetLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  label?: string
  fullScreen?: boolean
  className?: string
}

export function KornetLoader({
  size = 'md',
  text,
  label,
  fullScreen = false,
  className,
}: KornetLoaderProps) {
  const displayText = label || text
  // Scale mapping relative to base 150px
  const scaleMap = {
    sm: 'scale-[0.3] -m-12',
    md: 'scale-[0.55] -m-8',
    lg: 'scale-[0.85] -m-2',
    xl: 'scale-100',
  }

  const loaderContent = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className={cn('kne-loader-wrapper relative flex items-center justify-center', scaleMap[size])}>
        <div className="kne-loader" aria-label="Loading" role="status">
          <div className="kne-ring" />
          <div className="kne-inner-ring" />
          <div className="kne-particle kne-particle-1" />
          <div className="kne-particle kne-particle-2" />
          <div className="kne-particle kne-particle-3" />
          <div className="kne-center" />
        </div>
      </div>
      {displayText && (
        <p className="animate-pulse text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {displayText}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-modal flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
        {loaderContent}
      </div>
    )
  }

  return loaderContent
}

export default KornetLoader
