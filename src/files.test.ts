import { describe, expect, it } from 'vitest';
import { getImportFileKind, importFileTypeLabel } from './files';

describe('报销材料文件识别', () => {
  it('识别 PDF 文件', () => {
    expect(getImportFileKind({ name: '电子发票.PDF', type: '' })).toBe('pdf');
    expect(getImportFileKind({ name: 'document', type: 'application/pdf' })).toBe('pdf');
  });

  it('识别常见图片文件', () => {
    expect(getImportFileKind({ name: '报销单.JPG', type: '' })).toBe('image');
    expect(getImportFileKind({ name: '截图', type: 'image/png' })).toBe('image');
    expect(getImportFileKind({ name: '材料.webp', type: 'image/webp' })).toBe('image');
  });

  it('拒绝不支持的文件', () => {
    expect(getImportFileKind({ name: '报销表.xlsx', type: 'application/vnd.ms-excel' })).toBeNull();
    expect(getImportFileKind({ name: '照片.heic', type: 'image/heic' })).toBeNull();
  });

  it('显示图片扩展名', () => {
    expect(importFileTypeLabel('凭证.jpeg')).toBe('JPEG');
    expect(importFileTypeLabel('截图')).toBe('图片');
  });
});
