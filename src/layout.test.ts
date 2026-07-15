import { describe, expect, it } from 'vitest';
import { A5_SOURCE_ROTATION_DEGREES, calculateHorizontalAlignmentOffset, calculateSlots, calculateSourceCropBox, fitIntoRect, outputPageDimensionsPt, paperDimensionsPt, placementAfterQuarterTurn, shouldRotateSourceForPrint, sourceDimensionsForPrint } from './layout';

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

  it('always uses an A4 physical output page', () => {
    const [width, height] = outputPageDimensionsPt('portrait');
    expect(width).toBeCloseTo(595.28, 1);
    expect(height).toBeCloseTo(841.89, 1);
  });

  it('places a complete A5 landscape print area on the upper half of an A4 portrait page', () => {
    const [, pageHeight] = outputPageDimensionsPt('portrait');
    const [width, height] = paperDimensionsPt('A5', 'landscape');
    const [slot] = calculateSlots('A5', 'portrait', 'full', 0, 0, 50);
    expect(slot).toEqual({
      x: 0,
      y: pageHeight - height,
      width,
      height,
    });
  });

  it('rotates portrait source pages for A5 landscape printing', () => {
    expect(shouldRotateSourceForPrint('A5', 595.28, 841.89)).toBe(true);
    expect(sourceDimensionsForPrint('A5', 595.28, 841.89)).toEqual([841.89, 595.28]);
    expect(shouldRotateSourceForPrint('A4', 595.28, 841.89)).toBe(false);
    expect(shouldRotateSourceForPrint('A5', 841.89, 595.28)).toBe(false);
    expect(shouldRotateSourceForPrint('A5', 595.28, 400)).toBe(false);
  });

  it('rotates A5 portrait sources clockwise into the upper landscape area', () => {
    expect(A5_SOURCE_ROTATION_DEGREES).toBe(-90);
    expect(placementAfterQuarterTurn({ x: 10, y: 20, width: 30, height: 40 })).toEqual({
      x: 10,
      y: 60,
      width: 40,
      height: 30,
      rotation: -90,
    });
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
