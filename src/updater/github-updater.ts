/**
 * GitHubUpdater — 30-Minute GitHub Releases Auto-Update Engine with Token Auth,
 * Release Notes Changelog Extraction, and "Stay on Current Version (Skip)" Support.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ReleaseAssetInfo, UpdateStatusReport } from '../shared/types.js';
import { IdeInstaller } from '../installer/ide-installer.js';

export const DEFAULT_GITHUB_REPO = 'itsjamiedev/Antigravity-Discord-RPC-';
export const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export interface PersistedUpdaterConfig {
  githubToken?: string;
  skippedVersion?: string | null;
  autoCheckEnabled?: boolean;
  checkIntervalMinutes?: number;
}

export interface GitHubUpdaterOptions {
  currentVersion?: string;
  repo?: string;
  configPath?: string;
  checkIntervalMs?: number;
  fetchFn?: typeof fetch;
  ideInstaller?: IdeInstaller;
}

/**
 * Compares two semantic version strings (e.g., "v2.2.0" vs "2.1.0").
 * Returns 1 if a > b, -1 if a < b, 0 if equal.
 */
export function compareSemver(a: string, b: string): number {
  const clean = (v: string) =>
    v
      .trim()
      .replace(/^[vV]/, '')
      .split('-')[0]!
      .split('.')
      .map((n) => Number.parseInt(n, 10) || 0);

  const pa = clean(a);
  const pb = clean(b);
  const len = Math.max(pa.length, pb.length, 3);

  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * Parses a GitHub Release Markdown body into clean, scannable changelog lines.
 */
export function parseReleaseNotesLines(markdown: string | null | undefined): string[] {
  if (!markdown || typeof markdown !== 'string') return [];
  const lines = markdown
    .split(/\r?\n/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-*+]\s+/, '')
        .replace(/^#+\s+/, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .trim()
    )
    .filter((line) => line.length > 0 && !line.startsWith('<!--'));

  return lines.slice(0, 18);
}

/**
 * Masks a GitHub Personal Access Token so it is safe to display in UI status indicators.
 */
