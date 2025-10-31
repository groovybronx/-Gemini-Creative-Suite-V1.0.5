import type { Conversation, ChatMessage } from '../types';

const DB_NAME = 'GeminiCreativeSuiteDB';
const DB_VERSION = 1;
const CONVERSATIONS_STORE = 'conversations';

class DBService {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject('Error opening DB');
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const store = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      };
    });
  }

  async addOrUpdateConversation(conversation: Conversation): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction(CONVERSATIONS_STORE, 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    store.put(conversation);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const db = await this.getDB();
    const transaction = db.transaction(CONVERSATIONS_STORE, 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.get(id);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllConversations(): Promise<Conversation[]> {
    const db = await this.getDB();
    const transaction = db.transaction(CONVERSATIONS_STORE, 'readonly');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async deleteConversation(id: string): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction(CONVERSATIONS_STORE, 'readwrite');
    const store = transaction.objectStore(CONVERSATIONS_STORE);
    store.delete(id);
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const dbService = new DBService();