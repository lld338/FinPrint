import { describe, expect, it } from 'vitest';
import type { SheetConfig, UploadedPdf } from './types';
import { CURRENT_LAYOUT_DEFAULTS_VERSION, restoreLegacyA5PortraitSheets } from './workspace';

function createFile(width: number, height: number): UploadedPdf {
  return {
    id: 'source',
    name: 'source.pdf',
    bytes: new ArrayBuffer(0),
    printAs: 'A5',
    pages: [{
      width,
      height,
      preview: '',
      trimmedPreview: '',
      contentHeight: 1,
      viewBox: { left: 0, bottom: 0, right: width, top: height },
    }],
  };
}

function createSheet(): SheetConfig {
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
      scale: 112,
      offsetX: 3,
      offsetY: -4,
    }],
  };
}

describe('workspace compatibility', () => {
  it('restores an old A5 landscape sheet with a portrait source to A5 portrait', () => {
    const sheet = createSheet();
    const [restored] = restoreLegacyA5PortraitSheets([createFile(595.28, 841.89)], [sheet], 7);

    expect(restored.orientation).toBe('portrait');
    expect(restored.slots).toBe(sheet.slots);
    expect(restored.slots[0]).toEqual(sheet.slots[0]);
  });

  it('migrates workspaces that were prematurely marked as version 8, 9, or 10', () => {
    const sheet = createSheet();
    const file = createFile(595.28, 841.89);

    expect(restoreLegacyA5PortraitSheets([file], [sheet], 8)[0].orientation).toBe('portrait');
    expect(restoreLegacyA5PortraitSheets([file], [sheet], 9)[0].orientation).toBe('portrait');
    expect(restoreLegacyA5PortraitSheets([file], [sheet], 10)[0].orientation).toBe('portrait');
  });

  it('does not change a user-selected landscape sheet after the migration version', () => {
    const sheet = createSheet();
    const sheets = [sheet];
    const restored = restoreLegacyA5PortraitSheets(
      [createFile(595.28, 841.89)],
      sheets,
      CURRENT_LAYOUT_DEFAULTS_VERSION,
    );

    expect(restored).toBe(sheets);
    expect(restored[0].orientation).toBe('landscape');
  });

  it('remaps a legacy left-alignment offset after restoring portrait orientation', () => {
    const sheet = createSheet();
    sheet.slots[0] = { ...sheet.slots[0], scale: 100, offsetX: -52.7 };
    const [restored] = restoreLegacyA5PortraitSheets([createFile(595.28, 841.89)], [sheet], 9);

    expect(restored.orientation).toBe('portrait');
    expect(restored.slots[0].offsetX).toBeCloseTo(0, 1);
    expect(restored.slots[0].offsetY).toBe(sheet.slots[0].offsetY);
    expect(restored.slots[0].scale).toBe(sheet.slots[0].scale);
  });

  it('keeps the same array when an old workspace no longer needs migration', () => {
    const sheet = { ...createSheet(), orientation: 'portrait' as const };
    const sheets = [sheet];
    const restored = restoreLegacyA5PortraitSheets([createFile(595.28, 841.89)], sheets, 9);

    expect(restored).toBe(sheets);
  });

  it('keeps a landscape source in an A5 landscape sheet', () => {
    const sheet = createSheet();
    const [restored] = restoreLegacyA5PortraitSheets([createFile(841.89, 595.28)], [sheet], 7);

    expect(restored).toBe(sheet);
    expect(restored.orientation).toBe('landscape');
  });
});
