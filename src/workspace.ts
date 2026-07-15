import { calculateHorizontalAlignmentOffset, calculateSlots } from './layout';
import type { HorizontalAlignment } from './layout';
import type { SheetConfig, SlotConfig, PdfPageInfo, UploadedPdf } from './types';

export const CURRENT_LAYOUT_DEFAULTS_VERSION = 10;

function remapLegacyHorizontalAlignment(
  page: PdfPageInfo,
  sheet: SheetConfig,
  slot: SlotConfig,
): number {
  const sourceHeight = page.height * ((slot.crop ?? 'auto') === 'auto' ? (page.contentHeight ?? 1) : 1);
  const landscapeRect = calculateSlots('A5', 'landscape', 'full', sheet.margin, sheet.gap, sheet.split)[0];
  const portraitRect = calculateSlots('A5', 'portrait', 'full', sheet.margin, sheet.gap, sheet.split)[0];
  const alignments: HorizontalAlignment[] = ['left', 'center', 'right'];

  for (const alignment of alignments) {
    const previousOffset = calculateHorizontalAlignmentOffset(
      page.width,
      sourceHeight,
      landscapeRect,
      slot.fit,
      slot.scale,
      alignment,
    );
    if (Math.abs(slot.offsetX - previousOffset) >= 0.15) continue;

    const restoredOffset = calculateHorizontalAlignmentOffset(
      page.width,
      sourceHeight,
      portraitRect,
      slot.fit,
      slot.scale,
      alignment,
    );
    return Number(restoredOffset.toFixed(1));
  }

  return slot.offsetX;
}

export function restoreLegacyA5PortraitSheets(
  files: UploadedPdf[],
  sheets: SheetConfig[],
  layoutDefaultsVersion: number,
): SheetConfig[] {
  if (layoutDefaultsVersion >= CURRENT_LAYOUT_DEFAULTS_VERSION) return sheets;

  let changed = false;
  const restoredSheets = sheets.map((sheet) => {
    if (
      sheet.paper !== 'A5'
      || sheet.layout !== 'full'
      || sheet.orientation !== 'landscape'
      || sheet.slots[0]?.fit !== 'contain'
    ) return sheet;

    const reference = sheet.slots[0]?.source;
    const file = reference ? files.find((item) => item.id === reference.fileId) : null;
    const page = file && reference ? file.pages[reference.pageIndex] : null;
    if (!page || page.width >= page.height) return sheet;

    const firstSlot = sheet.slots[0];
    const restoredOffsetX = remapLegacyHorizontalAlignment(page, sheet, firstSlot);
    const slots = restoredOffsetX === firstSlot.offsetX
      ? sheet.slots
      : [{ ...firstSlot, offsetX: restoredOffsetX }, ...sheet.slots.slice(1)];

    changed = true;
    // 旧版曾把纵向报销单保存在 A5 横版中，完整显示时只能缩到约 49.8%。
    // 恢复成 A5 纵版；若偏移值来自“左/中/右”按钮，则按新纸张重新计算同一对齐语义。
    return { ...sheet, orientation: 'portrait' as const, slots };
  });

  return changed ? restoredSheets : sheets;
}
