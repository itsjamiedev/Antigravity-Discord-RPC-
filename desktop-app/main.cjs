/**
 * Antigravity Presence Desktop v2.1 — Standalone Windows Desktop Application & Self-Installer
 *
 * Architecture:
 * 1. Single-Instance Supervisor (`app.requestSingleInstanceLock()`).
 * 2. Embedded Core Engine Bootstrap:
 *    - Checks if `http://127.0.0.1:41177/api/health` is already served.
 *    - If port 41177 is free, spawns `../dist/daemon.cjs` so the Desktop App
 *      works 100% standalone even before Antigravity IDE is opened.
 * 3. Automatic Antigravity IDE Extension Provisioning:
 *    - On startup, triggers `POST http://127.0.0.1:41177/api/ide-install` so any
 *      detected Antigravity 2.0 / 1.x installation automatically receives the latest
 *      `itsjamiefied.antigravity-presence` extension bundle and `extensions.json` registration.
 * 4. Minimal Retro-CRT Setup & Extension Installer Wizard (`installer.html`):
 *    - Frameless `580x500` hardware setup deck with the animated Rainbow Mascot center-stage.
 *    - Automatically presented on first run (or when launched with `--installer` or from Tray).
 * 5. Main Retro-CRT Dashboard Window (`1260x840`, hides to system tray on close).
 * 6. Transparent Always-On-Top Overlay Window (`overlay.html`) for the Desktop Mascot Pet & Dynamic Notch.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, shell } = require('electron');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs');
const { fork } = require('node:child_process');

const API_HOST = '127.0.0.1';
const API_PORT = 41177;
const ICON_PATH = path.resolve(__dirname, '..', 'resources', 'mascot.png');
const FALLBACK_ICON_PATH = path.resolve(__dirname, '..', 'resources', 'icon.png');
const DAEMON_BUNDLE_PATH = path.resolve(__dirname, '..', 'dist', 'daemon.cjs');
const SETUP_STATE_PATH = path.join(os.homedir(), '.gemini', 'antigravity-presence', 'desktop-setup.json');

let dashboardWindow = null;
let overlayWindow = null;
let installerWindow = null;
let tray = null;
let daemonProcess = null;
let cursorTrackInterval = null;
let isQuitting = false;
let currentCompanion = {
  enabled: true,
  mode: 'mascot',
  mascotBehavior: 'sit_corner',
  corner: 'bottom-right',
  soundMuted: false,
};

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  showDashboardWindow();
});

function getAppIcon() {
  const target = fs.existsSync(ICON_PATH) ? ICON_PATH : FALLBACK_ICON_PATH;
  return nativeImage.createFromPath(target);
}

function hasCompletedFirstSetup() {
  try {
    if (fs.existsSync(SETUP_STATE_PATH)) {
      const data = JSON.parse(fs.readFileSync(SETUP_STATE_PATH, 'utf8'));
      return Boolean(data && data.setupCompleted);
    }
  } catch {}
  return false;
}

function markFirstSetupCompleted(options = {}) {
  try {
    const dir = path.dirname(SETUP_STATE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      SETUP_STATE_PATH,
      JSON.stringify(
        {
          setupCompleted: true,
          completedAt: new Date().toISOString(),
          ...options,
        },
        null,
        2
      ),
      'utf8'
    );
  } catch {}
}

function checkBackendAlive() {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: API_HOST,
        port: API_PORT,
        path: '/api/health',
        timeout: 1000,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureStandaloneCoreEngine() {
  const alive = await checkBackendAlive();
  if (alive) {
    return;
  }
  if (!fs.existsSync(DAEMON_BUNDLE_PATH)) {
    return;
  }
  try {
    daemonProcess = fork(DAEMON_BUNDLE_PATH, [], {
      stdio: 'ignore',
      detached: false,
    });
    daemonProcess.on('exit', () => {
      daemonProcess = null;
    });
  } catch (err) {
    console.error('[Antigravity Desktop] Failed to spawn standalone core engine:', err);
  }
}

function triggerIdeExtensionAutoInstall(force = false) {
  const body = JSON.stringify({ force: Boolean(force) });
  const req = http.request(
    {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/ide-install',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 2500,
    },
    (res) => {
      res.resume();
    }
  );
  req.on('error', () => {});
  req.write(body);
  req.end();
}

function updateCompanionApi(partial) {
  currentCompanion = { ...currentCompanion, ...partial };
  rebuildTrayMenu();

  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('overlay:companion-command', currentCompanion);
  }

  const body = JSON.stringify(partial);
  const req = http.request(
    {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/companion',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 1500,
    },
    (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.companion) {
            currentCompanion = parsed.companion;
            rebuildTrayMenu();
          }
        } catch {}
      });
    }
  );
  req.on('error', () => {});
  req.write(body);
  req.end();
}

/**
 * Creates or focuses the Minimal Retro-CRT Setup & Extension Installer Wizard (`installer.html`).
 */
