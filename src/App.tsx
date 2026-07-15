import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FilePlus2,
  FileText,
  GripVertical,
  LayoutTemplate,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { getImportFileKind, importFileTypeLabel } from './files';
import { calculateHorizontalAlignmentOffset, calculateSlots, fitIntoRect, paperDimensionsPt, slotCount } from './layout';
import { buildPrintPdf, createDemoFiles, inspectImportFile, inspectPdf } from './pdf';
import { clearGeneratedPrintFiles, createPrintUrl } from './print';
import { clearWorkspace, loadWorkspace, saveWorkspace } from './storage';
import { CURRENT_LAYOUT_DEFAULTS_VERSION, restoreWorkspaceSheets } from './workspace';
import type {
  CropMode,
  FitMode,
  LayoutMode,
  Orientation,
  PageReference,
  PaperSize,
  SheetConfig,
  SlotConfig,
  UploadedPdf,
} from './types';

const pageLabels: Record<LayoutMode, string> = {
  full: '整页',
  vertical: '上下两联',
  horizontal: '左右两联',
};

const FINPRINT_DRAG_TYPE = 'application/x-finprint-item';

type FinPrintDragPayload =
  | { kind: 'file-page'; source: PageReference }
  | { kind: 'slot'; sheetId: string; slotIndex: number };

function writeDragPayload(event: DragEvent<HTMLElement>, payload: FinPrintDragPayload) {
  const serialized = JSON.stringify(payload);
  event.dataTransfer.setData(FINPRINT_DRAG_TYPE, serialized);
  // Some embedded browsers discard custom drag MIME types, so keep the same payload in text/plain too.
  event.dataTransfer.setData('text/plain', serialized);
}

function readDragPayload(event: DragEvent<HTMLElement>): FinPrintDragPayload | null {
  const raw = event.dataTransfer.getData(FINPRINT_DRAG_TYPE) || event.dataTransfer.getData('text/plain');
  if (!raw) return null;
  try {
    const payload = JSON.parse(raw) as FinPrintDragPayload;
    if (payload.kind === 'file-page' && payload.source?.fileId) return payload;
    if (payload.kind === 'slot' && payload.sheetId && Number.isInteger(payload.slotIndex)) return payload;
  } catch {
    // Ignore drag data from outside FinPrint.
  }
  return null;
}

function createSlot(source: PageReference | null = null): SlotConfig {
  return {
    id: crypto.randomUUID(),
    source,
    fit: 'contain',
    crop: 'auto',
    scale: 100,
    offsetX: 0,
    offsetY: 0,
  };
}

function createSheet(
  layout: LayoutMode = 'vertical',
  paper: PaperSize = 'A4',
  sources: Array<PageReference | null> = [],
  orientation: Orientation = 'portrait',
): SheetConfig {
  return {
    id: crypto.randomUUID(),
    paper,
    orientation,
    layout,
    margin: layout === 'full' ? 0 : 6,
    gap: layout === 'full' ? 0 : 4,
    split: 50,
    slots: Array.from({ length: slotCount(layout) }, (_, index) => createSlot(sources[index] ?? null)),
  };
}

function isA5Page(width: number, height: number) {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  return Math.abs(short - 419.53) / 419.53 < 0.08 && Math.abs(long - 595.28) / 595.28 < 0.08;
}

function isA4Page(width: number, height: number) {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  return Math.abs(short - 595.28) / 595.28 < 0.08 && Math.abs(long - 841.89) / 841.89 < 0.08;
}

function detectedPaper(width: number, height: number) {
  if (isA5Page(width, height)) return 'A5';
  if (isA4Page(width, height)) return 'A4';
  return '自定义';
}

function pageSizeMmLabel(width: number, height: number) {
  const widthMm = Math.round((width / 72) * 25.4);
  const heightMm = Math.round((height / 72) * 25.4);
  return `${widthMm} × ${heightMm} mm`;
}

function pageOrientation(width: number, height: number): Orientation {
  return width > height ? 'landscape' : 'portrait';
}

// 智能排版只看 PDF 页面尺寸，不按文件名做任何业务预设。
function autoLayout(files: UploadedPdf[]): SheetConfig[] {
  const regular: PageReference[] = [];
  const result: SheetConfig[] = [];

  files.forEach((file) => {
    file.pages.forEach((page, pageIndex) => {
      const reference = { fileId: file.id, pageIndex };
      const orientation = pageOrientation(page.width, page.height);
      if (isA5Page(page.width, page.height)) {
        result.push(createSheet('full', 'A5', [reference], orientation));
      } else if (isA4Page(page.width, page.height)) {
        result.push(createSheet('full', 'A4', [reference], orientation));
      } else {
        // 非标准 A4/A5 页面：两两放入 A4 上下联，便于自定义尺寸材料拼版。
        regular.push(reference);
      }
    });
  });

  for (let index = 0; index < regular.length; index += 2) {
    result.unshift(createSheet('vertical', 'A4', [regular[index], regular[index + 1] ?? null]));
  }
  return result;
}

