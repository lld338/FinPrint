import type { SheetConfig, UploadedPdf } from './types';

export function restoreLegacyA5PortraitSheets(
  files: UploadedPdf[],
  sheets: SheetConfig[],
  layoutDefaultsVersion: number,
): SheetConfig[] {
  if (layoutDefaultsVersion >= 8) return sheets;

  return sheets.map((sheet) => {
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

    // 旧版曾把纵向报销单保存在 A5 横版中，完整显示时只能缩到约 49.8%。
    // 一次性恢复成 A5 纵版；材料、版位、裁切、缩放和偏移参数全部保留。
    return { ...sheet, orientation: 'portrait' };
  });
}