function createInstallerWindow() {
  if (installerWindow && !installerWindow.isDestroyed()) {
    installerWindow.show();
    installerWindow.focus();
    return installerWindow;
  }

  installerWindow = new BrowserWindow({
    width: 580,
    height: 500,
    resizable: false,
    maximizable: false,
    minimizable: false,
    frame: false,
    title: 'Antigravity Presence Setup',
    backgroundColor: '#0B0C11',
    icon: getAppIcon(),
    center: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  installerWindow.loadFile(path.join(__dirname, 'installer.html'));
  installerWindow.once('ready-to-show', () => {
    installerWindow.show();
    installerWindow.focus();
  });

  installerWindow.on('closed', () => {
    installerWindow = null;
  });

  return installerWindow;
}

/**
 * Creates or focuses the Main Retro-CRT Dashboard Window.
 */
function createDashboardWindow(showImmediately = true) {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    if (showImmediately) {
      dashboardWindow.show();
      dashboardWindow.focus();
    }
    return dashboardWindow;
  }

  dashboardWindow = new BrowserWindow({
    width: 1260,
    height: 840,
    minWidth: 940,
    minHeight: 640,
    title: 'Antigravity Presence — Retro Telemetry & Companion Studio',
    backgroundColor: '#0B0C11',
    icon: getAppIcon(),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  dashboardWindow.loadURL(`http://${API_HOST}:${API_PORT}`);

  dashboardWindow.once('ready-to-show', () => {
    if (showImmediately) {
      dashboardWindow.show();
    }
  });

  dashboardWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  dashboardWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      dashboardWindow.hide();
    }
  });

  return dashboardWindow;
}

function showDashboardWindow() {
  const win = createDashboardWindow(true);
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

/**
 * Creates the transparent, always-on-top Overlay Window for the Desktop Mascot Pet
 * and Windows Dynamic Notch.
 */
function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  overlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));

  const syncDisplayBounds = () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    const wa = screen.getPrimaryDisplay().workArea;
    overlayWindow.setBounds({ x: wa.x, y: wa.y, width: wa.width, height: wa.height });
  };
  screen.on('display-metrics-changed', syncDisplayBounds);

  if (cursorTrackInterval) clearInterval(cursorTrackInterval);
  cursorTrackInterval = setInterval(() => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    if (!currentCompanion.enabled) return;
    try {
      const pt = screen.getCursorScreenPoint();
      const wa = screen.getPrimaryDisplay().workArea;
      overlayWindow.webContents.send('overlay:cursor-move', {
        x: pt.x - wa.x,
        y: pt.y - wa.y,
        workAreaWidth: wa.width,
        workAreaHeight: wa.height,
      });
    } catch {}
  }, 50);

  return overlayWindow;
}

