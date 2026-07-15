import { describe, expect, it } from 'vitest';
import type { SheetConfig } from './types';
import { CURRENT_LAYOUT_DEFAULTS_VERSION, restoreWorkspaceSheets } from './workspace';

function createSheet(patch: Partial<SheetConfig> = {}): SheetConfig {
  return {
    id: 'sheet',
    paper: 'A5',
    orientation: 'landscape',
    layout: 'full',
    margin: 0,
    gap: 0,
    split: 50,
    slots: [{
      id: 'slot',
      source: { fileId: 'source', pageIndex: 0 },
      fit: 'contain',
      crop: 'full',
      scale: 100,
      offsetX: -52.5,
      offsetY: 0,
    }],
    ...patch,
  };
}

describe('workspace compatibility', () => {
  it('preserves a user-selected A5 landscape layout and all slot data', () => {
    const sheet = createSheet();
    const sheets = [sheet];
    const restored = restoreWorkspaceSheets(sheets, 11);

    expect(restored).toBe(sheets);
    expect(restored[0]).toBe(sheet);
    expect(restored[0].orientation).toBe('landscape');
    expect(restored[0].layout).toBe('full');
    expect(restored[0].slots).toBe(sheet.slots);
  });

  it('preserves an explicitly selected A5 portrait layout', () => {
    const sheet = createSheet({ orientation: 'portrait' });
    const restored = restoreWorkspaceSheets([sheet], CURRENT_LAYOUT_DEFAULTS_VERSION);

    expect(restored[0]).toBe(sheet);
    expect(restored[0].orientation).toBe('portrait');
  });

  it('only removes the obsolete A5 full-page margin from very old workspaces', () => {
    const sheet = createSheet({ margin: 6 });
    const [restored] = restoreWorkspaceSheets([sheet], 2);

    expect(restored).not.toBe(sheet);
    expect(restored).toEqual({ ...sheet, margin: 0 });
    expect(restored.orientation).toBe('landscape');
    expect(restored.layout).toBe('full');
    expect(restored.slots).toBe(sheet.slots);
  });

  it('does not alter newer margins or unrelated sheets', () => {
    const newer = createSheet({ margin: 6 });
    const a4 = createSheet({ paper: 'A4', margin: 6 });

    expect(restoreWorkspaceSheets([newer], 3)[0]).toBe(newer);
    expect(restoreWorkspaceSheets([a4], 2)[0]).toBe(a4);
  });
});
