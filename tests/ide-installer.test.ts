import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { IdeInstaller, toVscodeLocationPath } from '../src/installer/ide-installer.js';

describe('IdeInstaller (Auto-Detector & Self-Provisioning Extension Engine)', () => {
  let tmpRoot: string;
  let mockSourceRoot: string;
  let mockHomeDir: string;
  let mockLocalAppData: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-ide-installer-'));
    mockSourceRoot = path.join(tmpRoot, 'source');
    mockHomeDir = path.join(tmpRoot, 'home');
    mockLocalAppData = path.join(tmpRoot, 'localappdata');

    fs.mkdirSync(path.join(mockSourceRoot, 'dist'), { recursive: true });
    fs.mkdirSync(path.join(mockSourceRoot, 'resources'), { recursive: true });
    fs.mkdirSync(mockHomeDir, { recursive: true });
    fs.mkdirSync(mockLocalAppData, { recursive: true });

    fs.writeFileSync(
      path.join(mockSourceRoot, 'package.json'),
      JSON.stringify({
        name: 'antigravity-presence',
        publisher: 'itsjamiefied',
        version: '1.0.0',
      }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(mockSourceRoot, 'dist', 'extension.cjs'),
      '// Antigravity Presence Bundle v1\nconsole.log("ready");',
      'utf8'
    );
    fs.writeFileSync(path.join(mockSourceRoot, 'resources', 'icon.png'), 'PNG_DATA', 'utf8');
    fs.writeFileSync(
      path.join(mockSourceRoot, 'resources', 'activity-bar-icon.svg'),
      '<svg></svg>',
      'utf8'
    );
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {}
  });

  it('formats Windows drive paths into VS Code /c:/Users/... location paths', () => {
    const formatted = toVscodeLocationPath(
      'C:\\Users\\Nednoxx\\.antigravity-ide\\extensions\\itsjamiefied.antigravity-presence-1.0.0'
    );
    expect(formatted).toBe(
      '/c:/Users/Nednoxx/.antigravity-ide/extensions/itsjamiefied.antigravity-presence-1.0.0'
    );
  });

  it('detects Antigravity 2.0 IDE and self-installs the extension bundle and extensions.json entry', () => {
    const ag2Dir = path.join(mockHomeDir, '.antigravity-ide');
    fs.mkdirSync(ag2Dir, { recursive: true });

    const installer = new IdeInstaller({
      sourceRoot: mockSourceRoot,
      homeDir: mockHomeDir,
      localAppDataDir: mockLocalAppData,
    });

    const report = installer.ensureInstalled();
    expect(report.anyIdeDetected).toBe(true);
    expect(report.allTargetsSynced).toBe(true);

    const ag2Target = report.targets.find((t) => t.id === 'antigravity-2')!;
    expect(ag2Target.detected).toBe(true);
    expect(ag2Target.installed).toBe(true);
    expect(ag2Target.bundleHashMatch).toBe(true);
    expect(ag2Target.actionTaken).toBe('installed');

    // Verify files and extensions.json on disk
    const installedBundle = path.join(ag2Target.extensionInstallDir, 'dist', 'extension.cjs');
    expect(fs.existsSync(installedBundle)).toBe(true);

    const registryPath = path.join(ag2Target.extensionsDir, 'extensions.json');
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    expect(Array.isArray(registry)).toBe(true);
    expect(registry).toHaveLength(1);
    expect(registry[0].identifier.id).toBe('itsjamiefied.antigravity-presence');
    expect(registry[0].relativeLocation).toBe('itsjamiefied.antigravity-presence-1.0.0');
  });

  it('reports up_to_date on subsequent launches and self-heals when source bundle hash changes', () => {
    const ag2Dir = path.join(mockHomeDir, '.antigravity-ide', 'extensions');
    fs.mkdirSync(ag2Dir, { recursive: true });

    const installer = new IdeInstaller({
      sourceRoot: mockSourceRoot,
      homeDir: mockHomeDir,
      localAppDataDir: mockLocalAppData,
    });

    // First install
    installer.ensureInstalled();

    // Second check with same bundle
    const secondReport = installer.ensureInstalled();
    const ag2Second = secondReport.targets.find((t) => t.id === 'antigravity-2')!;
    expect(ag2Second.actionTaken).toBe('up_to_date');

    // Simulate updated Desktop App bundle
    fs.writeFileSync(
      path.join(mockSourceRoot, 'dist', 'extension.cjs'),
      '// Antigravity Presence Bundle v2 UPDATED\nconsole.log("v2");',
      'utf8'
    );

    const thirdReport = installer.ensureInstalled();
    const ag2Third = thirdReport.targets.find((t) => t.id === 'antigravity-2')!;
    expect(ag2Third.actionTaken).toBe('updated');
    expect(ag2Third.bundleHashMatch).toBe(true);

    // Ensure extensions.json entry was updated in-place, not duplicated
    const registry = JSON.parse(
      fs.readFileSync(path.join(ag2Third.extensionsDir, 'extensions.json'), 'utf8')
    );
    expect(registry).toHaveLength(1);
  });

  it('recovers cleanly when extensions.json contains malformed JSON', () => {
    const extDir = path.join(mockHomeDir, '.antigravity-ide', 'extensions');
    fs.mkdirSync(extDir, { recursive: true });
    fs.writeFileSync(path.join(extDir, 'extensions.json'), '{corrupt-json', 'utf8');

    const installer = new IdeInstaller({
      sourceRoot: mockSourceRoot,
      homeDir: mockHomeDir,
      localAppDataDir: mockLocalAppData,
    });

    const report = installer.ensureInstalled();
    expect(report.allTargetsSynced).toBe(true);
    const registry = JSON.parse(fs.readFileSync(path.join(extDir, 'extensions.json'), 'utf8'));
    expect(Array.isArray(registry)).toBe(true);
    expect(registry[0].identifier.id).toBe('itsjamiefied.antigravity-presence');
  });
});
