import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from 'react'
import { Button } from './button'

export interface ToastAction { readonly label: string; readonly onAction: () => void }
export interface ToastOptions {
  readonly message: string
  readonly action?: ToastAction
  readonly durationMs?: number
}
interface VisibleToast extends ToastOptions { readonly id: string }
interface ToastContextValue {
  readonly show: (options: ToastOptions) => void
  readonly dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const [toast, setToast] = useState<VisibleToast | null>(null)
  const timer = useRef<number | null>(null)
  const regionRef = useRef<HTMLDivElement>(null)
  const deadline = useRef(0)
  const remaining = useRef(0)

  const dismiss = useCallback((id: string): void => {
    setToast((current) => current?.id === id ? null : current)
  }, [])
  const show = useCallback((options: ToastOptions): void => {
    setToast({ ...options, id: crypto.randomUUID() })
  }, [])

  const resume = useCallback((): void => {
    if (!toast || timer.current !== null) return
    if (regionRef.current?.contains(document.activeElement) || regionRef.current?.matches(':hover')) return
    deadline.current = Date.now() + remaining.current
    timer.current = window.setTimeout(() => dismiss(toast.id), remaining.current)
  }, [dismiss, toast])
  const pause = useCallback((): void => {
    if (timer.current === null) return
    window.clearTimeout(timer.current)
    timer.current = null
    remaining.current = Math.max(0, deadline.current - Date.now())
  }, [])

  useEffect(() => {
    if (!toast) return
    remaining.current = toast.durationMs ?? 8000
    resume()
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [resume, toast])

  const value = useMemo(() => ({ show, dismiss }), [dismiss, show])
  function onBlur(event: FocusEvent<HTMLDivElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget)) resume()
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        ref={regionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="fixed right-4 bottom-4 z-50"
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocusCapture={pause}
        onBlurCapture={onBlur}
      >
        {toast && (
          <div className="flex max-w-sm items-center gap-3 rounded-md border border-border bg-background p-3 text-sm text-foreground shadow-lg">
            <span>{toast.message}</span>
            {toast.action && (
              <Button size="sm" variant="outline" onClick={() => {
                toast.action?.onAction()
                dismiss(toast.id)
              }}>{toast.action.label}</Button>
            )}
            <Button size="sm" variant="ghost" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>×</Button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

// ponytail: one toast at a time; add a stack if two undoable actions ever overlap.
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
