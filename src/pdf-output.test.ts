import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { buildPrintPdf } from './pdf';
import type { SheetConfig, UploadedPdf } from './types';

async function createSourceFile(): Promise<UploadedPdf> {
  const document = await PDFDocument.create();
  const page = document.addPage([595.28, 841.89]);
  page.drawText('source', { x: 24, y: 800 });
  const bytes = await document.save();
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return {
    id: 'source',
    name: 'source.pdf',
    bytes: arrayBuffer,
    printAs: 'A5',
    pages: [{
      width: 595.28,
      height: 841.89,
      preview: '',
      trimmedPreview: '',
      contentHeight: 1,
      viewBox: { left: 0, bottom: 0, right: 595.28, top: 841.89 },
    }],
  };
}

function createSheet(paper: 'A4' | 'A5'): SheetConfig {
  return {
    id: `sheet-${paper}`,
    paper,
    orientation: 'portrait',
    layout: 'full',
    margin: 0,
    gap: 0,
    split: 50,
    slots: [{
      id: `slot-${paper}`,
      source: { fileId: 'source', pageIndex: 0 },
      fit: 'contain',
      crop: 'full',
      scale: 100,
      offsetX: 0,
      offsetY: 0,
    }],
  };
}

describe('PDF output paper', () => {
  it('exports both A4 and A5 print modes as A4 physical pages', async () => {
    const file = await createSourceFile();
    const result = await buildPrintPdf([file], [createSheet('A4'), createSheet('A5')]);
    const output = await PDFDocument.load(result);

    expect(output.getPageCount()).toBe(2);
    for (const page of output.getPages()) {
      expect(page.getWidth()).toBeCloseTo(595.28, 1);
      expect(page.getHeight()).toBeCloseTo(841.89, 1);
    }
  });
});
