/**
 * Antigravity Presence Desktop v2.1 — Secure Preload Bridge
 *
 * Exposes a strictly typed, context-isolated API to both the transparent
 * Mascot & Dynamic Notch overlay renderer (`overlay.html`) and the
 * Minimal Retro Setup & Extension Installer Wizard (`installer.html`).
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('antigravityDesktop', {
  /**
   * Toggle click-through on the full-screen transparent overlay window.
   */
  setIgnoreMouseEvents: (ignore) => {
    ipcRenderer.send('overlay:set-ignore-mouse', Boolean(ignore));
  },

  /**
   * Open or focus the main Retro-CRT Dashboard window.
   */
  openDashboard: () => {
    ipcRenderer.send('desktop:open-dashboard');
  },

  /**
   * Open the Minimal Retro-CRT Setup & Extension Installer Wizard.
   */
  openInstaller: () => {
    ipcRenderer.send('desktop:open-installer');
  },

  /**
   * Complete the Setup Wizard options (auto-install extension, overlay, login item).
   */
  completeSetup: (options) => {
    ipcRenderer.send('installer:complete-setup', options);
  },

  /**
   * Close the Setup Wizard and transition into the main Dashboard + Overlay.
   */
  closeInstaller: () => {
    ipcRenderer.send('installer:close');
  },

  /**
   * Subscribe to global Windows desktop cursor coordinates.
   */
  onCursorMove: (callback) => {
    const handler = (_event, point) => callback(point);
    ipcRenderer.on('overlay:cursor-move', handler);
    return () => ipcRenderer.removeListener('overlay:cursor-move', handler);
  },

  /**
   * Subscribe to companion state commands triggered from the System Tray
   * or Main Process.
   */
  onCompanionCommand: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('overlay:companion-command', handler);
    return () => ipcRenderer.removeListener('overlay:companion-command', handler);
  },
});