export function maskGithubToken(token: string | null | undefined): string | null {
  if (!token || typeof token !== 'string') return null;
  const trimmed = token.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 8) return '••••••••';
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••${suffix}`;
}

export class GitHubUpdater {
  private readonly currentVersion: string;
  private readonly repo: string;
  private readonly configPath: string;
  private readonly checkIntervalMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly ideInstaller?: IdeInstaller;

  private githubToken: string = '';
  private skippedVersion: string | null = null;
  private autoCheckEnabled: boolean = true;
  private checkIntervalMinutes: number = 30;

  private latestVersion: string | null = null;
  private releaseName: string | null = null;
  private releaseNotes: string | null = null;
  private releaseNotesLines: string[] = [];
  private publishedAt: string | null = null;
  private releaseHtmlUrl: string | null = null;
  private assets: ReleaseAssetInfo[] = [];
  private lastCheckedAt: string | null = null;
  private isDownloading: boolean = false;
  private downloadProgressPct: number = 0;
  private lastError: string | null = null;

  private timer: NodeJS.Timeout | null = null;
  private startupTimer: NodeJS.Timeout | null = null;
  private onUpdateChange?: (status: UpdateStatusReport) => void;

  constructor(options: GitHubUpdaterOptions = {}) {
    this.currentVersion = options.currentVersion ?? this.readPackageVersion();
    this.repo = options.repo ?? DEFAULT_GITHUB_REPO;
    this.configPath =
      options.configPath ??
      path.join(os.homedir(), '.gemini', 'antigravity-presence', 'updater.json');
    this.checkIntervalMs = options.checkIntervalMs ?? THIRTY_MINUTES_MS;
    this.checkIntervalMinutes = Math.max(1, Math.round(this.checkIntervalMs / 60000));
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.ideInstaller = options.ideInstaller;

    this.loadConfig();
  }

  private readPackageVersion(): string {
    try {
      const candidates = [
        path.resolve(process.cwd(), 'desktop-app', 'package.json'),
        path.resolve(process.cwd(), 'package.json'),
        path.resolve(__dirname, '..', 'package.json'),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c)) {
          const pkg = JSON.parse(fs.readFileSync(c, 'utf8'));
          if (pkg && typeof pkg.version === 'string') {
            return pkg.version.replace(/^[vV]/, '');
          }
        }
      }
    } catch {}
    return '2.1.0';
  }

  private loadConfig(): void {
    const envToken = process.env['GH_TOKEN'] || process.env['GITHUB_TOKEN'] || '';
    if (envToken) {
      this.githubToken = envToken.trim();
    }

    if (this.configPath === ':memory:') return;
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = JSON.parse(fs.readFileSync(this.configPath, 'utf8')) as PersistedUpdaterConfig;
        if (raw && typeof raw === 'object') {
          if (typeof raw.githubToken === 'string' && raw.githubToken.trim()) {
            this.githubToken = raw.githubToken.trim();
          }
          if (typeof raw.skippedVersion === 'string' || raw.skippedVersion === null) {
            this.skippedVersion = raw.skippedVersion
              ? raw.skippedVersion.replace(/^[vV]/, '')
              : null;
          }
          if (typeof raw.autoCheckEnabled === 'boolean') {
            this.autoCheckEnabled = raw.autoCheckEnabled;
          }
        }
      }
    } catch {}
  }

  private saveConfig(): void {
    if (this.configPath === ':memory:') return;
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const payload: PersistedUpdaterConfig = {
        githubToken: this.githubToken,
        skippedVersion: this.skippedVersion,
        autoCheckEnabled: this.autoCheckEnabled,
        checkIntervalMinutes: this.checkIntervalMinutes,
      };
      fs.writeFileSync(this.configPath, JSON.stringify(payload, null, 2), 'utf8');
    } catch {}
  }

  public startAutoCheck(onUpdateChange?: (status: UpdateStatusReport) => void): void {
    this.onUpdateChange = onUpdateChange;
    this.stopAutoCheck();

    if (!this.autoCheckEnabled) return;

    this.startupTimer = setTimeout(() => {
      void this.checkForUpdates(false);
    }, 4500);
    this.startupTimer.unref?.();

    this.timer = setInterval(() => {
      if (this.autoCheckEnabled) {
        void this.checkForUpdates(false);
      }
    }, this.checkIntervalMs);
    this.timer.unref?.();
  }

  public stopAutoCheck(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public getStatus(): UpdateStatusReport {
    const cleanLatest = this.latestVersion ? this.latestVersion.replace(/^[vV]/, '') : null;
    const isNewer =
      cleanLatest !== null && compareSemver(cleanLatest, this.currentVersion) > 0;
    const isSkipped =
      isNewer &&
      this.skippedVersion !== null &&
      compareSemver(cleanLatest, this.skippedVersion) === 0;

    return {
      currentVersion: this.currentVersion,
      latestVersion: cleanLatest,
      releaseName: this.releaseName,
      releaseNotes: this.releaseNotes,
      releaseNotesLines: this.releaseNotesLines,
      publishedAt: this.publishedAt,
      releaseHtmlUrl: this.releaseHtmlUrl,
      updateAvailable: isNewer && !isSkipped,
      isSkipped,
      skippedVersion: this.skippedVersion,
      hasGithubToken: Boolean(this.githubToken),
      maskedToken: maskGithubToken(this.githubToken),
      autoCheckEnabled: this.autoCheckEnabled,
      checkIntervalMinutes: this.checkIntervalMinutes,
      lastCheckedAt: this.lastCheckedAt,
      isDownloading: this.isDownloading,
      downloadProgressPct: this.downloadProgressPct,
      lastError: this.lastError,
      assets: this.assets,
    };
  }

  public updateConfig(partial: {
    githubToken?: string;
    autoCheckEnabled?: boolean;
    clearSkipped?: boolean;
  }): UpdateStatusReport {
    if (typeof partial.githubToken === 'string') {
      this.githubToken = partial.githubToken.trim();
    }
    if (typeof partial.autoCheckEnabled === 'boolean') {
      this.autoCheckEnabled = partial.autoCheckEnabled;
    }
    if (partial.clearSkipped) {
      this.skippedVersion = null;
    }
    this.saveConfig();
    const status = this.getStatus();
    this.onUpdateChange?.(status);
    return status;
  }

  public skipVersion(version?: string): UpdateStatusReport {
    const target = (version || this.latestVersion || '').replace(/^[vV]/, '').trim();
    if (target) {
      this.skippedVersion = target;
      this.saveConfig();
    }
    const status = this.getStatus();
    this.onUpdateChange?.(status);
    return status;
  }

  public async checkForUpdates(ignoreSkipped: boolean = false): Promise<UpdateStatusReport> {
    if (ignoreSkipped) {
      this.skippedVersion = null;
      this.saveConfig();
    }

    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Antigravity-Presence-Updater/2.2',
        'X-GitHub-Api-Version': '2022-11-28',
      };
      if (this.githubToken) {
        headers['Authorization'] = `Bearer ${this.githubToken}`;
      }

      const apiUrl = `https://api.github.com/repos/${this.repo}/releases/latest`;
      const res = await this.fetchFn(apiUrl, { headers });

      this.lastCheckedAt = new Date().toISOString();

      if (res.status === 404) {
        // No releases published in repository yet
        this.lastError = null;
        const status = this.getStatus();
        this.onUpdateChange?.(status);
        return status;
      }

      if (!res.ok) {
        this.lastError = `GitHub API returned HTTP ${res.status}`;
        const status = this.getStatus();
        this.onUpdateChange?.(status);
        return status;
      }

      const data = (await res.json()) as {
        tag_name?: string;
        name?: string;
        body?: string;
        published_at?: string;
        html_url?: string;
        assets?: Array<{
          id: number;
          name: string;
          size: number;
          browser_download_url: string;
          url: string;
          content_type: string;
        }>;
      };

      const rawTag = (data.tag_name || data.name || '').trim();
      this.latestVersion = rawTag ? rawTag.replace(/^[vV]/, '') : null;
      this.releaseName = data.name || rawTag || null;
      this.releaseNotes = data.body || null;
      this.releaseNotesLines = parseReleaseNotesLines(data.body);
      this.publishedAt = data.published_at || null;
      this.releaseHtmlUrl = data.html_url || null;
      this.assets = (data.assets || []).map((a) => ({
        id: a.id,
        name: a.name,
        size: a.size,
        browserDownloadUrl: a.browser_download_url,
        apiUrl: a.url,
        contentType: a.content_type,
      }));
      this.lastError = null;
    } catch (err) {
      this.lastCheckedAt = new Date().toISOString();
      this.lastError = err instanceof Error ? err.message : String(err);
    }

    const status = this.getStatus();
    this.onUpdateChange?.(status);
    return status;
  }

  public async downloadAndApplyUpdate(): Promise<{
    ok: boolean;
    action: string;
    installerPath?: string;
    error?: string;
  }> {
    if (this.isDownloading) {
      return { ok: false, action: 'already_downloading' };
    }

    const exeAsset = this.assets.find((a) => a.name.toLowerCase().endsWith('.exe'));
    const vsixAsset = this.assets.find((a) => a.name.toLowerCase().endsWith('.vsix'));

    const targetAsset = exeAsset || vsixAsset;
    if (!targetAsset) {
      if (this.releaseHtmlUrl) {
        return { ok: true, action: 'open_release_url', installerPath: this.releaseHtmlUrl };
      }
      return { ok: false, action: 'no_assets', error: 'No release installer asset found' };
    }

    this.isDownloading = true;
    this.downloadProgressPct = 15;
    this.onUpdateChange?.(this.getStatus());

    try {
      const headers: Record<string, string> = {
        Accept: 'application/octet-stream',
        'User-Agent': 'Antigravity-Presence-Updater/2.2',
      };
      if (this.githubToken) {
        headers['Authorization'] = `Bearer ${this.githubToken}`;
      }

      const downloadUrl = this.githubToken ? targetAsset.apiUrl : targetAsset.browserDownloadUrl;
      const res = await this.fetchFn(downloadUrl, { headers });
      if (!res.ok) {
        throw new Error(`Asset download failed with HTTP ${res.status}`);
      }

      this.downloadProgressPct = 65;
      this.onUpdateChange?.(this.getStatus());

      const arrayBuf = await res.arrayBuffer();
      const downloadDir = path.join(os.tmpdir(), 'antigravity-presence-updates');
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      const safeFileName = path.basename(targetAsset.name);
      const savedPath = path.join(downloadDir, safeFileName);
      fs.writeFileSync(savedPath, Buffer.from(arrayBuf));

      this.downloadProgressPct = 100;
      this.isDownloading = false;
      this.onUpdateChange?.(this.getStatus());

      // Ensure local IDE extension is synced
      try {
        this.ideInstaller?.ensureInstalled(true);
      } catch {}

      if (savedPath.toLowerCase().endsWith('.exe')) {
        try {
          const child = spawn(savedPath, [], {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
        } catch {}
      }

      return {
        ok: true,
        action: savedPath.toLowerCase().endsWith('.exe') ? 'launched_installer' : 'downloaded_vsix',
        installerPath: savedPath,
      };
    } catch (err) {
      this.isDownloading = false;
      this.downloadProgressPct = 0;
      this.lastError = err instanceof Error ? err.message : String(err);
      this.onUpdateChange?.(this.getStatus());
      return { ok: false, action: 'error', error: this.lastError };
    }
  }
}
