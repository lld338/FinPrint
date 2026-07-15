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

// 最终打印文件统一使用 A4 实体页，方向跟随当前逻辑版面。
export function outputPageDimensionsPt(orientation: Orientation): [number, number] {
  return paperDimensionsPt('A4', orientation);
}

// 编辑与预览使用真正的 A4/A5 逻辑版面；导出时再把完整逻辑版面平移到 A4 承载页。
export function outputContentRectPt(paper: PaperSize, orientation: Orientation): Rect {
  const [pageWidth, pageHeight] = outputPageDimensionsPt(orientation);
  const [contentWidth, contentHeight] = paperDimensionsPt(paper, orientation);

  if (paper === 'A4') {
    return { x: 0, y: 0, width: contentWidth, height: contentHeight };
  }

  return {
    x: 0,
    // A5 竖版贴 A4 竖版左上角；A5 横版放在 A4 横版左侧并垂直居中。
    y: orientation === 'portrait' ? pageHeight - contentHeight : (pageHeight - contentHeight) / 2,
    width: contentWidth,
    height: contentHeight,
  };
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

export function calculateOutputSlots(
  paper: PaperSize,
  orientation: Orientation,
  layout: LayoutMode,
  marginMm: number,
  gapMm: number,
  splitPercent: number,
): Rect[] {
  const contentRect = outputContentRectPt(paper, orientation);
  return calculateSlots(paper, orientation, layout, marginMm, gapMm, splitPercent).map((rect) => ({
    ...rect,
    x: rect.x + contentRect.x,
    y: rect.y + contentRect.y,
  }));
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
