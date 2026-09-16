import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('filmStudy', {
  exportReportPdf: (fileName: string) => ipcRenderer.invoke('report:export-pdf', { fileName }),
})
