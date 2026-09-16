import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { app, BrowserWindow, Menu, shell, nativeTheme, ipcMain, dialog, type IpcMainInvokeEvent, type MenuItemConstructorOptions } from 'electron'

const isDev = !app.isPackaged

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

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (isDev && devServerUrl !== undefined) {
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

void app.whenReady().then(() => {
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
    const expected = new URL(process.env['ELECTRON_RENDERER_URL'] ?? pathToFileURL(join(__dirname, '../renderer/index.html')).href)
    if (event.senderFrame !== event.sender.mainFrame || url.protocol !== expected.protocol || url.host !== expected.host || url.pathname !== expected.pathname || !/^#\/w\/[^/]+\/reports\/[^/]+\/preview$/.test(url.hash)) throw new Error('Open a Report Preview to export PDF')
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
