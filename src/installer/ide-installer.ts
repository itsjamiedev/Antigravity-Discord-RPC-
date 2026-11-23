/**
 * IdeInstaller — Automatic Antigravity IDE Detector & Self-Provisioning Extension Engine
 *
 * Detects all Google Antigravity IDE installations (Antigravity 2.0 / Antigravity IDE
 * and Antigravity 1.x), copies the embedded extension bundle (`package.json`,
 * `dist/extension.cjs`, `resources/`, `readme.md`, `LICENSE.txt`) into each detected
 * `<extensionsDir>/itsjamiefied.antigravity-presence-<version>`, atomically registers
 * the extension in `<extensionsDir>/extensions.json`, and verifies SHA-256 bundle parity
 * so updates self-heal automatically on every launch.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { IdeInstallerReport, IdeTargetStatus } from '../shared/types.js';

export const EXTENSION_PUBLISHER = 'itsjamiefied';
export const EXTENSION_NAME = 'antigravity-presence';
export const EXTENSION_ID = `${EXTENSION_PUBLISHER}.${EXTENSION_NAME}`;
export const DEFAULT_EXTENSION_VERSION = '1.0.0';

export interface IdeInstallerOptions {
  sourceRoot?: string;
  homeDir?: string;
  localAppDataDir?: string;
}

interface VscodeExtensionRegistryEntry {
  identifier: {
    id: string;
    uuid?: string;
  };
  version: string;
  location: {
    $mid: number;
    path: string;
    scheme: string;
  };
  relativeLocation: string;
  metadata?: Record<string, unknown>;
}

/**
 * Formats a Windows or POSIX absolute path into the exact `/c:/Users/...` format
 * expected by VS Code / Antigravity IDE inside `extensions.json`.
 */
