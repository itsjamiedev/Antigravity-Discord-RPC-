/**
 * Antigravity Presence Desktop v2.0 — Secure Preload Bridge
 *
 * Exposes a strictly typed, context-isolated API to the transparent
 * Mascot & Dynamic Notch overlay renderer (`overlay.html`).
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('antigravityDesktop', {
  /**
   * Toggle click-through on the full-screen transparent overlay window.
   * When `ignore` is true, `{ forward: true }` allows mousemove events
   * to continue firing so entering the mascot/notch hitbox re-enables clicks.
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
   * Subscribe to global Windows desktop cursor coordinates (polled at 50ms
   * by the main process when the mascot is in `walk_follow` mode).
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
