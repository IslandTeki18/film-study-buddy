import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryState {
  readonly error: Error | null
}

/**
 * A desktop window has no visible console, so an uncaught render error would otherwise show as
 * a blank window. Render the message instead.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children
    return (
      <div className="flex h-screen w-screen items-center justify-center p-8">
        <div className="max-w-lg space-y-2">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <pre className="text-muted-foreground overflow-auto rounded-md border border-border p-3 text-xs whitespace-pre-wrap">
            {error.message}
          </pre>
        </div>
      </div>
    )
  }
}
