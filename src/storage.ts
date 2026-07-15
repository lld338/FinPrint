import type { SheetConfig, UploadedPdf } from './types';

const DATABASE_NAME = 'finprint-workspace';
const DATABASE_VERSION = 1;
const STORE_NAME = 'workspace';
const STATE_KEY = 'current';

export interface PersistedWorkspace {
  version: 1;
  layoutDefaultsVersion?: 2 | 3;
  files: UploadedPdf[];
  sheets: SheetConfig[];
  selectedSheetId: string | null;
  selectedSlotIndex: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开本地存储'));
  });
}

export async function loadWorkspace(): Promise<PersistedWorkspace | null> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve((request.result as PersistedWorkspace | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('无法读取本地内容'));
    });
  } finally {
    database.close();
  }
}

export async function saveWorkspace(workspace: PersistedWorkspace): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(workspace, STATE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('无法保存本地内容'));
      transaction.onabort = () => reject(transaction.error ?? new Error('保存本地内容已中止'));
    });
  } finally {
    database.close();
  }
}

export async function clearWorkspace(): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(STATE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('无法清除本地内容'));
      transaction.onabort = () => reject(transaction.error ?? new Error('清除本地内容已中止'));
    });
  } finally {
    database.close();
  }
}
