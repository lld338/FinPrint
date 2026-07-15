import { describe, expect, it } from 'vitest';
import { calculateHorizontalAlignmentOffset, calculateSlots, calculateSourceCropBox, fitIntoRect, paperDimensionsPt } from './layout';

describe('print layout', () => {
  it('creates two equal vertical A4 slots at 50%', () => {
    const [width] = paperDimensionsPt('A4', 'portrait');
    const slots = calculateSlots('A4', 'portrait', 'vertical', 0, 0, 50);
    expect(slots).toHaveLength(2);
    expect(slots[0].width).toBeCloseTo(width);
    expect(slots[0].height).toBeCloseTo(slots[1].height);
    expect(slots[0].y).toBeCloseTo(slots[1].height);
  });

  it('respects A5 paper dimensions', () => {
    const [width, height] = paperDimensionsPt('A5', 'portrait');
    expect(width).toBeCloseTo(419.52, 1);
    expect(height).toBeCloseTo(595.28, 1);
  });

  it('uses the complete A5 page when full-page margin is zero', () => {
    const [width, height] = paperDimensionsPt('A5', 'portrait');
    const [slot] = calculateSlots('A5', 'portrait', 'full', 0, 0, 50);
    expect(slot).toEqual({ x: 0, y: 0, width, height });
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

  it('contains an A4 source in a half-page slot without distortion', () => {
    const rect = { x: 0, y: 0, width: 500, height: 350 };
    const result = fitIntoRect(595, 842, rect, 'contain', 100, 0, 0);
    expect(result.height).toBeCloseTo(350);
    expect(result.width).toBeLessThan(500);
  });
});
