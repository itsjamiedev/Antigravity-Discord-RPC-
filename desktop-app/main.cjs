/**
 * Antigravity Presence Desktop v2.0 — Standalone Windows Desktop Application
 *
 * Architecture:
 * 1. Single-Instance Supervisor (`app.requestSingleInstanceLock()`).
 * 2. Embedded Core Engine Bootstrap:
 *    - Checks if `http://127.0.0.1:41177/api/health` is already served (e.g., by IDE Leader or background daemon).
 *    - If port 41177 is free, spawns `../dist/daemon.cjs` in-process/child-process so the Desktop App
 *      works 100% standalone even before Antigravity IDE is opened.
 * 3. Main Retro-CRT Dashboard Window (`1240x820`, dark frame, hides to system tray on close).
 * 4. Transparent Always-On-Top Overlay Window (`overlay.html`):
 *    - Renders the interactive Antigravity Rainbow Mascot Pet (sit in corner, walk & follow cursor,
 *      sleep mode, drag-and-drop, 8-bit chiptune SFX, click command menu) AND the Windows Dynamic Notch.
 *    - Uses `setIgnoreMouseEvents(true, { forward: true })` outside interactive hitboxes for 0% click obstruction.
 * 5. Native Windows System Tray with instant mode/behavior toggles.
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, shell } = require('electron');
const path = require('node:path');
const http = require('node:http');
const fs = require('node:fs');
const { fork } = require('node:child_process');

const API_HOST = '127.0.0.1';
const API_PORT = 41177;
const ICON_PATH = path.resolve(__dirname, '..', 'resources', 'mascot.png');
const FALLBACK_ICON_PATH = path.resolve(__dirname, '..', 'resources', 'icon.png');
const DAEMON_BUNDLE_PATH = path.resolve(__dirname, '..', 'dist', 'daemon.cjs');

let dashboardWindow = null;
let overlayWindow = null;
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

// Prevent multiple instances
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

/**
 * Checks if port 41177 is already serving the Antigravity Presence API.
 */
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

/**
 * Ensures the Core Engine (`dist/daemon.cjs`) is running so the Desktop App
 * operates 100% standalone without requiring the IDE extension.
 */
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

/**
 * Updates companion settings via the local API (`POST /api/companion`).
 */
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
    title: 'Antigravity Presence v2.0 — Retro Telemetry & Companion Studio',
    backgroundColor: '#0B0C11',
    icon: getAppIcon(),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
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

  // Hide to system tray on window close unless quitting
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

  // Keep overlay aligned if display resolution or taskbar geometry changes
  const syncDisplayBounds = () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    const wa = screen.getPrimaryDisplay().workArea;
    overlayWindow.setBounds({ x: wa.x, y: wa.y, width: wa.width, height: wa.height });
  };
  screen.on('display-metrics-changed', syncDisplayBounds);

  // Forward global cursor position at 50ms intervals for smooth Mascot walk & follow
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

/**
 * Builds the Windows System Tray menu for instant Mascot & Notch control.
 */
function rebuildTrayMenu() {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Antigravity Presence v2.0',
      enabled: false,
    },
    {
      label: 'Open Retro Dashboard Studio',
      click: () => showDashboardWindow(),
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
      label: 'Mascot: Sleep Mode (Zzz)',
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
      label: 'Mute 8-Bit Chiptune SFX',
      type: 'checkbox',
      checked: Boolean(currentCompanion.soundMuted),
      click: (item) => updateCompanionApi({ soundMuted: item.checked }),
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
  tray.setToolTip('Antigravity Presence v2.0 — Mascot, Dynamic Notch & Discord RPC');
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

app.whenReady().then(async () => {
  await ensureStandaloneCoreEngine();

  // Wait briefly for port 41177 if we just spawned the daemon
  for (let i = 0; i < 12; i++) {
    if (await checkBackendAlive()) break;
    await new Promise((r) => setTimeout(r, 250));
  }

  createSystemTray();
  createOverlayWindow();

  const overlayOnly = process.argv.includes('--overlay-only');
  createDashboardWindow(!overlayOnly);
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
