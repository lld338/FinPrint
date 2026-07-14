import type { LayoutMode, Orientation, PageBox, PaperSize, Rect } from './types';

export const MM_TO_PT = 72 / 25.4;
export const PAPER_MM: Record<PaperSize, [number, number]> = {
  A4: [210, 297],
  A5: [148, 210],
};

export function paperDimensionsMm(paper: PaperSize, orientation: Orientation): [number, number] {
  const [width, height] = PAPER_MM[paper];
  return orientation === 'portrait' ? [width, height] : [height, width];
}

export function paperDimensionsPt(paper: PaperSize, orientation: Orientation): [number, number] {
  const [width, height] = paperDimensionsMm(paper, orientation);
  return [width * MM_TO_PT, height * MM_TO_PT];
}

export function slotCount(layout: LayoutMode): number {
  return layout === 'full' ? 1 : 2;
}

export function calculateSlots(
  paper: PaperSize,
  orientation: Orientation,
  layout: LayoutMode,
  marginMm: number,
  gapMm: number,
  splitPercent: number,
): Rect[] {
  const [pageWidth, pageHeight] = paperDimensionsPt(paper, orientation);
  const margin = marginMm * MM_TO_PT;
  const gap = gapMm * MM_TO_PT;
  const x = margin;
  const y = margin;
  const width = Math.max(1, pageWidth - margin * 2);
  const height = Math.max(1, pageHeight - margin * 2);

  if (layout === 'full') return [{ x, y, width, height }];

  const split = Math.min(0.8, Math.max(0.2, splitPercent / 100));
  if (layout === 'vertical') {
    const usableHeight = Math.max(2, height - gap);
    const topHeight = usableHeight * split;
    const bottomHeight = usableHeight - topHeight;
    return [
      { x, y: y + bottomHeight + gap, width, height: topHeight },
      { x, y, width, height: bottomHeight },
    ];
  }

  const usableWidth = Math.max(2, width - gap);
  const leftWidth = usableWidth * split;
  const rightWidth = usableWidth - leftWidth;
  return [
    { x, y, width: leftWidth, height },
    { x: x + leftWidth + gap, y, width: rightWidth, height },
  ];
}


export function calculateSourceCropBox(viewBox: PageBox, contentHeight: number, trimBottom: boolean): PageBox {
  if (!trimBottom) return { ...viewBox };
  const normalizedContentHeight = Math.max(0.01, Math.min(1, contentHeight));
  const visibleHeight = viewBox.top - viewBox.bottom;
  return {
    ...viewBox,
    bottom: viewBox.top - visibleHeight * normalizedContentHeight,
  };
}

export function fitIntoRect(
  sourceWidth: number,
  sourceHeight: number,
  rect: Rect,
  fit: 'contain' | 'stretch',
  scalePercent: number,
  offsetXmm: number,
  offsetYmm: number,
) {
  const scaleFactor = Math.max(0.25, Math.min(2, scalePercent / 100));
  let width: number;
  let height: number;

  if (fit === 'stretch') {
    width = rect.width * scaleFactor;
    height = rect.height * scaleFactor;
  } else {
    const ratio = Math.min(rect.width / sourceWidth, rect.height / sourceHeight) * scaleFactor;
    width = sourceWidth * ratio;
    height = sourceHeight * ratio;
  }

  const x = rect.x + (rect.width - width) / 2 + offsetXmm * MM_TO_PT;
  const y = rect.y + (rect.height - height) / 2 - offsetYmm * MM_TO_PT;
  return { x, y, width, height };
}

export type HorizontalAlignment = 'left' | 'center' | 'right';

export function calculateHorizontalAlignmentOffset(
  sourceWidth: number,
  sourceHeight: number,
  rect: Rect,
  fit: 'contain' | 'stretch',
  scalePercent: number,
  alignment: HorizontalAlignment,
): number {
  if (alignment === 'center') return 0;
  const placement = fitIntoRect(sourceWidth, sourceHeight, rect, fit, scalePercent, 0, 0);
  const alignedX = alignment === 'left' ? rect.x : rect.x + rect.width - placement.width;
  return (alignedX - placement.x) / MM_TO_PT;
}
