interface KornetLoaderProps {
  label?: string
  fullScreen?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function KornetLoader({ label, fullScreen = false, size = 'md' }: KornetLoaderProps) {
  const scale = size === 'sm' ? 0.6 : size === 'lg' ? 1.3 : 1

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className="kornet-loader-wrapper relative"
        style={{
          width: `${150 * scale}px`,
          height: `${150 * scale}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
        role="status"
        aria-label={label || 'Loading Kornet Express operations'}
      >
        <style>{`
          @keyframes kne-spin {
            to { transform: rotate(360deg); }
          }
          @keyframes kne-reverseSpin {
            to { transform: rotate(-360deg); }
          }
          @keyframes kne-orbit {
            from { transform: rotate(0deg) translateX(31px); }
            to { transform: rotate(360deg) translateX(31px); }
          }
          @keyframes kne-pulse {
            0%, 100% { transform: scale(0.92); opacity: 0.92; }
            50% { transform: scale(1); opacity: 1; }
          }
          .kne-ring {
            position: absolute;
            inset: 18px;
            border-radius: 50%;
            border: 5px solid rgba(7, 85, 143, 0.12);
            border-top-color: #07558f;
            border-right-color: #d71920;
            border-bottom-color: #806b6b;
            animation: kne-spin 1.15s cubic-bezier(.55,.08,.35,.92) infinite;
          }
          .kne-inner-ring {
            position: absolute;
            inset: 38px;
            border-radius: 50%;
            border: 3px solid rgba(128, 107, 107, 0.15);
            border-left-color: #07558f;
            border-bottom-color: #d71920;
            animation: kne-reverseSpin 0.8s linear infinite;
          }
          .kne-particle {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            top: 71px;
            left: 71px;
            transform-origin: 4px 4px;
          }
          .kne-p1 { background: #07558f; animation: kne-orbit 1.8s linear infinite; }
          .kne-p2 { background: #d71920; animation: kne-orbit 1.8s linear -0.6s infinite; }
          .kne-p3 { background: #806b6b; animation: kne-orbit 1.8s linear -1.2s infinite; }
          .kne-center {
            position: absolute;
            inset: 58px;
            border-radius: 50%;
            background: white;
            box-shadow: 0 4px 18px rgba(7, 85, 143, 0.18);
            animation: kne-pulse 1.15s ease-in-out infinite;
            display: grid;
            place-items: center;
          }
        `}</style>

        <div className="kne-ring" />
        <div className="kne-inner-ring" />

        <div className="kne-particle kne-p1" />
        <div className="kne-particle kne-p2" />
        <div className="kne-particle kne-p3" />

        <div className="kne-center">
          <img
            src="/brand/kornet-express-logo.png"
            alt="Kornet Express, Inc."
            className="w-5 h-5 object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none'
            }}
          />
        </div>
      </div>

      {label && (
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 font-sans tracking-wide animate-pulse">
          {label}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
        {content}
      </div>
    )
  }

  return content
}
