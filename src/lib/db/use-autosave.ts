import { useCallback, useEffect, useRef, useState } from 'react'

export interface AutosaveOptions { readonly delayMs?: number }
export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'error'

export function useAutosave<T>(
  value: T,
  save: (next: T) => Promise<void>,
  options?: AutosaveOptions,
): {
  readonly draft: T
  readonly setDraft: (next: T) => void
  readonly flush: () => void
  readonly status: AutosaveStatus
} {
  const [draft, updateDraft] = useState(value)
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const draftRef = useRef(value)
  const saveRef = useRef(save)
  const timerRef = useRef<number | null>(null)
  const dirtyRef = useRef(false)
  const savingRef = useRef(false)
  const queuedRef = useRef(false)
  const versionRef = useRef(0)
  const inFlightVersionRef = useRef(-1)
  const mountedRef = useRef(true)
  const flushRef = useRef<() => void>(() => undefined)
  const delayMs = options?.delayMs ?? 400

  saveRef.current = save

  const flush = useCallback((): void => flushRef.current(), [])

  flushRef.current = (): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (!dirtyRef.current) return
    if (savingRef.current) {
      if (versionRef.current !== inFlightVersionRef.current) queuedRef.current = true
      return
    }

    const savedDraft = draftRef.current
    const savedVersion = versionRef.current
    savingRef.current = true
    inFlightVersionRef.current = savedVersion
    queuedRef.current = false
    if (mountedRef.current) setStatus('saving')

    let result: Promise<void>
    try {
      result = saveRef.current(savedDraft)
    } catch (error) {
      result = Promise.reject(error)
    }
    void Promise.resolve(result).then(() => {
      savingRef.current = false
      if (queuedRef.current) {
        flushRef.current()
      } else if (versionRef.current === savedVersion && Object.is(draftRef.current, savedDraft)) {
        dirtyRef.current = false
        if (mountedRef.current) setStatus('idle')
      }
    }).catch((error: unknown) => {
      savingRef.current = false
      console.error('Autosave failed', error)
      if (queuedRef.current && versionRef.current !== savedVersion) {
        flushRef.current()
      } else if (mountedRef.current) {
        setStatus('error')
      }
    })
  }

  const setDraft = useCallback((next: T): void => {
    draftRef.current = next
    versionRef.current += 1
    dirtyRef.current = true
    updateDraft(next)
    setStatus('pending')
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => flushRef.current(), delayMs)
  }, [delayMs])

  useEffect(() => {
    if (!dirtyRef.current) {
      draftRef.current = value
      updateDraft(value)
    }
  }, [value])

  useEffect(() => {
    mountedRef.current = true
    const onBeforeUnload = (): void => flushRef.current()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      mountedRef.current = false
      window.removeEventListener('beforeunload', onBeforeUnload)
      flushRef.current()
    }
  }, [])

  return { draft, setDraft, flush, status }
}
