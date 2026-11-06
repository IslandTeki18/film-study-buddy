import { isAbsolute, join, relative, resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, Menu, shell, nativeTheme, ipcMain, dialog, net, protocol, type IpcMainInvokeEvent, type MenuItemConstructorOptions } from 'electron'
import { createClerkBridge } from '@clerk/electron'
import { storage } from '@clerk/electron/storage'

const isDev = !app.isPackaged

// Clerk rejects file:// as an origin, so the packaged renderer is served from this scheme.
const RENDERER_SCHEME = 'film-study-buddy'
const RENDERER_HOST = 'renderer'
const rendererRoot = join(__dirname, '../renderer')
const devServerUrl = isDev ? process.env['ELECTRON_RENDERER_URL'] : undefined
const rendererUrl = devServerUrl ?? `${RENDERER_SCHEME}://${RENDERER_HOST}/`

// Must run before app.ready: registers the scheme as privileged, token IPC, and the OAuth deep link.
const clerk = createClerkBridge({ storage: storage(), renderer: { scheme: RENDERER_SCHEME, host: RENDERER_HOST } })

// `new URL(...).origin` is 'null' for a custom scheme, so compare scheme and host.
function originOf(url: string): string {
  const parsed = new URL(url)
  return `${parsed.protocol}//${parsed.host}`
}

function registerRendererProtocol(): void {
  protocol.handle(RENDERER_SCHEME, async (request) => {
    const url = new URL(request.url)
    if (url.host !== RENDERER_HOST) return new Response('Not found', { status: 404 })
    let requested: string
    try { requested = decodeURIComponent(url.pathname) } catch { return new Response('Bad request', { status: 400 }) }
    const file = resolve(rendererRoot, `.${requested}`)
    const inside = relative(rendererRoot, file)
    if (inside.startsWith('..') || isAbsolute(inside)) return new Response('Forbidden', { status: 403 })
    return net.fetch(pathToFileURL(/\.[^/]+$/.test(url.pathname) ? file : join(rendererRoot, 'index.html')).toString())
  })
}

function installMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' as const }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { label: 'View', submenu: [
      ...(isDev ? [{ role: 'forceReload' as const }, { role: 'toggleDevTools' as const }, { type: 'separator' as const }] : []),
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' },
    ] },
    { role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    // Leaves the sidebar room for the macOS traffic lights (blueprint: desktop-sidebar).
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.once('ready-to-show', () => window.show())

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Keep the Clerk bridge (preload and token cache) inside the app's own origin.
  const allowed = originOf(rendererUrl)
  window.webContents.on('will-navigate', (event, url) => {
    if (originOf(url) === allowed) return
    event.preventDefault()
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
  })
  window.webContents.on('will-redirect', (event, url) => {
    if (event.isMainFrame && originOf(url) !== allowed) event.preventDefault()
  })

  void window.loadURL(rendererUrl)
}

void app.whenReady().then(() => {
  // A second launch hands its deep link to the first instance and quits.
  if (!clerk.isPrimaryInstance) return
  registerRendererProtocol()
  ipcMain.handle('report:export-pdf', exportReportPdf)
  installMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ponytail: one bridge result type is duplicated in renderer ambient types; share a module if the bridge grows.
type ExportPdfResult = { status: 'saved'; filePath: string } | { status: 'canceled' } | { status: 'error'; message: string }

async function exportReportPdf(event: IpcMainInvokeEvent, payload: unknown): Promise<ExportPdfResult> {
  try {
    if (!payload || typeof payload !== 'object' || Object.keys(payload).length !== 1 || !('fileName' in payload) || typeof payload.fileName !== 'string' || !payload.fileName.endsWith('.pdf') || payload.fileName.length > 124 || payload.fileName.length <= 4 || /[\\/:*?"<>|\u0000-\u001f\u007f]/.test(payload.fileName)) throw new Error('Invalid PDF file name')
    const url = new URL(event.senderFrame?.url ?? '')
    const expected = new URL(rendererUrl)
    if (event.senderFrame !== event.sender.mainFrame || url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname || !/^#\/w\/[^/]+\/(reports\/[^/]+\/preview|practice\/[^/]+\/(print|cards))$/.test(url.hash)) throw new Error('Open a printable page to export PDF')
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) throw new Error('Report window not found')
    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      defaultPath: join(app.getPath('documents'), payload.fileName), filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })
    if (canceled || !filePath) return { status: 'canceled' }
    if (event.sender.getURL() !== url.href) throw new Error('Report changed. Open Preview and try again.')
    const ready = await event.sender.executeJavaScript("document.fonts.ready.then(() => !!document.querySelector('[data-report-ready]'))")
    if (!ready) throw new Error('Report Preview is not ready')
    const data = await event.sender.printToPDF({ printBackground: true, preferCSSPageSize: true })
    await writeFile(filePath, data)
    return { status: 'saved', filePath }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}
