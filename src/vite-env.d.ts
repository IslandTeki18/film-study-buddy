/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string
  /** Clerk publishable key; sign-in is enabled only when set. */
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

type ExportPdfResult = { status: 'saved'; filePath: string } | { status: 'canceled' } | { status: 'error'; message: string }

interface Window {
  readonly filmStudy?: { exportReportPdf(fileName: string): Promise<ExportPdfResult> }
}
