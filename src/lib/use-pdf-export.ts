import { useState } from 'react'
import { useToast } from '@/components/ui/toast'

/** Exports the current printable route through the desktop app's printToPDF IPC. */
export function usePdfExport(): { readonly pending: boolean; readonly available: boolean; readonly exportPdf: (fileName: string) => Promise<void> } {
  const { show } = useToast()
  const [pending, setPending] = useState(false)
  async function exportPdf(fileName: string): Promise<void> {
    if (!window.filmStudy || pending) return
    setPending(true)
    try {
      const result = await window.filmStudy.exportReportPdf(fileName)
      if (result.status === 'saved') show({ message: `Saved PDF to ${result.filePath}` })
      else if (result.status === 'error') show({ message: `Could not export PDF. ${result.message}` })
    } catch (error) {
      show({ message: `Could not export PDF. ${error instanceof Error ? error.message : String(error)}` })
    } finally { setPending(false) }
  }
  return { pending, available: !!window.filmStudy, exportPdf }
}
