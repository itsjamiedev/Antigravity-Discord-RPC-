import { describe, it, expect } from 'vitest';
import {
  MASCOT_MOVEMENTS,
  getMascotFaceSvg,
  type MascotMovementId,
  type MascotFacialState,
} from '../src/shared/mascot-movements.js';

describe('Mascot Movements & Facial Expressions Engine', () => {
  it('defines exactly 32 distinct movements across 5 categories', () => {
    const keys = Object.keys(MASCOT_MOVEMENTS) as MascotMovementId[];
    expect(keys.length).toBe(32);

    const categories = new Set(keys.map((k) => MASCOT_MOVEMENTS[k].category));
    expect(categories).toEqual(new Set(['prompt', 'agent', 'idle', 'notch', 'alert']));

    // Category count checks
    const promptMovs = keys.filter((k) => MASCOT_MOVEMENTS[k].category === 'prompt');
    const agentMovs = keys.filter((k) => MASCOT_MOVEMENTS[k].category === 'agent');
    const idleMovs = keys.filter((k) => MASCOT_MOVEMENTS[k].category === 'idle');
    const notchMovs = keys.filter((k) => MASCOT_MOVEMENTS[k].category === 'notch');
    const alertMovs = keys.filter((k) => MASCOT_MOVEMENTS[k].category === 'alert');

    expect(promptMovs.length).toBe(6);
    expect(agentMovs.length).toBe(8);
    expect(idleMovs.length).toBe(8);
    expect(notchMovs.length).toBe(4);
    expect(alertMovs.length).toBe(6);
  });

  it('provides valid CSS classes, durations and paired sounds', () => {
    for (const [id, meta] of Object.entries(MASCOT_MOVEMENTS)) {
      expect(meta.id).toBe(id);
      expect(meta.durationMs).toBeGreaterThan(0);
      expect(meta.cssClass.startsWith('ag-m-')).toBe(true);
      expect(['smile', 'laugh', 'curious', 'surprised', 'sleepy', 'wink']).toContain(meta.facialState);
    }
  });

  it('generates valid SVG markup for all 6 facial expressions', () => {
    const states: MascotFacialState[] = ['smile', 'laugh', 'curious', 'surprised', 'sleepy', 'wink'];
    for (const state of states) {
      const svg = getMascotFaceSvg(state);
      expect(svg).toContain('<svg class="ag-mascot-face"');
      expect(svg).toContain(`data-expression="${state}"`);
      expect(svg).toContain('</svg>');
      expect(svg).toContain('class="ag-face-mouth"');
    }
  });
});
