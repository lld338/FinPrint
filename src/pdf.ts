import { PDFDocument, StandardFonts, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist';
import { getImportFileKind } from './files';
import { calculateSlots, calculateSourceCropBox, fitIntoRect, outputPageDimensionsPt } from './layout';
import type { PageReference, SheetConfig, UploadedPdf } from './types';


const BLANK_PIXEL_THRESHOLD = 247;
const MIN_TRIMMED_CONTENT_HEIGHT = 0.35;
const MAX_AUTO_TRIM_CONTENT_HEIGHT = 0.88;

function detectContentHeight(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  const xStep = width > 900 ? 2 : 1;
  const minimumMarks = Math.max(3, Math.round(width / 450));
  const rowMarks = Array.from({ length: height }, () => 0);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width * 4;
    let marks = 0;
    for (let x = 0; x < width; x += xStep) {
      const index = rowOffset + x * 4;
      if (
        pixels[index] < BLANK_PIXEL_THRESHOLD
        || pixels[index + 1] < BLANK_PIXEL_THRESHOLD
        || pixels[index + 2] < BLANK_PIXEL_THRESHOLD
      ) {
        marks += 1;
      }
    }
    rowMarks[y] = marks;
  }

  let lastContentRow = -1;
  for (let y = height - 1; y >= 0; y -= 1) {
    if (rowMarks[y] >= minimumMarks) {
      lastContentRow = y;
      break;
    }
  }
  if (lastContentRow < 0) return 1;

  // 有些票据在页脚有页码或极少量说明文字。若主体内容之后存在一整块大空白，
  // 且空白后的零星墨迹不足主体的 6%，仍以主体末端作为裁切位置。
  const minimumLargeGap = Math.round(height * 0.18);
  const searchStart = Math.round(height * 0.3);
  const prefixInk = Array.from({ length: height + 1 }, () => 0);
  for (let y = 0; y < height; y += 1) prefixInk[y + 1] = prefixInk[y] + rowMarks[y];

  for (let gapStart = searchStart; gapStart < lastContentRow; gapStart += 1) {
    if (rowMarks[gapStart] >= minimumMarks) continue;
    let gapEnd = gapStart;
    while (gapEnd <= lastContentRow && rowMarks[gapEnd] < minimumMarks) gapEnd += 1;
    if (gapEnd - gapStart >= minimumLargeGap) {
      const inkBefore = prefixInk[gapStart];
      const inkAfter = prefixInk[height] - prefixInk[gapEnd];
      if (inkBefore > 0 && inkAfter <= inkBefore * 0.06) {
        lastContentRow = gapStart - 1;
        break;
      }
    }
    gapStart = gapEnd;
  }

  const padding = Math.max(10, Math.round(height * 0.012));
  const detected = Math.min(1, (lastContentRow + 1 + padding) / height);
  if (detected >= MAX_AUTO_TRIM_CONTENT_HEIGHT) return 1;
  return Math.max(MIN_TRIMMED_CONTENT_HEIGHT, detected);
}

function createTrimmedPreview(canvas: HTMLCanvasElement, contentHeight: number) {
  if (contentHeight >= 0.999) return canvas.toDataURL('image/jpeg', 0.88);
  const cropped = window.document.createElement('canvas');
  cropped.width = canvas.width;
  cropped.height = Math.max(1, Math.ceil(canvas.height * contentHeight));
  const context = cropped.getContext('2d', { alpha: false });
  if (!context) throw new Error('无法创建 PDF 裁切预览');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, cropped.width, cropped.height);
  context.drawImage(canvas, 0, 0, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  return cropped.toDataURL('image/jpeg', 0.88);
}

