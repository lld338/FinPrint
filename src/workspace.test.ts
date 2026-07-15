import { describe, expect, it } from 'vitest';
import type { SheetConfig, UploadedPdf } from './types';
import { restoreLegacyA5PortraitSheets } from './workspace';

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

  it('does not change a user-selected landscape sheet after the migration version', () => {
    const sheet = createSheet();
    const sheets = [sheet];
    const restored = restoreLegacyA5PortraitSheets([createFile(595.28, 841.89)], sheets, 8);

    expect(restored).toBe(sheets);
    expect(restored[0].orientation).toBe('landscape');
  });

  it('keeps a landscape source in an A5 landscape sheet', () => {
    const sheet = createSheet();
    const [restored] = restoreLegacyA5PortraitSheets([createFile(841.89, 595.28)], [sheet], 7);

    expect(restored).toBe(sheet);
    expect(restored.orientation).toBe('landscape');
  });
});
