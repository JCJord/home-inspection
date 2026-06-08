import { Injectable } from '@angular/core';
import { Inspection, Finding } from '../models/inspection.interface';

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  private readonly DB_NAME = 'InspectionCacheDB';
  private readonly STORE_NAME = 'inspections';
  private readonly PHOTO_STORE = 'photos';
  private db!: IDBDatabase;
  private dbReady: Promise<void>;

  constructor() {
    this.dbReady = this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 3); // Bumped version for new store

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(this.PHOTO_STORE)) {
          db.createObjectStore(this.PHOTO_STORE); // Key will be the URL
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event: any) => {
        console.error('PersistenceService DB Error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async saveInspection(inspection: Inspection): Promise<void> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(inspection);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getInspection(id: string): Promise<Inspection | null> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteInspection(id: string): Promise<void> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateCachedFinding(inspectionId: string, finding: Finding): Promise<void> {
    await this.dbReady;
    const inspection = await this.getInspection(inspectionId);
    if (!inspection) return;

    const findings = inspection.findings || [];
    const index = findings.findIndex(f => f.id === finding.id);
    
    if (index > -1) {
      findings[index] = finding;
    } else {
      findings.push(finding);
    }

    inspection.findings = findings;
    await this.saveInspection(inspection);
  }

  // --- Photo Storage ---
  async savePhoto(url: string, blob: Blob): Promise<void> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.PHOTO_STORE, 'readwrite');
      const store = transaction.objectStore(this.PHOTO_STORE);
      const request = store.put(blob, url);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPhoto(url: string): Promise<Blob | null> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.PHOTO_STORE, 'readonly');
      const store = transaction.objectStore(this.PHOTO_STORE);
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePhoto(url: string): Promise<void> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.PHOTO_STORE, 'readwrite');
      const store = transaction.objectStore(this.PHOTO_STORE);
      const request = store.delete(url);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
