import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application component tree:', error, errorInfo)
    this.setState({ errorInfo })
  }

  private handleResetCache = () => {
    try {
      localStorage.removeItem('kornet-logistics-storage')
      localStorage.removeItem('kornet-auth-storage')
      localStorage.removeItem('kornet-company-storage')
    } catch (e) {
      console.error('Failed to clear storage:', e)
    }
    window.location.href = '/logistics'
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-xl w-full p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-3xl">error</span>
            </div>

            <div>
              <h2 className="text-2xl font-black tracking-tight text-white">Application Encountered an Error</h2>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                An unexpected runtime error occurred while rendering the workspace. You can reload the page or reset the local cache to restore standard operation.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-left overflow-x-auto max-h-48 text-[11px] font-mono text-red-300">
                <strong>Error:</strong> {this.state.error.toString()}
                {this.state.errorInfo && (
                  <pre className="mt-2 text-[10px] text-slate-500 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Reload Page
              </button>
              <button
                onClick={this.handleResetCache}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                Reset Local Storage & Cache
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
