/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

type ExportPdfResult = { status: 'saved'; filePath: string } | { status: 'canceled' } | { status: 'error'; message: string }

interface Window {
  readonly filmStudy?: { exportReportPdf(fileName: string): Promise<ExportPdfResult> }
}
