/**
 * Antigravity Presence — Privacy Settings Manager
 *
 * Manages privacy controls with safe-by-default configurations.
 * Stored locally at `~/.gemini/antigravity-presence/config.json`.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { DEFAULT_DISCORD_CLIENT_ID, type PrivacySettings } from '../shared/types.js';

export const PrivacySettingsSchema = z.object({
  disableRichPresence: z.boolean().default(false),
  pauseTracking: z.boolean().default(false),
  hideTokens: z.boolean().default(true), // Default minimal sharing
  hideConversations: z.boolean().default(true), // Default minimal sharing
  hideModels: z.boolean().default(false),
  enableManualEditsPresence: z.boolean().default(true),
  hideFileNamesInManualEdits: z.boolean().default(false),
  discordClientId: z.string().min(1).default(DEFAULT_DISCORD_CLIENT_ID),
  debounceMs: z.number().int().min(0).max(60000).default(15000),
});

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = PrivacySettingsSchema.parse({});

export function getDefaultConfigPath(): string {
  const envConfig = process.env['AGY_PRESENCE_CONFIG_PATH'];
  if (envConfig && envConfig.trim().length > 0) {
    return envConfig.trim();
  }
  return path.join(os.homedir(), '.gemini', 'antigravity-presence', 'config.json');
}

export class ConfigManager {
  private settings: PrivacySettings;
  private readonly configPath: string;

  constructor(configPath: string = getDefaultConfigPath()) {
    this.configPath = configPath;
    this.settings = this.load();
  }

  public getSettings(): Readonly<PrivacySettings> {
    return this.settings;
  }

  public updateSettings(partial: Partial<PrivacySettings>): Readonly<PrivacySettings> {
    const merged = { ...this.settings, ...partial };
    const validated = PrivacySettingsSchema.parse(merged);
    this.settings = validated;
    this.save();
    return this.settings;
  }

  private load(): PrivacySettings {
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed: unknown = JSON.parse(raw);
        return PrivacySettingsSchema.parse(parsed);
      }
    } catch {
      // Fallback to default on unreadable or corrupt file
    }
    return { ...DEFAULT_PRIVACY_SETTINGS };
  }

  private save(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch {
      // Fail-open: ignore save error if filesystem restricted
    }
  }
}
