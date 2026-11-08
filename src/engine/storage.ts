import { XoppDocument } from '../types/document';

const STORAGE_KEY = 'xournalpp_web_autosave_v1';
const DB_NAME = 'XournalppWebDB';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB no soportado'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persists current working document into client IndexedDB for crash recovery.
 */
export async function saveDraftToStorage(doc: XoppDocument): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // Serialize doc (exclude big PDF buffer from local draft if necessary or keep it)
      const dataToSave = {
        id: 'current_draft',
        title: doc.title,
        pages: doc.pages,
        timestamp: Date.now(),
      };

      const req = store.put(dataToSave);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback to localStorage if IndexedDB is blocked
    try {
      const simplifiedDoc = {
        title: doc.title,
        pages: doc.pages.map((p) => ({
          ...p,
          background: p.background.type === 'pdf' ? { type: 'lined', color: '#ffffff' } : p.background,
        })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simplifiedDoc));
    } catch {
      // Ignored if storage full
    }
  }
}

/**
 * Checks and loads previous autosaved session.
 */
export async function loadDraftFromStorage(): Promise<{ doc: Partial<XoppDocument>; timestamp: number } | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('current_draft');
      req.onsuccess = () => {
        if (req.result) {
          resolve({
            doc: {
              title: req.result.title,
              pages: req.result.pages,
            },
            timestamp: req.result.timestamp || Date.now(),
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return { doc: JSON.parse(raw), timestamp: Date.now() };
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Clears autosaved draft upon user explicitly creating a new blank document.
 */
export async function clearDraftFromStorage(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('current_draft');
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

