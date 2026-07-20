import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron';
import path from 'path';
import Store from 'electron-store';
import * as auth from './auth';
import * as iap from './iap';

const PROTOCOL = 'devmockview';
const isDev = !app.isPackaged;

// Persist window bounds between launches
const store = new Store<{ windowBounds: Electron.Rectangle }>({
  defaults: {
    windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
  },
});

let mainWindow: BrowserWindow | null = null;

// Register the custom URL scheme for OAuth callbacks
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// macOS: Ensure single instance so deep links route to the existing window
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      handleDeepLink(url);
    }
  });

  app.on('open-url', (_event, url) => {
    handleDeepLink(url);
  });

  app.whenReady().then(async () => {
    await auth.initialize();
    // Identify user with RevenueCat if already authenticated
    const userId = auth.getUserId();
    if (userId) {
      iap.identifyUser(userId).catch(() => {});
    }
    registerIpcHandlers();
    createAppMenu();
    createWindow();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers ---

function registerIpcHandlers(): void {
  ipcMain.handle('auth:sign-in', async () => {
    await auth.signIn();
    return { success: true };
  });

  ipcMain.handle('auth:sign-out', async () => {
    await auth.signOut();
    return { success: true };
  });

  ipcMain.handle('auth:get-token', () => {
    return auth.getToken();
  });

  ipcMain.handle('auth:get-state', () => {
    return {
      isAuthenticated: auth.isAuthenticated(),
      userId: auth.getUserId(),
    };
  });

  // --- IAP ---
  ipcMain.handle('iap:can-make-payments', () => {
    return iap.canMakePayments();
  });

  ipcMain.handle('iap:get-offerings', async () => {
    return iap.getOfferings();
  });

  ipcMain.handle('iap:purchase', async (_event, productId: string) => {
    return iap.purchaseProduct(productId);
  });

  ipcMain.handle('iap:restore', async () => {
    return iap.restorePurchases();
  });

  ipcMain.handle('iap:get-subscription', async () => {
    return iap.getSubscriptionInfo();
  });
}

// --- Window ---

function createWindow(): void {
  const bounds = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  auth.setMainWindow(mainWindow);
  iap.setMainWindow(mainWindow);

  // Persist window position/size on move or resize
  const saveBounds = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  };
  mainWindow.on('resized', saveBounds);
  mainWindow.on('moved', saveBounds);

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    auth.setMainWindow(null);
    mainWindow = null;
  });
}

// --- App Menu ---

function createAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings…',
          accelerator: 'CmdOrCtrl+,',
          click: () => sendNavigation('/settings'),
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Interview',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendNavigation('/new-interview'),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function sendNavigation(route: string): void {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('navigate', route);
  }
}

// --- Deep Link Handler ---

function handleDeepLink(url: string): void {
  if (!mainWindow) return;

  // Route auth callbacks to the auth manager
  if (url.startsWith(`${PROTOCOL}://auth/`)) {
    auth.handleCallback(url).then((success) => {
      if (success && mainWindow) {
        mainWindow.focus();
      }
    });
    return;
  }

  // Forward other deep links to the renderer
  mainWindow.webContents.send('deep-link', url);
}
