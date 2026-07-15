import { describe, expect, it } from 'vitest';
import {
  calculateHorizontalAlignmentOffset,
  calculateOutputSlots,
  calculateSlots,
  calculateSourceCropBox,
  fitIntoRect,
  MM_TO_PT,
  outputContentRectPt,
  outputPageDimensionsPt,
  paperDimensionsPt,
} from './layout';

describe('print layout', () => {
  it('uses the four independent A4/A5 portrait and landscape logical sizes', () => {
    expect(paperDimensionsPt('A4', 'portrait')).toEqual([
      210 * MM_TO_PT,
      297 * MM_TO_PT,
    ]);
    expect(paperDimensionsPt('A4', 'landscape')).toEqual([
      297 * MM_TO_PT,
      210 * MM_TO_PT,
    ]);
    expect(paperDimensionsPt('A5', 'portrait')).toEqual([
      148 * MM_TO_PT,
      210 * MM_TO_PT,
    ]);
    expect(paperDimensionsPt('A5', 'landscape')).toEqual([
      210 * MM_TO_PT,
      148 * MM_TO_PT,
    ]);
  });

  it('creates two equal vertical A4 slots at 50%', () => {
    const [width] = paperDimensionsPt('A4', 'portrait');
    const slots = calculateSlots('A4', 'portrait', 'vertical', 0, 0, 50);
    expect(slots).toHaveLength(2);
    expect(slots[0].width).toBeCloseTo(width);
    expect(slots[0].height).toBeCloseTo(slots[1].height);
    expect(slots[0].y).toBeCloseTo(slots[1].height);
  });

  it('calculates A5 slots inside the selected logical paper instead of an A4 carrier', () => {
    const portrait = calculateSlots('A5', 'portrait', 'full', 0, 0, 50)[0];
    const landscape = calculateSlots('A5', 'landscape', 'full', 0, 0, 50)[0];

    expect(portrait).toEqual({
      x: 0,
      y: 0,
      width: 148 * MM_TO_PT,
      height: 210 * MM_TO_PT,
    });
    expect(landscape).toEqual({
      x: 0,
      y: 0,
      width: 210 * MM_TO_PT,
      height: 148 * MM_TO_PT,
    });
  });

  it('uses the selected direction for A4 and an A4 landscape carrier for A5', () => {
    expect(outputPageDimensionsPt('A4', 'portrait')).toEqual([
      210 * MM_TO_PT,
      297 * MM_TO_PT,
    ]);
    expect(outputPageDimensionsPt('A4', 'landscape')).toEqual([
      297 * MM_TO_PT,
      210 * MM_TO_PT,
    ]);
    expect(outputPageDimensionsPt('A5', 'portrait')).toEqual([
      297 * MM_TO_PT,
      210 * MM_TO_PT,
    ]);
    expect(outputPageDimensionsPt('A5', 'landscape')).toEqual([
      297 * MM_TO_PT,
      210 * MM_TO_PT,
    ]);
  });

  it('places A5 portrait at the left of an A4 landscape output page', () => {
    const content = outputContentRectPt('A5', 'portrait');
    const slot = calculateOutputSlots('A5', 'portrait', 'full', 0, 0, 50)[0];

    expect(content.x).toBe(0);
    expect(content.y).toBeCloseTo(0);
    expect(content.width).toBeCloseTo(148 * MM_TO_PT);
    expect(content.height).toBeCloseTo(210 * MM_TO_PT);
    expect(slot.x).toBe(0);
    expect(slot.y).toBeCloseTo(content.y);
    expect(slot.width).toBeCloseTo(content.width);
    expect(slot.height).toBeCloseTo(content.height);
  });

  it('places A5 landscape at the left and vertically centered on A4 landscape', () => {
    const content = outputContentRectPt('A5', 'landscape');
    const slot = calculateOutputSlots('A5', 'landscape', 'full', 0, 0, 50)[0];

    expect(content.x).toBe(0);
    expect(content.y).toBeCloseTo(31 * MM_TO_PT);
    expect(content.width).toBeCloseTo(210 * MM_TO_PT);
    expect(content.height).toBeCloseTo(148 * MM_TO_PT);
    expect(slot.x).toBe(0);
    expect(slot.y).toBeCloseTo(content.y);
    expect(slot.width).toBeCloseTo(content.width);
    expect(slot.height).toBeCloseTo(content.height);
  });

  it('keeps A4 slots unchanged when moving them to the physical output page', () => {
    expect(calculateOutputSlots('A4', 'landscape', 'full', 0, 0, 50)).toEqual(
      calculateSlots('A4', 'landscape', 'full', 0, 0, 50),
    );
  });

  it('keeps the PDF visible CropBox instead of falling back to the full MediaBox', () => {
    const visibleBox = { left: 0, bottom: 432.875, right: 595.275, top: 841.875 };
    expect(calculateSourceCropBox(visibleBox, 1, false)).toEqual(visibleBox);
  });

  it('trims bottom whitespace relative to the visible PDF box', () => {
    const visibleBox = { left: 0, bottom: 0, right: 595.275, top: 841.875 };
    const result = calculateSourceCropBox(visibleBox, 0.476, true);
    expect(result.bottom).toBeCloseTo(441.11, 1);
    expect(result.top).toBe(visibleBox.top);
  });

  it('can align a narrow document to the left or right of a landscape page', () => {
    const rect = { x: 0, y: 0, width: 842, height: 595 };
    const leftOffset = calculateHorizontalAlignmentOffset(419.53, 595.28, rect, 'contain', 100, 'left');
    const rightOffset = calculateHorizontalAlignmentOffset(419.53, 595.28, rect, 'contain', 100, 'right');
    const left = fitIntoRect(419.53, 595.28, rect, 'contain', 100, leftOffset, 0);
    const right = fitIntoRect(419.53, 595.28, rect, 'contain', 100, rightOffset, 0);

    expect(left.x).toBeCloseTo(rect.x);
    expect(right.x + right.width).toBeCloseTo(rect.x + rect.width);
    expect(leftOffset).toBeLessThan(0);
    expect(rightOffset).toBeGreaterThan(0);
  });

  it('contains a portrait source in a landscape slot without rotating it', () => {
    const rect = { x: 0, y: 0, width: 595, height: 419 };
    const result = fitIntoRect(595, 842, rect, 'contain', 100, 0, 0);
    expect(result.height).toBeCloseTo(419);
    expect(result.width).toBeLessThan(rect.width);
    expect(result.height).toBeGreaterThan(result.width);
  });

  it('fits a portrait A4 source into A5 portrait at about 148 by 209 millimeters', () => {
    const rect = calculateOutputSlots('A5', 'portrait', 'full', 0, 0, 50)[0];
    const result = fitIntoRect(210 * MM_TO_PT, 297 * MM_TO_PT, rect, 'contain', 100, 0, 0);

    expect(result.width / MM_TO_PT).toBeCloseTo(148, 1);
    expect(result.height / MM_TO_PT).toBeCloseTo(209.31, 1);
    expect(result.x).toBeCloseTo(0);
    expect(result.y / MM_TO_PT).toBeCloseTo((210 - 209.31) / 2, 1);
  });
});