export function toVscodeLocationPath(winOrPosixPath: string): string {
  const normalized = winOrPosixPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const driveMatch = /^([A-Za-z]):(\/.*)$/.exec(normalized);
  if (driveMatch) {
    return `/${driveMatch[1]!.toLowerCase()}:${driveMatch[2]!}`;
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function computeFileSha256(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

function copyFileSafe(src: string, dest: string): void {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

export class IdeInstaller {
  private readonly sourceRoot: string;
  private readonly homeDir: string;
  private readonly localAppDataDir: string;

  constructor(options: IdeInstallerOptions = {}) {
    this.sourceRoot = options.sourceRoot ?? this.resolveDefaultSourceRoot();
    this.homeDir = options.homeDir ?? os.homedir();
    this.localAppDataDir =
      options.localAppDataDir ??
      process.env['LOCALAPPDATA'] ??
      path.join(this.homeDir, 'AppData', 'Local');
  }

  private resolveDefaultSourceRoot(): string {
    // Handle packaged Electron extraResources, desktop-app subfolder, or workspace root
    const candidates = [
      process.cwd(),
      path.resolve(__dirname, '..'),
      path.resolve(__dirname, '..', '..'),
    ];
    for (const c of candidates) {
      if (
        fs.existsSync(path.join(c, 'package.json')) &&
        fs.existsSync(path.join(c, 'dist', 'extension.cjs'))
      ) {
        return c;
      }
    }
    return process.cwd();
  }

  private readSourceVersion(): string {
    try {
      const pkgPath = path.join(this.sourceRoot, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg && typeof pkg.version === 'string' && pkg.version.trim()) {
          return pkg.version.trim();
        }
      }
    } catch {}
    return DEFAULT_EXTENSION_VERSION;
  }

  private getTargetDefinitions(version: string): Array<{
    id: 'antigravity-2' | 'antigravity-1';
    label: string;
    profileDir: string;
    extensionsDir: string;
    extensionInstallDir: string;
    relativeFolderName: string;
    binaryCandidates: string[];
  }> {
    const relativeFolderName = `${EXTENSION_ID}-${version}`;
    const ag2Profile = path.join(this.homeDir, '.antigravity-ide');
    const ag1Profile = path.join(this.homeDir, '.antigravity');

    return [
      {
        id: 'antigravity-2',
        label: 'Antigravity 2.0 IDE',
        profileDir: ag2Profile,
        extensionsDir: path.join(ag2Profile, 'extensions'),
        extensionInstallDir: path.join(ag2Profile, 'extensions', relativeFolderName),
        relativeFolderName,
        binaryCandidates: [
          path.join(this.localAppDataDir, 'Programs', 'Antigravity IDE', 'Antigravity IDE.exe'),
          path.join(this.localAppDataDir, 'Programs', 'Antigravity IDE', 'bin', 'antigravity-ide.cmd'),
        ],
      },
      {
        id: 'antigravity-1',
        label: 'Antigravity IDE (Classic)',
        profileDir: ag1Profile,
        extensionsDir: path.join(ag1Profile, 'extensions'),
        extensionInstallDir: path.join(ag1Profile, 'extensions', relativeFolderName),
        relativeFolderName,
        binaryCandidates: [
          path.join(this.localAppDataDir, 'Programs', 'antigravity', 'Antigravity.exe'),
          path.join(this.localAppDataDir, 'Programs', 'antigravity', 'bin', 'antigravity.cmd'),
        ],
      },
    ];
  }

  private isRegisteredInExtensionsJson(extensionsDir: string): boolean {
    const registryPath = path.join(extensionsDir, 'extensions.json');
    if (!fs.existsSync(registryPath)) return false;
    try {
      const parsed = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      if (!Array.isArray(parsed)) return false;
      return parsed.some(
        (entry) =>
          entry &&
          entry.identifier &&
          typeof entry.identifier.id === 'string' &&
          entry.identifier.id.toLowerCase() === EXTENSION_ID.toLowerCase()
      );
    } catch {
      return false;
    }
  }

  private patchExtensionsJson(
    extensionsDir: string,
    extensionInstallDir: string,
    relativeFolderName: string,
    version: string
  ): void {
    const registryPath = path.join(extensionsDir, 'extensions.json');
    let entries: VscodeExtensionRegistryEntry[] = [];

    if (fs.existsSync(registryPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        if (Array.isArray(parsed)) {
          entries = parsed as VscodeExtensionRegistryEntry[];
        }
      } catch {
        entries = [];
      }
    }

    const newEntry: VscodeExtensionRegistryEntry = {
      identifier: {
        id: EXTENSION_ID,
      },
      version,
      location: {
        $mid: 1,
        path: toVscodeLocationPath(extensionInstallDir),
        scheme: 'file',
      },
      relativeLocation: relativeFolderName,
      metadata: {
        isApplicationScoped: false,
        isMachineScoped: false,
        isBuiltin: false,
        installedTimestamp: Date.now(),
        pinned: true,
        source: 'vsix',
      },
    };

    const existingIdx = entries.findIndex(
      (e) =>
        e &&
        e.identifier &&
        typeof e.identifier.id === 'string' &&
        e.identifier.id.toLowerCase() === EXTENSION_ID.toLowerCase()
    );

    if (existingIdx >= 0) {
      const prevMeta = entries[existingIdx]?.metadata ?? {};
      entries[existingIdx] = {
        ...newEntry,
        metadata: {
          ...prevMeta,
          ...newEntry.metadata,
        },
      };
    } else {
      entries.push(newEntry);
    }

    if (!fs.existsSync(extensionsDir)) {
      fs.mkdirSync(extensionsDir, { recursive: true });
    }

    const tmpPath = `${registryPath}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmpPath, JSON.stringify(entries), 'utf8');
    fs.renameSync(tmpPath, registryPath);
  }

  private copyExtensionPayload(targetInstallDir: string): void {
    if (!fs.existsSync(targetInstallDir)) {
      fs.mkdirSync(targetInstallDir, { recursive: true });
    }

    // 1. Core manifest & docs
    const rootFiles = ['package.json', 'readme.md', 'README.md', 'LICENSE.txt', 'LICENSE'];
    for (const file of rootFiles) {
      const src = path.join(this.sourceRoot, file);
      if (fs.existsSync(src)) {
        copyFileSafe(src, path.join(targetInstallDir, file));
      }
    }

    // 2. Compiled extension bundle
    const srcBundle = path.join(this.sourceRoot, 'dist', 'extension.cjs');
    if (fs.existsSync(srcBundle)) {
      copyFileSafe(srcBundle, path.join(targetInstallDir, 'dist', 'extension.cjs'));
    }

    // 3. Resources (icons & activity bar SVG)
    const resourceFiles = [
      'icon.png',
      'activity-bar-icon.svg',
      'banner.png',
      'publisher-logo-transparent.png',
      'mascot.png',
    ];
    for (const resFile of resourceFiles) {
      const srcRes = path.join(this.sourceRoot, 'resources', resFile);
      if (fs.existsSync(srcRes)) {
        copyFileSafe(srcRes, path.join(targetInstallDir, 'resources', resFile));
      }
    }
  }

  public inspectStatus(): IdeInstallerReport {
    const version = this.readSourceVersion();
    const srcBundlePath = path.join(this.sourceRoot, 'dist', 'extension.cjs');
    const sourceBundleHash = computeFileSha256(srcBundlePath);
    const defs = this.getTargetDefinitions(version);

    const targets: IdeTargetStatus[] = defs.map((def) => {
      const binaryPath = def.binaryCandidates.find((b) => fs.existsSync(b)) ?? null;
      const detected =
        Boolean(binaryPath) ||
        fs.existsSync(def.profileDir) ||
        fs.existsSync(def.extensionsDir);

      const targetBundlePath = path.join(def.extensionInstallDir, 'dist', 'extension.cjs');
      const targetPkgPath = path.join(def.extensionInstallDir, 'package.json');
      const targetBundleHash = computeFileSha256(targetBundlePath);
      const registered = this.isRegisteredInExtensionsJson(def.extensionsDir);

      let installedVersion: string | null = null;
      if (fs.existsSync(targetPkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(targetPkgPath, 'utf8'));
          if (pkg && typeof pkg.version === 'string') {
            installedVersion = pkg.version;
          }
        } catch {}
      }

      const installed = Boolean(targetBundleHash) && Boolean(installedVersion) && registered;
      const bundleHashMatch =
        Boolean(sourceBundleHash) &&
        Boolean(targetBundleHash) &&
        sourceBundleHash === targetBundleHash;

      let lastSyncedAt: string | null = null;
      if (fs.existsSync(targetBundlePath)) {
        try {
          lastSyncedAt = fs.statSync(targetBundlePath).mtime.toISOString();
        } catch {}
      }

      return {
        id: def.id,
        label: def.label,
        detected,
        binaryPath,
        extensionsDir: def.extensionsDir,
        extensionInstallDir: def.extensionInstallDir,
        installed,
        version: installedVersion,
        bundleHashMatch,
        lastSyncedAt,
        actionTaken: installed && bundleHashMatch ? 'up_to_date' : 'skipped',
      };
    });

    const detectedTargets = targets.filter((t) => t.detected);
    return {
      extensionId: EXTENSION_ID,
      extensionVersion: version,
      sourceRoot: this.sourceRoot,
      sourceBundleHash,
      anyIdeDetected: detectedTargets.length > 0,
      allTargetsSynced:
        detectedTargets.length > 0 &&
        detectedTargets.every((t) => t.installed && t.bundleHashMatch),
      targets,
      checkedAt: new Date().toISOString(),
    };
  }

  public ensureInstalled(force: boolean = false): IdeInstallerReport {
    const version = this.readSourceVersion();
    const srcBundlePath = path.join(this.sourceRoot, 'dist', 'extension.cjs');
    const sourceBundleHash = computeFileSha256(srcBundlePath);
    const defs = this.getTargetDefinitions(version);

    const targets: IdeTargetStatus[] = defs.map((def) => {
      const binaryPath = def.binaryCandidates.find((b) => fs.existsSync(b)) ?? null;
      const detected =
        Boolean(binaryPath) ||
        fs.existsSync(def.profileDir) ||
        fs.existsSync(def.extensionsDir);

      if (!detected) {
        return {
          id: def.id,
          label: def.label,
          detected: false,
          binaryPath: null,
          extensionsDir: def.extensionsDir,
          extensionInstallDir: def.extensionInstallDir,
          installed: false,
          version: null,
          bundleHashMatch: false,
          lastSyncedAt: null,
          actionTaken: 'skipped',
        };
      }

      try {
        const targetBundlePath = path.join(def.extensionInstallDir, 'dist', 'extension.cjs');
        const prevHash = computeFileSha256(targetBundlePath);
        const wasInstalled = Boolean(prevHash) && this.isRegisteredInExtensionsJson(def.extensionsDir);
        const alreadyMatching =
          !force && wasInstalled && Boolean(sourceBundleHash) && prevHash === sourceBundleHash;

        if (!alreadyMatching) {
          this.copyExtensionPayload(def.extensionInstallDir);
          this.patchExtensionsJson(
            def.extensionsDir,
            def.extensionInstallDir,
            def.relativeFolderName,
            version
          );
        }

        const newHash = computeFileSha256(targetBundlePath);
        const bundleHashMatch = Boolean(sourceBundleHash) && newHash === sourceBundleHash;
        const lastSyncedAt = fs.existsSync(targetBundlePath)
          ? fs.statSync(targetBundlePath).mtime.toISOString()
          : new Date().toISOString();

        return {
          id: def.id,
          label: def.label,
          detected: true,
          binaryPath,
          extensionsDir: def.extensionsDir,
          extensionInstallDir: def.extensionInstallDir,
          installed: Boolean(newHash) && this.isRegisteredInExtensionsJson(def.extensionsDir),
          version,
          bundleHashMatch,
          lastSyncedAt,
          actionTaken: alreadyMatching ? 'up_to_date' : wasInstalled ? 'updated' : 'installed',
        };
      } catch (err) {
        return {
          id: def.id,
          label: def.label,
          detected: true,
          binaryPath,
          extensionsDir: def.extensionsDir,
          extensionInstallDir: def.extensionInstallDir,
          installed: false,
          version: null,
          bundleHashMatch: false,
          lastSyncedAt: null,
          actionTaken: 'error',
          error: String(err),
        };
      }
    });

    const detectedTargets = targets.filter((t) => t.detected);
    return {
      extensionId: EXTENSION_ID,
      extensionVersion: version,
      sourceRoot: this.sourceRoot,
      sourceBundleHash,
      anyIdeDetected: detectedTargets.length > 0,
      allTargetsSynced:
        detectedTargets.length > 0 &&
        detectedTargets.every((t) => t.installed && t.bundleHashMatch),
      targets,
      checkedAt: new Date().toISOString(),
    };
  }
}