export async function inspectPdf(file: File): Promise<UploadedPdf> {
  const bytes = await file.arrayBuffer();
  const loadingTask = getDocument({ data: new Uint8Array(bytes.slice(0)) });
  const document = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 1100 / baseViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = window.document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('无法创建 PDF 预览画布');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const contentHeight = detectContentHeight(canvas, context);
    const preview = canvas.toDataURL('image/jpeg', 0.88);
    const [viewLeft, viewBottom, viewRight, viewTop] = page.view;
    pages.push({
      width: baseViewport.width,
      height: baseViewport.height,
      preview,
      trimmedPreview: contentHeight < 1 ? createTrimmedPreview(canvas, contentHeight) : preview,
      contentHeight,
      // PDF.js 预览使用页面的可视框（CropBox 与 MediaBox 的有效交集）。
      // 导出时复用同一范围，避免“预览正确、生成后又出现隐藏空白”。
      viewBox: { left: viewLeft, bottom: viewBottom, right: viewRight, top: viewTop },
    });
  }

  await document.destroy();
  return {
    id: crypto.randomUUID(),
    name: file.name,
    bytes,
    pages,
    // 按当前报销业务规则给常用材料预设打印方式。
    sourceType: 'pdf',
    printAs: file.name.includes('杜乐乐提交的费用报销')
      ? 'A5'
      : /滴滴电子发票|滴滴出行行程报销单/.test(file.name)
        ? 'half'
        : 'auto',
  };
}


const MAX_IMAGE_EDGE = 5000;
const IMAGE_SOURCE_LONG_EDGE_PT = 720;

async function loadImageSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // 部分浏览器虽然提供 createImageBitmap，但无法读取某些本地图片，继续使用 img 回退。
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`无法读取图片“${file.name}”，请转换为 JPG、PNG 或 WEBP 后重试`));
      image.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/jpeg' | 'image/png') {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片转换失败'))),
      type,
      type === 'image/jpeg' ? 0.95 : undefined,
    );
  });
}

async function convertImageToPdf(file: File) {
  const image = await loadImageSource(file);
  try {
    if (!image.width || !image.height) throw new Error(`图片“${file.name}”尺寸无效`);
    const renderScale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
    const canvas = window.document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * renderScale));
    canvas.height = Math.max(1, Math.round(image.height * renderScale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('无法创建图片预览画布');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image.source, 0, 0, canvas.width, canvas.height);

    const keepPng = file.type.toLowerCase() === 'image/png' || file.name.toLowerCase().endsWith('.png');
    const normalizedBlob = await canvasToBlob(canvas, keepPng ? 'image/png' : 'image/jpeg');
    const normalizedBytes = new Uint8Array(await normalizedBlob.arrayBuffer());
    const pageScale = IMAGE_SOURCE_LONG_EDGE_PT / Math.max(canvas.width, canvas.height);
    const pageWidth = canvas.width * pageScale;
    const pageHeight = canvas.height * pageScale;
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([pageWidth, pageHeight]);
    const embeddedImage = keepPng
      ? await pdf.embedPng(normalizedBytes)
      : await pdf.embedJpg(normalizedBytes);
    page.drawImage(embeddedImage, { x: 0, y: 0, width: pageWidth, height: pageHeight });
    return pdf.save();
  } finally {
    image.release();
  }
}

export async function inspectImportFile(file: File): Promise<UploadedPdf> {
  const kind = getImportFileKind(file);
  if (kind === 'pdf') return inspectPdf(file);
  if (kind !== 'image') throw new Error(`不支持文件“${file.name}”，请选择 PDF、JPG、PNG、WEBP 或 BMP`);

  const pdfBytes = await convertImageToPdf(file);
  const convertedBytes = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength,
  ) as ArrayBuffer;
  const converted = new File([convertedBytes], file.name, { type: 'application/pdf' });
  const inspected = await inspectPdf(converted);
  return {
    ...inspected,
    name: file.name,
    sourceType: 'image',
    // 图片没有可靠的物理纸张尺寸，默认作为普通材料参与 A4 上下拼版。
    printAs: 'auto',
  };
}

function resolveReference(files: UploadedPdf[], reference: PageReference | null) {
  if (!reference) return null;
  const file = files.find((item) => item.id === reference.fileId);
  if (!file || !file.pages[reference.pageIndex]) return null;
  return { file, page: file.pages[reference.pageIndex] };
}

