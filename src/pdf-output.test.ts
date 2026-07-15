import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { buildPrintPdf } from './pdf';
import type { Orientation, PaperSize, SheetConfig, UploadedPdf } from './types';

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

function createSheet(paper: PaperSize, orientation: Orientation): SheetConfig {
  return {
    id: `sheet-${paper}-${orientation}`,
    paper,
    orientation,
    layout: 'full',
    margin: 0,
    gap: 0,
    split: 50,
    slots: [{
      id: `slot-${paper}-${orientation}`,
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
  it('exports A4 and A5 logical layouts as matching-orientation A4 physical pages', async () => {
    const file = await createSourceFile();
    const sheets = [
      createSheet('A4', 'portrait'),
      createSheet('A5', 'portrait'),
      createSheet('A4', 'landscape'),
      createSheet('A5', 'landscape'),
    ];
    const result = await buildPrintPdf([file], sheets);
    const output = await PDFDocument.load(result);

    expect(output.getPageCount()).toBe(4);
    expect(output.getPage(0).getWidth()).toBeCloseTo(595.28, 1);
    expect(output.getPage(0).getHeight()).toBeCloseTo(841.89, 1);
    expect(output.getPage(1).getWidth()).toBeCloseTo(595.28, 1);
    expect(output.getPage(1).getHeight()).toBeCloseTo(841.89, 1);
    expect(output.getPage(2).getWidth()).toBeCloseTo(841.89, 1);
    expect(output.getPage(2).getHeight()).toBeCloseTo(595.28, 1);
    expect(output.getPage(3).getWidth()).toBeCloseTo(841.89, 1);
    expect(output.getPage(3).getHeight()).toBeCloseTo(595.28, 1);

    for (const page of output.getPages()) {
      expect(page.getRotation().angle).toBe(0);
    }
  });
});
