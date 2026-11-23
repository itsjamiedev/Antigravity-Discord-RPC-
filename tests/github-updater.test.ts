import { describe, it, expect, vi } from 'vitest';
import {
  compareSemver,
  GitHubUpdater,
  maskGithubToken,
  parseReleaseNotesLines,
  THIRTY_MINUTES_MS,
} from '../src/updater/github-updater.js';

describe('GitHubUpdater (30-Min Auto-Update Engine, Release Notes & Skip Version)', () => {
  it('accurately compares semantic versions with or without v prefix', () => {
    expect(compareSemver('2.2.0', '2.1.0')).toBe(1);
    expect(compareSemver('v2.10.0', 'v2.2.0')).toBe(1);
    expect(compareSemver('2.1.0', '2.1.0')).toBe(0);
    expect(compareSemver('v2.0.9', '2.1.0')).toBe(-1);
    expect(THIRTY_MINUTES_MS).toBe(30 * 60 * 1000);
  });

  it('masks GitHub Personal Access Tokens safely for UI display', () => {
    expect(maskGithubToken('ghp_1234567890abcdefXYZ987')).toBe('ghp_••••Z987');
    expect(maskGithubToken('')).toBeNull();
  });

  it('extracts clean changelog lines from GitHub Release markdown', () => {
    const md = `
## What's Changed
- **Liquid Glass Notch**: Added Apple-style Dynamic Island toggle
* Added 30-minute GitHub Token auto-updater
- Fixed top white titlebar on Windows 11
`;
    const lines = parseReleaseNotesLines(md);
    expect(lines).toEqual([
      "What's Changed",
      'Liquid Glass Notch: Added Apple-style Dynamic Island toggle',
      'Added 30-minute GitHub Token auto-updater',
      'Fixed top white titlebar on Windows 11',
    ]);
  });

  it('passes Bearer token to GitHub Releases API, detects updates, and respects Skip Version', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        tag_name: 'v2.4.0',
        name: 'Antigravity Presence v2.4.0',
        body: '- Added Liquid Glass Dynamic Island\n- Added 30m GitHub Auto-Updater',
        published_at: '2026-11-23T10:00:00Z',
        html_url: 'https://github.com/itsjamiedev/Antigravity-Discord-RPC-/releases/tag/v2.4.0',
        assets: [
          {
            id: 101,
            name: 'Antigravity Presence Setup 2.4.0.exe',
            size: 90000000,
            browser_download_url: 'https://github.com/example.exe',
            url: 'https://api.github.com/repos/itsjamiedev/Antigravity-Discord-RPC-/releases/assets/101',
            content_type: 'application/octet-stream',
          },
        ],
      }),
    });

    const updater = new GitHubUpdater({
      currentVersion: '2.1.0',
      configPath: ':memory:',
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    updater.updateConfig({ githubToken: 'ghp_secretTokenValue9988' });
    const report = await updater.checkForUpdates();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0]!;
    expect(callArgs[1]?.headers?.Authorization).toBe('Bearer ghp_secretTokenValue9988');

    expect(report.updateAvailable).toBe(true);
    expect(report.latestVersion).toBe('2.4.0');
    expect(report.maskedToken).toBe('ghp_••••9988');
    expect(report.releaseNotesLines).toEqual([
      'Added Liquid Glass Dynamic Island',
      'Added 30m GitHub Auto-Updater',
    ]);

    // User chooses to stay on current version and skip v2.4.0
    const afterSkip = updater.skipVersion('2.4.0');
    expect(afterSkip.updateAvailable).toBe(false);
    expect(afterSkip.isSkipped).toBe(true);
    expect(afterSkip.skippedVersion).toBe('2.4.0');

    // Manual check with ignoreSkipped=true un-skips it
    const afterUnskip = await updater.checkForUpdates(true);
    expect(afterUnskip.updateAvailable).toBe(true);
    expect(afterUnskip.isSkipped).toBe(false);
  });
});