export async function buildPrintPdf(files: UploadedPdf[], sheets: SheetConfig[]): Promise<Uint8Array> {
  if (!sheets.length) throw new Error('请先添加至少一张打印纸');
  const output = await PDFDocument.create();
  output.setTitle('报销打印文件');
  output.setCreator('报销打印台');
  const sourceDocuments = new Map<string, PDFDocument>();

  for (const file of files) {
    sourceDocuments.set(file.id, await PDFDocument.load(file.bytes.slice(0)));
  }

  for (const sheet of sheets) {
    const [pageWidth, pageHeight] = outputPageDimensionsPt(sheet.orientation);
    const outputPage = output.addPage([pageWidth, pageHeight]);
    const rects = calculateSlots(sheet.paper, sheet.orientation, sheet.layout, sheet.margin, sheet.gap, sheet.split);

    for (let index = 0; index < rects.length; index += 1) {
      const slot = sheet.slots[index];
      const source = resolveReference(files, slot?.source ?? null);
      if (!slot || !source) continue;
      const sourceDoc = sourceDocuments.get(source.file.id)!;
      const sourcePage = sourceDoc.getPage(slot.source!.pageIndex);
      const contentHeight = source.page.contentHeight ?? 1;
      const shouldTrimBottom = (slot.crop ?? 'auto') === 'auto' && contentHeight < 0.999;
      const fallbackCropBox = sourcePage.getCropBox();
      const visibleBox = source.page.viewBox ?? {
        left: fallbackCropBox.x,
        bottom: fallbackCropBox.y,
        right: fallbackCropBox.x + fallbackCropBox.width,
        top: fallbackCropBox.y + fallbackCropBox.height,
      };
      const embedded = await output.embedPage(
        sourcePage,
        calculateSourceCropBox(visibleBox, contentHeight, shouldTrimBottom),
      );
      const placement = fitIntoRect(
        embedded.width,
        embedded.height,
        rects[index],
        slot.fit,
        slot.scale,
        slot.offsetX,
        slot.offsetY,
      );

      const rect = rects[index];
      outputPage.pushOperators(
        pushGraphicsState(),
        rectangle(rect.x, rect.y, rect.width, rect.height),
        clip(),
        endPath(),
      );
      outputPage.drawPage(embedded, placement);
      outputPage.pushOperators(popGraphicsState());
    }
  }

  return output.save();
}

export async function createDemoFiles(): Promise<File[]> {
  const specs = [
    { name: '滴滴电子发票_37486_566.pdf', width: 595.28, height: 841.89, title: 'DIDI ELECTRONIC INVOICE', accent: rgb(0.15, 0.42, 0.78) },
    { name: '滴滴出行行程报销单_43821_446.pdf', width: 595.28, height: 841.89, title: 'DIDI TRIP REIMBURSEMENT', accent: rgb(0.06, 0.56, 0.48) },
    { name: '杜乐乐提交的费用报销.pdf', width: 419.53, height: 595.28, title: 'EXPENSE REIMBURSEMENT / A5', accent: rgb(0.48, 0.27, 0.78) },
  ];
  const files: File[] = [];

  for (const spec of specs) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([spec.width, spec.height]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    page.drawRectangle({ x: 34, y: 34, width: spec.width - 68, height: spec.height - 68, borderColor: spec.accent, borderWidth: 2 });
    page.drawText(spec.title, { x: 54, y: spec.height - 92, size: 18, font: bold, color: spec.accent });
    page.drawText('Sample document for layout preview', { x: 54, y: spec.height - 120, size: 10, font: regular, color: rgb(0.35, 0.4, 0.48) });
    for (let row = 0; row < 8; row += 1) {
      const y = spec.height - 175 - row * 42;
      page.drawLine({ start: { x: 54, y }, end: { x: spec.width - 54, y }, thickness: 0.6, color: rgb(0.78, 0.81, 0.86) });
      page.drawText(`Item ${row + 1}`, { x: 60, y: y + 12, size: 10, font: regular, color: rgb(0.2, 0.24, 0.3) });
      page.drawText((38.6 + row * 17.4).toFixed(2), { x: spec.width - 105, y: y + 12, size: 10, font: regular, color: rgb(0.2, 0.24, 0.3) });
    }
    page.drawText('TOTAL', { x: spec.width - 170, y: 72, size: 11, font: bold, color: rgb(0.2, 0.24, 0.3) });
    page.drawText('CNY 568.40', { x: spec.width - 115, y: 72, size: 11, font: bold, color: spec.accent });
    const bytes = await pdf.save();
    const fileBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    files.push(new File([fileBytes], spec.name, { type: 'application/pdf' }));
  }

  return files;
}
