export type PaperSize = 'A4' | 'A5';
export type Orientation = 'portrait' | 'landscape';
export type LayoutMode = 'full' | 'vertical' | 'horizontal';
export type FitMode = 'contain' | 'stretch';
export type CropMode = 'auto' | 'full';
export type SourceFileType = 'pdf' | 'image';

export interface PageBox {
  left: number;
  bottom: number;
  right: number;
  top: number;
}

export interface PdfPageInfo {
  width: number;
  height: number;
  preview: string;
  trimmedPreview: string;
  contentHeight: number;
  viewBox: PageBox;
}

export interface UploadedPdf {
  id: string;
  name: string;
  bytes: ArrayBuffer;
  pages: PdfPageInfo[];
  // 旧版 IndexedDB 数据没有此字段，缺省时按 PDF 处理。
  sourceType?: SourceFileType;
}

export interface PageReference {
  fileId: string;
  pageIndex: number;
}

export interface SlotConfig {
  id: string;
  source: PageReference | null;
  fit: FitMode;
  crop: CropMode;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface SheetConfig {
  id: string;
  paper: PaperSize;
  orientation: Orientation;
  layout: LayoutMode;
  margin: number;
  gap: number;
  split: number;
  slots: SlotConfig[];
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