function formatFileName(name: string) {
  return name.replace(/\.(pdf|jpe?g|jfif|png|webp|bmp)$/i, '');
}

function sourceKey(source: PageReference | null) {
  return source ? `${source.fileId}:${source.pageIndex}` : '';
}

function parseSourceKey(value: string): PageReference | null {
  if (!value) return null;
  const separator = value.lastIndexOf(':');
  return { fileId: value.slice(0, separator), pageIndex: Number(value.slice(separator + 1)) };
}

function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const generateLockRef = useRef(false);
  const [files, setFiles] = useState<UploadedPdf[]>([]);
  const [sheets, setSheets] = useState<SheetConfig[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [draggingFileId, setDraggingFileId] = useState<string | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false);

  const selectedIndex = Math.max(0, sheets.findIndex((sheet) => sheet.id === selectedSheetId));
  const selectedSheet = sheets[selectedIndex] ?? null;
  const selectedSlot = selectedSheet?.slots[selectedSlotIndex] ?? selectedSheet?.slots[0] ?? null;
  const selectedSourceFile = selectedSlot?.source ? files.find((file) => file.id === selectedSlot.source?.fileId) : null;
  const selectedSourcePage = selectedSourceFile && selectedSlot?.source ? selectedSourceFile.pages[selectedSlot.source.pageIndex] : null;
  const detectedBlankPercent = selectedSourcePage ? Math.round((1 - (selectedSourcePage.contentHeight ?? 1)) * 100) : 0;
  const selectedSlotRect = selectedSheet
    ? calculateSlots(selectedSheet.paper, selectedSheet.orientation, selectedSheet.layout, selectedSheet.margin, selectedSheet.gap, selectedSheet.split)[selectedSlotIndex]
    : null;
  const selectedSourceDimensions = selectedSlot && selectedSourcePage
    ? [
        selectedSourcePage.width,
        selectedSourcePage.height * ((selectedSlot.crop ?? 'auto') === 'auto' ? (selectedSourcePage.contentHeight ?? 1) : 1),
      ] as const
    : null;
  const horizontalAlignmentOffsets = selectedSlot && selectedSlotRect && selectedSourceDimensions
    ? {
        left: calculateHorizontalAlignmentOffset(
          selectedSourceDimensions[0],
          selectedSourceDimensions[1],
          selectedSlotRect,
          selectedSlot.fit,
          selectedSlot.scale,
          'left',
        ),
        center: 0,
        right: calculateHorizontalAlignmentOffset(
          selectedSourceDimensions[0],
          selectedSourceDimensions[1],
          selectedSlotRect,
          selectedSlot.fit,
          selectedSlot.scale,
          'right',
        ),
      }
    : null;

  const allPages = useMemo(
    () =>
      files.flatMap((file) =>
        file.pages.map((page, pageIndex) => ({ file, page, pageIndex, key: `${file.id}:${pageIndex}` })),
      ),
    [files],
  );

  useEffect(() => {
    let cancelled = false;

    void loadWorkspace()
      .then((workspace) => {
        if (cancelled) return;
        if (!workspace || workspace.version !== 1) return;
        // 旧数据只修复最早的 A5 整页默认边距；用户选择的方向和版式原样恢复。
        const restoredSheets = restoreWorkspaceSheets(
          workspace.sheets,
          workspace.layoutDefaultsVersion ?? 0,
        );
        setFiles(workspace.files);
        setSheets(restoredSheets);
        const selectedSheetExists = restoredSheets.some(
          (sheet) => sheet.id === workspace.selectedSheetId,
        );
        setSelectedSheetId(
          selectedSheetExists
            ? workspace.selectedSheetId
            : restoredSheets[0]?.id ?? null,
        );
        setSelectedSlotIndex(Math.max(0, workspace.selectedSlotIndex));
      })
      .catch(() => {
        if (!cancelled) setToast('未能恢复上次内容，可继续正常使用');
      })
      .finally(() => {
        if (!cancelled) setWorkspaceReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!workspaceReady) return;
    void saveWorkspace({
      version: 1,
      layoutDefaultsVersion: CURRENT_LAYOUT_DEFAULTS_VERSION,
      files,
      sheets,
      selectedSheetId,
      selectedSlotIndex,
    }).catch(() => setToast('本次修改未能保存到浏览器'));
  }, [files, selectedSheetId, selectedSlotIndex, sheets, workspaceReady]);

  useEffect(() => {
    if (!clearConfirmationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setClearConfirmationOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [clearConfirmationOpen]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  async function addFiles(incoming: File[]) {
    const supportedFiles = incoming.filter((file) => getImportFileKind(file));
    const skippedCount = incoming.length - supportedFiles.length;
    if (!supportedFiles.length) {
      notify('请选择 PDF、JPG、PNG、WEBP 或 BMP 文件');
      return;
    }
    setBusy(`正在读取 ${supportedFiles.length} 个报销材料…`);
    try {
      const inspected: UploadedPdf[] = [];
      for (const file of supportedFiles) inspected.push(await inspectImportFile(file));
      const nextFiles = [...files, ...inspected];
      setFiles(nextFiles);
      const nextSheets = autoLayout(nextFiles);
      setSheets(nextSheets);
      setSelectedSheetId((current) => current ?? nextSheets[0]?.id ?? null);
      const skippedMessage = skippedCount ? `，已跳过 ${skippedCount} 个不支持的文件` : '';
      notify(`已导入 ${supportedFiles.length} 个文件，共 ${inspected.reduce((sum, file) => sum + file.pages.length, 0)} 页${skippedMessage}`);
    } catch (error) {
      notify(error instanceof Error ? error.message : '报销材料读取失败');
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function updateSelectedSheet(patch: Partial<SheetConfig>) {
    if (!selectedSheet) return;
    setSheets((current) => current.map((sheet) => (sheet.id === selectedSheet.id ? { ...sheet, ...patch } : sheet)));
  }

  function updatePaper(paper: PaperSize) {
    if (!selectedSheet) return;
    // A4/A5 只改变逻辑版面尺寸；方向、版位和内容参数全部保留。
    updateSelectedSheet({ paper });
  }

  function updateLayout(layout: LayoutMode) {
    if (!selectedSheet) return;
    const needed = slotCount(layout);
    const nextSlots = Array.from({ length: needed }, (_, index) => selectedSheet.slots[index] ?? createSlot());
    const margin = layout === 'full'
      ? (selectedSheet.layout === 'full' ? selectedSheet.margin : 0)
      : (selectedSheet.layout === 'full' && selectedSheet.margin === 0 ? 6 : selectedSheet.margin);
    updateSelectedSheet({
      layout,
      slots: nextSlots,
      margin,
      gap: layout === 'full' ? 0 : selectedSheet.gap || 4,
    });
    setSelectedSlotIndex(0);
  }

  function updateSlot(patch: Partial<SlotConfig>) {
    if (!selectedSheet || !selectedSlot) return;
    const slots = selectedSheet.slots.map((slot, index) => (index === selectedSlotIndex ? { ...slot, ...patch } : slot));
    updateSelectedSheet({ slots });
  }

  function dropOnSlot(targetSheetId: string, targetSlotIndex: number, payload: FinPrintDragPayload) {
    let message = '材料已放入版位';
    setSheets((current) =>
      current.map((sheet) => {
        if (sheet.id !== targetSheetId || !sheet.slots[targetSlotIndex]) return sheet;
        const slots = [...sheet.slots];

        if (payload.kind === 'file-page') {
          slots[targetSlotIndex] = { ...slots[targetSlotIndex], source: payload.source };
        } else {
          if (payload.sheetId !== targetSheetId || payload.slotIndex === targetSlotIndex || !slots[payload.slotIndex]) return sheet;
          const sourceSlot = slots[payload.slotIndex];
          const targetSlot = slots[targetSlotIndex];
          slots[payload.slotIndex] = { ...targetSlot, id: sourceSlot.id };
          slots[targetSlotIndex] = { ...sourceSlot, id: targetSlot.id };
          message = sheet.layout === 'vertical' ? '上下版位已互换' : sheet.layout === 'horizontal' ? '左右版位已互换' : '版位已互换';
        }

        return { ...sheet, slots };
      }),
    );
    setSelectedSheetId(targetSheetId);
    setSelectedSlotIndex(targetSlotIndex);
    notify(message);
  }

  function addSheet() {
    const sheet = createSheet('vertical', 'A4');
    setSheets((current) => [...current, sheet]);
    setSelectedSheetId(sheet.id);
    setSelectedSlotIndex(0);
  }

  function duplicateSheet() {
    if (!selectedSheet) return;
    const copy: SheetConfig = {
      ...selectedSheet,
      id: crypto.randomUUID(),
      slots: selectedSheet.slots.map((slot) => ({ ...slot, id: crypto.randomUUID() })),
    };
    setSheets((current) => {
      const index = current.findIndex((sheet) => sheet.id === selectedSheet.id);
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
    setSelectedSheetId(copy.id);
    notify('已复制当前打印页');
  }

  function removeSheet() {
    if (!selectedSheet) return;
    const index = sheets.findIndex((sheet) => sheet.id === selectedSheet.id);
    const next = sheets.filter((sheet) => sheet.id !== selectedSheet.id);
    setSheets(next);
    setSelectedSheetId(next[Math.min(index, next.length - 1)]?.id ?? null);
    setSelectedSlotIndex(0);
  }

  function moveSheet(direction: -1 | 1) {
    if (!selectedSheet) return;
    const index = sheets.findIndex((sheet) => sheet.id === selectedSheet.id);
    const target = index + direction;
    if (target < 0 || target >= sheets.length) return;
    const next = [...sheets];
    [next[index], next[target]] = [next[target], next[index]];
    setSheets(next);
  }

  function removeFile(fileId: string) {
    setFiles((current) => current.filter((file) => file.id !== fileId));
    setSheets((current) =>
      current.map((sheet) => ({
        ...sheet,
        slots: sheet.slots.map((slot) =>
          slot.source?.fileId === fileId ? { ...slot, source: null } : slot,
        ),
      })),
    );
    notify('已移除文件，相关版位已清空');
  }

  async function generate(action: 'download' | 'print') {
    if (generateLockRef.current) {
      notify('正在生成打印文件，请稍候');
      return;
    }
    if (!sheets.length || !files.length) {
      notify('请先导入报销材料并安排打印页');
      return;
    }
    generateLockRef.current = true;
    const printWindow = action === 'print' ? window.open('', '_blank') : null;
    if (printWindow) printWindow.document.write('<title>正在生成打印文件…</title><p style="font-family:sans-serif;padding:24px">正在生成打印文件…</p>');
    setBusy(action === 'print' ? '正在生成打印文件…' : '正在导出 PDF…');
    try {
      const bytes = await buildPrintPdf(files, sheets);
      const blobBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([blobBytes], { type: 'application/pdf' });
      if (action === 'download') {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `报销打印文件_${new Date().toISOString().slice(0, 10)}.pdf`;
        anchor.style.display = 'none';
        // Safari、内置浏览器和部分受限窗口不会执行脱离 DOM 的下载链接。
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        const url = await createPrintUrl(blob);
        if (printWindow) {
          printWindow.location.replace(url);
        } else {
          window.open(url, '_blank');
        }
      }
      notify(
        action === 'print'
          ? '打印文件已打开；内置浏览器无法打印时，请导出 PDF 后使用 Chrome 或系统 PDF 查看器打印'
          : 'PDF 已导出',
      );
    } catch (error) {
      printWindow?.close();
      notify(error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      generateLockRef.current = false;
      setBusy(null);
    }
  }

  async function loadDemo() {
    setBusy('正在创建演示文件…');
    try {
      const demos = await createDemoFiles();
      const inspected: UploadedPdf[] = [];
      for (const file of demos) inspected.push(await inspectPdf(file));
      const nextSheets = autoLayout(inspected);
      setFiles(inspected);
      setSheets(nextSheets);
      setSelectedSheetId(nextSheets[0]?.id ?? null);
      setSelectedSlotIndex(0);
      notify('演示已载入：A4/A5 版面已自动安排，导出时统一使用 A4 纸');
    } catch (error) {
      notify(error instanceof Error ? error.message : '演示文件创建失败');
    } finally {
      setBusy(null);
    }
  }

  function resetAutoLayout() {
    const next = autoLayout(files);
    setSheets(next);
    setSelectedSheetId(next[0]?.id ?? null);
    setSelectedSlotIndex(0);
    notify('已按打印尺寸重新智能排版');
  }

  function requestClearAllContent() {
    if (!files.length && !sheets.length) return;
    setClearConfirmationOpen(true);
  }

  async function clearAllContent() {
    setClearConfirmationOpen(false);
    setBusy('正在清空所有内容…');
    try {
      await Promise.all([clearWorkspace(), clearGeneratedPrintFiles()]);
      setFiles([]);
      setSheets([]);
      setSelectedSheetId(null);
      setSelectedSlotIndex(0);
      if (inputRef.current) inputRef.current.value = '';
      notify('已清掉所有内容');
    } catch (error) {
      notify(error instanceof Error ? error.message : '清空失败，请重试');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Printer size={22} strokeWidth={2.2} /></div>
          <div>
            <h1>报销打印台</h1>
            <p>A4 / A5 报销材料拼版与混合打印工具</p>
          </div>
        </div>
        <div className="top-actions">
          <button
            className="button ghost clear-all"
            type="button"
            onClick={requestClearAllContent}
            disabled={!!busy || (!files.length && !sheets.length)}
          >
            <Trash2 size={17} /> 清空全部
          </button>
          <button className="button ghost" type="button" onClick={() => void generate('download')} disabled={!!busy}>
            <Download size={17} /> 导出 PDF
          </button>
          <button className="button primary" type="button" onClick={() => void generate('print')} disabled={!!busy}>
            <Printer size={17} /> 生成并打印
          </button>
        </div>
      </header>

      <main className="workspace">
        <aside className="left-panel panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">01 · 原始材料</span>
              <h2>报销文件</h2>
            </div>
            <button className="icon-button" type="button" onClick={() => inputRef.current?.click()} aria-label="添加报销材料">
              <FilePlus2 size={18} />
            </button>
          </div>

          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,.jfif,image/png,.png,image/webp,.webp,image/bmp,.bmp"
            multiple
            onChange={(event) => void addFiles(Array.from(event.target.files ?? []))}
          />

          <button
            type="button"
            className={`drop-zone ${dragActive ? 'active' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              void addFiles(Array.from(event.dataTransfer.files));
            }}
          >
            <span className="upload-icon"><Upload size={20} /></span>
            <strong>拖入或选择 PDF / 图片</strong>
            <small>支持 JPG、PNG、WEBP、BMP，可多选</small>
          </button>

          {files.length === 0 ? (
            <div className="empty-files">
              <div className="empty-illustration"><FileText size={28} /></div>
              <p>还没有报销材料</p>
              <span>可先载入与需求一致的示例查看效果</span>
              <button className="button demo" type="button" onClick={() => void loadDemo()} disabled={!!busy}>
                <Sparkles size={16} /> 加载演示文件
              </button>
            </div>
          ) : (
            <div className="file-list">
              {files.map((file) => {
                const first = file.pages[0];
                return (
                  <article
                    className={`file-card ${draggingFileId === file.id ? 'dragging' : ''}`}
                    key={file.id}
                    draggable
                    onDragStart={(event) => {
                      if ((event.target as HTMLElement).closest('select, input')) {
                        event.preventDefault();
                        return;
                      }
                      event.dataTransfer.effectAllowed = 'copy';
                      writeDragPayload(event, { kind: 'file-page', source: { fileId: file.id, pageIndex: 0 } });
                      setDraggingFileId(file.id);
                    }}
                    onDragEnd={() => setDraggingFileId(null)}
                    title="拖到中间打印预览的目标版位"
                  >
                    <div className="file-thumb"><img src={first.preview} alt={`${file.name} 第一页预览`} draggable={false} /></div>
                    <div className="file-info">
                      <div className="file-title-row"><GripVertical size={14} aria-hidden="true" /><strong title={file.name}>{formatFileName(file.name)}</strong></div>
                      <div className="file-meta">
                        <span>{file.pages.length} 页</span>
                        <span
                          className={`paper-badge ${file.sourceType === 'image' ? 'custom' : detectedPaper(first.width, first.height).toLowerCase()}`}
                          title={file.sourceType === 'image'
                            ? '图片没有可靠的纸张物理尺寸，导入后可选择 A4 / A5、横向 / 纵向和排版方式'
                            : `根据 PDF 可见页面尺寸判断：${pageSizeMmLabel(first.width, first.height)}`}
                        >
                          {file.sourceType === 'image'
                            ? `图片 ${importFileTypeLabel(file.name)}`
                            : `PDF 页面 ${detectedPaper(first.width, first.height)}`}
                        </span>
                      </div>
                    </div>
                    <button className="remove-file" type="button" onClick={() => removeFile(file.id)} aria-label={`移除 ${file.name}`}>
                      <X size={15} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          {files.length > 0 && (
            <button className="button auto-layout" type="button" onClick={resetAutoLayout}>
              <RefreshCw size={16} /> 按尺寸智能排版
            </button>
          )}
        </aside>

        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div>
              <span className="eyebrow">02 · 拼版预览</span>
              <h2>{selectedSheet ? `第 ${selectedIndex + 1} 张 · ${selectedSheet.paper} ${selectedSheet.orientation === 'portrait' ? '纵向' : '横向'} · ${pageLabels[selectedSheet.layout]}` : '打印预览'}</h2>
            </div>
            <div className="toolbar-actions">
              <button className="icon-button" type="button" onClick={() => moveSheet(-1)} disabled={!selectedSheet || selectedIndex === 0} aria-label="打印页前移"><ChevronUp size={18} /></button>
              <button className="icon-button" type="button" onClick={() => moveSheet(1)} disabled={!selectedSheet || selectedIndex === sheets.length - 1} aria-label="打印页后移"><ChevronDown size={18} /></button>
              <button className="icon-button" type="button" onClick={duplicateSheet} disabled={!selectedSheet} aria-label="复制打印页"><Copy size={17} /></button>
              <button className="icon-button danger" type="button" onClick={removeSheet} disabled={!selectedSheet} aria-label="删除打印页"><Trash2 size={17} /></button>
            </div>
          </div>

          <div className="canvas-scroll">
            {selectedSheet ? (
              <SheetPreview
                sheet={selectedSheet}
                files={files}
                selectedSlotIndex={selectedSlotIndex}
                onSelectSlot={setSelectedSlotIndex}
                onDropItem={dropOnSlot}
              />
            ) : (
              <div className="blank-canvas">
                <div className="blank-icon"><LayoutTemplate size={32} /></div>
                <h3>从导入报销材料开始</h3>
                <p>编辑时使用真正的 A4/A5 版面，横向或纵向只改变纸张方向，不旋转原稿内容；导出时统一放到 A4 页面。</p>
                <div className="blank-actions">
                  <button className="button primary" type="button" onClick={() => inputRef.current?.click()}><Upload size={17} /> 导入材料</button>
                  <button className="button ghost" type="button" onClick={addSheet}><Plus size={17} /> 添加空白页</button>
                </div>
              </div>
            )}
          </div>

          <div className="sheet-strip" aria-label="打印页列表">
            {sheets.map((sheet, index) => (
              <button
                type="button"
                className={`sheet-tab ${sheet.id === selectedSheet?.id ? 'selected' : ''}`}
                key={sheet.id}
                onClick={() => { setSelectedSheetId(sheet.id); setSelectedSlotIndex(0); }}
              >
                <span>{index + 1}</span>
                <strong>{sheet.paper}{sheet.orientation === 'portrait' ? '竖版' : '横版'}</strong>
                <small>{pageLabels[sheet.layout]}</small>
              </button>
            ))}
            <button className="add-sheet-tab" type="button" onClick={addSheet}><Plus size={18} /><span>添加打印页</span></button>
          </div>
        </section>

        <aside className="right-panel panel">
          <div className="panel-heading settings-heading">
            <div>
              <span className="eyebrow">03 · 打印设置</span>
              <h2>版面参数</h2>
            </div>
            <MoreHorizontal size={20} color="#8792a2" />
          </div>

          {!selectedSheet ? (
            <div className="settings-empty">添加或选择一张打印页后，可在这里调整打印尺寸和版位。</div>
          ) : (
            <div className="settings-content">
              <fieldset className="setting-group">
                <legend>纸张</legend>
                <div className="segmented two">
                  {(['A4', 'A5'] as PaperSize[]).map((paper) => (
                    <button type="button" className={selectedSheet.paper === paper ? 'active' : ''} key={paper} onClick={() => updatePaper(paper)}>{paper}</button>
                  ))}
                </div>
                <label className="field-label">方向</label>
                <div className="segmented two">
                  {([['portrait', '纵向'], ['landscape', '横向']] as Array<[Orientation, string]>).map(([value, label]) => (
                    <button type="button" className={selectedSheet.orientation === value ? 'active' : ''} key={value} onClick={() => updateSelectedSheet({ orientation: value })}>{label}</button>
                  ))}
                </div>
                <div className="position-hint">纸张和方向只改变编辑版面；原稿文字不会旋转。A5 导出时按对应方向放到 A4 左上角（左齐、顶齐）。</div>
              </fieldset>

              <fieldset className="setting-group">
                <legend>版式</legend>
                <div className="layout-options">
                  <button type="button" className={selectedSheet.layout === 'full' ? 'active' : ''} onClick={() => updateLayout('full')}>
                    <span className="layout-icon full"><i /></span><small>整页</small>
                  </button>
                  <button type="button" className={selectedSheet.layout === 'vertical' ? 'active' : ''} onClick={() => updateLayout('vertical')}>
                    <span className="layout-icon vertical"><i /><i /></span><small>上下</small>
                  </button>
                  <button type="button" className={selectedSheet.layout === 'horizontal' ? 'active' : ''} onClick={() => updateLayout('horizontal')}>
                    <span className="layout-icon horizontal"><i /><i /></span><small>左右</small>
                  </button>
                </div>
                {selectedSheet.layout !== 'full' && (
                  <RangeField label="分割位置" value={selectedSheet.split} min={30} max={70} suffix="%" onChange={(split) => updateSelectedSheet({ split })} />
                )}
                <div className="inline-fields">
                  <NumberField label="页边距" value={selectedSheet.margin} min={0} max={30} suffix="mm" onChange={(margin) => updateSelectedSheet({ margin })} />
                  <NumberField label="中间留白" value={selectedSheet.gap} min={0} max={30} suffix="mm" disabled={selectedSheet.layout === 'full'} onChange={(gap) => updateSelectedSheet({ gap })} />
                </div>
              </fieldset>

              <fieldset className="setting-group">
                <legend>版位内容</legend>
                <div className="slot-tabs">
                  {selectedSheet.slots.map((_, index) => (
                    <button type="button" key={index} className={selectedSlotIndex === index ? 'active' : ''} onClick={() => setSelectedSlotIndex(index)}>
                      {selectedSheet.layout === 'vertical' ? (index === 0 ? '上半区' : '下半区') : selectedSheet.layout === 'horizontal' ? (index === 0 ? '左半区' : '右半区') : '整页'}
                    </button>
                  ))}
                </div>
                {selectedSlot && (
                  <>
                    <label className="field-label" htmlFor="source-select">选择文件 / 页码</label>
                    <select id="source-select" className="select-control" value={sourceKey(selectedSlot.source)} onChange={(event) => updateSlot({ source: parseSourceKey(event.target.value) })}>
                      <option value="">空白</option>
                      {allPages.map(({ file, pageIndex, key }) => (
                        <option key={key} value={key}>{formatFileName(file.name)} · 第 {pageIndex + 1} 页</option>
                      ))}
                    </select>

                    <label className="field-label">原稿空白处理</label>
                    <div className="segmented two">
                      {([['auto', '自动去下方空白'], ['full', '保留整页']] as Array<[CropMode, string]>).map(([value, label]) => (
                        <button type="button" className={(selectedSlot.crop ?? 'auto') === value ? 'active' : ''} key={value} onClick={() => updateSlot({ crop: value })}>{label}</button>
                      ))}
                    </div>
                    {(selectedSlot.crop ?? 'auto') === 'auto' && selectedSourcePage && (
                      <div className={`crop-status ${detectedBlankPercent > 0 ? 'detected' : ''}`}>
                        {detectedBlankPercent > 0 ? `已自动去除下方约 ${detectedBlankPercent}% 空白` : '未检测到大面积下方空白，将保留完整原稿'}
                      </div>
                    )}
                    <label className="field-label">填充方式</label>
                    <div className="segmented two">
                      {([['contain', '完整显示'], ['stretch', '铺满区域']] as Array<[FitMode, string]>).map(([value, label]) => (
                        <button type="button" className={selectedSlot.fit === value ? 'active' : ''} key={value} onClick={() => updateSlot({ fit: value })}>{label}</button>
                      ))}
                    </div>
                    <RangeField label="内容缩放" value={selectedSlot.scale} min={50} max={130} suffix="%" onChange={(scale) => updateSlot({ scale })} />
                    {horizontalAlignmentOffsets && (
                      <>
                        <label className="field-label">水平位置</label>
                        <div className="segmented three">
                          {([['left', '靠左'], ['center', '居中'], ['right', '靠右']] as const).map(([alignment, label]) => {
                            const offset = horizontalAlignmentOffsets[alignment];
                            return (
                              <button
                                type="button"
                                key={alignment}
                                className={Math.abs(selectedSlot.offsetX - offset) < 0.15 ? 'active' : ''}
                                onClick={() => updateSlot({ offsetX: Number(offset.toFixed(1)) })}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="position-hint">控制原稿内容在当前版位内靠左、居中或靠右，02 拼版预览会立即显示变化。</div>
                      </>
                    )}
                    <div className="inline-fields">
                      <NumberField label="水平偏移" value={selectedSlot.offsetX} min={-150} max={150} suffix="mm" onChange={(offsetX) => updateSlot({ offsetX })} />
                      <NumberField label="垂直偏移" value={selectedSlot.offsetY} min={-150} max={150} suffix="mm" onChange={(offsetY) => updateSlot({ offsetY })} />
                    </div>
                    <button className="reset-slot" type="button" onClick={() => updateSlot({ fit: 'contain', crop: 'auto', scale: 100, offsetX: 0, offsetY: 0 })}>
                      <RefreshCw size={14} /> 恢复版位默认值
                    </button>
                  </>
                )}
              </fieldset>

              <div className="print-note">
                <CheckCircle2 size={18} />
                <div>
                  <strong>打印建议</strong>
                  <span>{selectedSheet.paper === 'A5'
                    ? selectedSheet.orientation === 'portrait'
                      ? '最终输出为 A4 纵向页，A5 竖版保持原尺寸放在左上角（左齐、顶齐）；原稿不旋转。打印时请选择 A4 和“实际大小 / 100%”。'
                      : '最终输出为 A4 横向页，A5 横版保持原尺寸放在左上角（左齐、顶齐）；原稿不旋转。打印时请选择 A4 和“实际大小 / 100%”。'
                    : `最终输出为标准 A4 ${selectedSheet.orientation === 'portrait' ? '纵向' : '横向'}页。打印时请选择 A4 和“实际大小 / 100%”，不要再次缩放。`}</span>
                </div>
              </div>
            </div>
          )}
        </aside>
      </main>

      {clearConfirmationOpen && (
        <div className="confirm-backdrop" role="presentation" onMouseDown={() => setClearConfirmationOpen(false)}>
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-confirm-title"
            aria-describedby="clear-confirm-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="confirm-icon"><Trash2 size={22} /></div>
            <div className="confirm-copy">
              <h2 id="clear-confirm-title">清空所有内容？</h2>
              <p id="clear-confirm-description">所有报销材料和拼版设置都会被删除，此操作不能撤销。</p>
            </div>
            <div className="confirm-actions">
              <button className="button ghost" type="button" onClick={() => setClearConfirmationOpen(false)}>取消</button>
              <button className="button confirm-danger" type="button" onClick={() => void clearAllContent()}>确认清空</button>
            </div>
          </section>
        </div>
      )}

      {busy && <div className="busy-overlay" role="status"><LoaderCircle className="spinner" size={22} /><span>{busy}</span></div>}
      {toast && <div className="toast" role="status"><CheckCircle2 size={18} />{toast}</div>}
    </div>
  );
}

function SheetPreview({
  sheet,
  files,
  selectedSlotIndex,
  onSelectSlot,
  onDropItem,
}: {
  sheet: SheetConfig;
  files: UploadedPdf[];
  selectedSlotIndex: number;
  onSelectSlot: (index: number) => void;
  onDropItem: (sheetId: string, slotIndex: number, payload: FinPrintDragPayload) => void;
}) {
  const [pageWidth, pageHeight] = paperDimensionsPt(sheet.paper, sheet.orientation);
  const slots = calculateSlots(sheet.paper, sheet.orientation, sheet.layout, sheet.margin, sheet.gap, sheet.split);
  const aspectRatio = `${pageWidth} / ${pageHeight}`;
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [draggingSlotIndex, setDraggingSlotIndex] = useState<number | null>(null);

  return (
    <div className="paper-stage">
      <div className="paper" style={{ aspectRatio }}>
        <div className="paper-size-label">{sheet.paper} · {sheet.orientation === 'portrait' ? '纵向' : '横向'}</div>
        {slots.map((rect, index) => {
          const slot = sheet.slots[index];
          const file = slot?.source ? files.find((item) => item.id === slot.source?.fileId) : null;
          const page = file && slot?.source ? file.pages[slot.source.pageIndex] : null;
          const style = {
            left: `${(rect.x / pageWidth) * 100}%`,
            top: `${((pageHeight - rect.y - rect.height) / pageHeight) * 100}%`,
            width: `${(rect.width / pageWidth) * 100}%`,
            height: `${(rect.height / pageHeight) * 100}%`,
          };
          return (
            <button
              type="button"
              className={`preview-slot ${selectedSlotIndex === index ? 'selected' : ''} ${page ? 'filled' : ''} ${dropTargetIndex === index ? 'drop-target' : ''} ${draggingSlotIndex === index ? 'dragging' : ''}`}
              style={style}
              key={slot?.id ?? index}
              onClick={() => onSelectSlot(index)}
              draggable={Boolean(page && sheet.slots.length > 1)}
              onDragStart={(event) => {
                if (!page || sheet.slots.length < 2) {
                  event.preventDefault();
                  return;
                }
                event.dataTransfer.effectAllowed = 'move';
                writeDragPayload(event, { kind: 'slot', sheetId: sheet.id, slotIndex: index });
                setDraggingSlotIndex(index);
              }}
              onDragEnd={() => { setDraggingSlotIndex(null); setDropTargetIndex(null); }}
              onDragEnter={(event) => { event.preventDefault(); setDropTargetIndex(index); }}
              onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = draggingSlotIndex === null ? 'copy' : 'move'; }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTargetIndex(null);
              }}
              onDrop={(event) => {
                event.preventDefault();
                const payload = readDragPayload(event);
                setDropTargetIndex(null);
                setDraggingSlotIndex(null);
                if (payload) onDropItem(sheet.id, index, payload);
              }}
              aria-label={`选择${index + 1}号版位${page && sheet.slots.length > 1 ? '，可拖动互换位置' : '，可接收拖入材料'}`}
            >
              {page && slot ? (() => {
                const trimBottom = (slot.crop ?? 'auto') === 'auto' && (page.contentHeight ?? 1) < 0.999;
                const sourceHeight = page.height * (trimBottom ? (page.contentHeight ?? 1) : 1);
                const placement = fitIntoRect(page.width, sourceHeight, rect, slot.fit, slot.scale, slot.offsetX, slot.offsetY);
                const visualLeft = ((placement.x - rect.x) / rect.width) * 100;
                const visualTop = ((rect.y + rect.height - placement.y - placement.height) / rect.height) * 100;
                const visualWidth = (placement.width / rect.width) * 100;
                const visualHeight = (placement.height / rect.height) * 100;
                return (
                  <img
                    src={trimBottom ? (page.trimmedPreview ?? page.preview) : page.preview}
                    alt={`${file?.name} 第 ${(slot.source?.pageIndex ?? 0) + 1} 页`}
                    style={{
                      left: `${visualLeft}%`,
                      top: `${visualTop}%`,
                      width: `${visualWidth}%`,
                      height: `${visualHeight}%`,
                    }}
                  />
                );
              })() : (
                <span className="empty-slot"><Plus size={18} /> 点击选择文件</span>
              )}
              {dropTargetIndex === index && (
                <span className="drop-hint">松开鼠标放到这里</span>
              )}
              <span className="slot-name">
                {page && sheet.slots.length > 1 && <GripVertical size={11} aria-hidden="true" />}
                {sheet.layout === 'vertical' ? (index === 0 ? '上半区' : '下半区') : sheet.layout === 'horizontal' ? (index === 0 ? '左半区' : '右半区') : '整页'}
              </span>
            </button>
          );
        })}
        {sheet.layout === 'vertical' && <div className="cut-line horizontal-cut"><span><AlignHorizontalDistributeCenter size={13} /> 裁切 / 折叠线</span></div>}
        {sheet.layout === 'horizontal' && <div className="cut-line vertical-cut"><span><AlignVerticalDistributeCenter size={13} /> 裁切线</span></div>}
      </div>
      <div className="paper-caption">可从左侧拖入材料；上下版位之间也可直接拖拽互换</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  suffix,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={`number-field ${disabled ? 'disabled' : ''}`}>
      <span>{label}</span>
      <div><input type="number" value={value} min={min} max={max} disabled={disabled} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value))))} /><em>{suffix}</em></div>
    </label>
  );
}

function RangeField({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <label className="range-field">
      <span><b>{label}</b><em>{value}{suffix}</em></span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export default App;
