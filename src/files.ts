export type ImportFileKind = 'pdf' | 'image';

const PDF_EXTENSIONS = ['.pdf'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.jfif', '.png', '.webp', '.bmp'];
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/x-ms-bmp',
]);

function hasExtension(name: string, extensions: string[]) {
  const lowerName = name.toLowerCase();
  return extensions.some((extension) => lowerName.endsWith(extension));
}

export function getImportFileKind(file: Pick<File, 'name' | 'type'>): ImportFileKind | null {
  const mimeType = file.type.toLowerCase();
  if (mimeType === 'application/pdf' || hasExtension(file.name, PDF_EXTENSIONS)) return 'pdf';
  if (IMAGE_MIME_TYPES.has(mimeType) || hasExtension(file.name, IMAGE_EXTENSIONS)) return 'image';
  return null;
}

export function importFileTypeLabel(fileName: string) {
  const extension = fileName.split('.').pop()?.toUpperCase();
  return extension && extension !== fileName.toUpperCase() ? extension : '图片';
}