function rebuildTrayMenu() {
  if (!tray) return;

  let loginEnabled = false;
  try {
    loginEnabled = Boolean(app.getLoginItemSettings().openAtLogin);
  } catch {}

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Antigravity Presence v2.1',
      enabled: false,
    },
    {
      label: 'Open Antigravity Dashboard Studio',
      click: () => showDashboardWindow(),
    },
    {
      label: 'Open Antigravity Setup & Extension Installer',
      click: () => createInstallerWindow(),
    },
    {
      label: 'Force Sync Antigravity IDE Extension',
      click: () => triggerIdeExtensionAutoInstall(true),
    },
    { type: 'separator' },
    {
      label: 'Enable Desktop Overlay (Mascot / Notch)',
      type: 'checkbox',
      checked: Boolean(currentCompanion.enabled),
      click: (item) => updateCompanionApi({ enabled: item.checked }),
    },
    {
      label: 'Mode: Desktop Mascot Pet',
      type: 'radio',
      checked: currentCompanion.mode === 'mascot',
      click: () => updateCompanionApi({ enabled: true, mode: 'mascot' }),
    },
    {
      label: 'Mode: Windows Dynamic Notch',
      type: 'radio',
      checked: currentCompanion.mode === 'notch',
      click: () => updateCompanionApi({ enabled: true, mode: 'notch' }),
    },
    { type: 'separator' },
    {
      label: 'Mascot: Sit in Desktop Corner',
      type: 'radio',
      checked: currentCompanion.mascotBehavior === 'sit_corner',
      click: () => updateCompanionApi({ enabled: true, mode: 'mascot', mascotBehavior: 'sit_corner' }),
    },
    {
      label: 'Mascot: Walk & Follow Cursor',
      type: 'radio',
      checked: currentCompanion.mascotBehavior === 'walk_follow',
      click: () => updateCompanionApi({ enabled: true, mode: 'mascot', mascotBehavior: 'walk_follow' }),
    },
    {
      label: 'Mascot: Sleep Mode',
      type: 'radio',
      checked: currentCompanion.mascotBehavior === 'sleep',
      click: () => updateCompanionApi({ enabled: true, mode: 'mascot', mascotBehavior: 'sleep' }),
    },
    { type: 'separator' },
    {
      label: 'Corner Anchor',
      submenu: [
        {
          label: 'Bottom Right',
          type: 'radio',
          checked: currentCompanion.corner === 'bottom-right',
          click: () => updateCompanionApi({ corner: 'bottom-right', mascotBehavior: 'sit_corner' }),
        },
        {
          label: 'Bottom Left',
          type: 'radio',
          checked: currentCompanion.corner === 'bottom-left',
          click: () => updateCompanionApi({ corner: 'bottom-left', mascotBehavior: 'sit_corner' }),
        },
        {
          label: 'Top Right',
          type: 'radio',
          checked: currentCompanion.corner === 'top-right',
          click: () => updateCompanionApi({ corner: 'top-right', mascotBehavior: 'sit_corner' }),
        },
        {
          label: 'Top Left',
          type: 'radio',
          checked: currentCompanion.corner === 'top-left',
          click: () => updateCompanionApi({ corner: 'top-left', mascotBehavior: 'sit_corner' }),
        },
      ],
    },
    {
      label: 'Mute 8-Bit Audio',
      type: 'checkbox',
      checked: Boolean(currentCompanion.soundMuted),
      click: (item) => updateCompanionApi({ soundMuted: item.checked }),
    },
    {
      label: 'Launch Antigravity Presence at Windows Login',
      type: 'checkbox',
      checked: loginEnabled,
      click: (item) => {
        try {
          app.setLoginItemSettings({ openAtLogin: Boolean(item.checked) });
        } catch {}
        rebuildTrayMenu();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit Antigravity Presence Desktop',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

function createSystemTray() {
  const icon = getAppIcon().resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Antigravity Presence — Mascot, Dynamic Notch & Auto-IDE Sync');
  tray.on('double-click', () => showDashboardWindow());
  rebuildTrayMenu();
}

// IPC Handlers
ipcMain.on('overlay:set-ignore-mouse', (_event, ignore) => {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  if (ignore) {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    overlayWindow.setIgnoreMouseEvents(false);
  }
});

ipcMain.on('desktop:open-dashboard', () => {
  showDashboardWindow();
});

ipcMain.on('desktop:open-installer', () => {
  createInstallerWindow();
});

ipcMain.on('installer:complete-setup', (_event, options) => {
  markFirstSetupCompleted(options);
  if (options && typeof options.autoStart === 'boolean') {
    try {
      app.setLoginItemSettings({ openAtLogin: options.autoStart });
    } catch {}
  }
  if (options && options.installExtension) {
    triggerIdeExtensionAutoInstall(true);
  }
  if (options && typeof options.enableOverlay === 'boolean') {
    updateCompanionApi({ enabled: options.enableOverlay });
  }
  rebuildTrayMenu();
});

ipcMain.on('installer:close', () => {
  if (installerWindow && !installerWindow.isDestroyed()) {
    installerWindow.close();
  }
  showDashboardWindow();
});

app.whenReady().then(async () => {
  await ensureStandaloneCoreEngine();

  for (let i = 0; i < 12; i++) {
    if (await checkBackendAlive()) break;
    await new Promise((r) => setTimeout(r, 250));
  }

  // Always auto-detect Antigravity IDE and self-heal extension on startup
  triggerIdeExtensionAutoInstall(false);

  createSystemTray();
  createOverlayWindow();

  const forceInstaller = process.argv.includes('--installer');
  const overlayOnly = process.argv.includes('--overlay-only');

  if (forceInstaller || (!overlayOnly && !hasCompletedFirstSetup())) {
    createInstallerWindow();
  } else {
    createDashboardWindow(!overlayOnly);
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  if (cursorTrackInterval) {
    clearInterval(cursorTrackInterval);
    cursorTrackInterval = null;
  }
  if (daemonProcess) {
    try {
      daemonProcess.kill();
    } catch {}
    daemonProcess = null;
  }
});
