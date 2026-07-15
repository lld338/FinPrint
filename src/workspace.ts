import type { SheetConfig } from './types';

export const CURRENT_LAYOUT_DEFAULTS_VERSION = 12;

// 仅修复最早版本中 A5 整页误带的默认边距。
// 用户保存的纸张、方向、版式、材料、缩放、裁切和偏移必须原样保留。
export function restoreWorkspaceSheets(
  sheets: SheetConfig[],
  layoutDefaultsVersion: number,
): SheetConfig[] {
  if (layoutDefaultsVersion >= 3) return sheets;

  let changed = false;
  const restoredSheets = sheets.map((sheet) => {
    if (sheet.paper !== 'A5' || sheet.layout !== 'full' || sheet.margin !== 6) return sheet;
    changed = true;
    return { ...sheet, margin: 0 };
  });

  return changed ? restoredSheets : sheets;
}
