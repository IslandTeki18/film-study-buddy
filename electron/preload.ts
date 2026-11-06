import { contextBridge, ipcRenderer } from 'electron'
import { exposeClerkBridge } from '@clerk/electron/preload'

contextBridge.exposeInMainWorld('filmStudy', {
  exportReportPdf: (fileName: string) => ipcRenderer.invoke('report:export-pdf', { fileName }),
})

// Token storage and OAuth transport for @clerk/electron/react.
exposeClerkBridge()
