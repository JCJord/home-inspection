import { Injectable, inject, signal } from '@angular/core';
import { InspectionsService } from './inspections.service';
import { BehaviorSubject, from, of, Subject, race, timer } from 'rxjs';
import { concatMap, mergeMap, catchError, finalize, tap, delay, map } from 'rxjs/operators';

export enum MutationType {
  CREATE_FINDING = 'CREATE_FINDING',
  UPDATE_FINDING = 'UPDATE_FINDING',
  UPLOAD_PHOTO = 'UPLOAD_PHOTO',
  UPDATE_PHOTO = 'UPDATE_PHOTO',
  DELETE_PHOTO = 'DELETE_PHOTO',
  UPDATE_INSPECTION = 'UPDATE_INSPECTION'
}

export interface MutationTask {
  id: string;
  type: MutationType;
  inspectionId: string;
  findingId?: string; // Optional for CREATE_FINDING
  clientFindingId?: string; // Used to link photos to a finding before it's created on server
  payload: any;
  file?: File; // For photo uploads
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'COMPLETED';
  retries: number;
  lastError?: string;
  createdAt: number;
}

export interface TaskCompletion {
  type: MutationType;
  result: any;
  clientFindingId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MutationQueueService {
  private inspectionsService = inject(InspectionsService);
  private readonly DB_NAME = 'MutationQueueDB';
  private readonly STORE_NAME = 'tasks';
  private db!: IDBDatabase;
  
  private tasks = signal<MutationTask[]>([]);
  public allTasks = this.tasks.asReadonly();
  private isProcessing = false;
  private dbReady: Promise<void>;
  
  // Broadcast completions for ID swapping
  taskCompleted$ = new Subject<TaskCompletion>();
  
  // Signals for UI
  activeTasksCount = signal(0);
  failedTasksCount = signal(0);
  isOnline = signal(navigator.onLine);

  constructor() {
    this.dbReady = this.initDB();
    this.dbReady.then(async () => {
      await this.loadTasks();
      // Auto-start queue processing on launch if online
      if (this.isOnline()) {
        this.processQueue();
      }
    });

    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.processQueue();
    });
    window.addEventListener('offline', () => this.isOnline.set(false));
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async loadTasks() {
    const allTasks = await this.getAllTasksFromDB();
    
    // Regenerate blob URLs for files if they exist (for UI display after refresh)
    const tasksWithUrls = allTasks.map(task => {
      const t = { ...task } as any;
      if (t.file && t.type === MutationType.UPLOAD_PHOTO) {
        // Recovery logic: Favor stored previewData (Base64) if available, 
        // otherwise recreate the blob URL from the stored File object.
        t.tempPreviewUrl = t.payload.previewData || URL.createObjectURL(t.file);
      }
      return t;
    });

    this.tasks.set(tasksWithUrls);
    this.updateCounts();
    this.processQueue();
  }

  /**
   * Helper to convert File/Blob to Base64 for persistent storage
   */
  fileToBase64(file: File | Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  private updateCounts() {
    const currentTasks = this.tasks();
    this.activeTasksCount.set(currentTasks.filter(t => t.status === 'PENDING' || t.status === 'SYNCING').length);
    this.failedTasksCount.set(currentTasks.filter(t => t.status === 'FAILED').length);
  }

  enqueue(task: Omit<MutationTask, 'id' | 'status' | 'retries' | 'createdAt'> & { id?: string }) {
    const newTask: MutationTask = {
      ...task,
      id: task.id || crypto.randomUUID(),
      status: 'PENDING',
      retries: 0,
      createdAt: Date.now()
    };

    // Set temporary preview URL for UI display (Base64 favored for persistence)
    if (newTask.file && newTask.type === MutationType.UPLOAD_PHOTO) {
      (newTask as any).tempPreviewUrl = newTask.payload.previewData || URL.createObjectURL(newTask.file);
    }

    // 1. Update signal IMMEDIATELY so mergePendingMutations sees it in the same tick
    if (newTask.type === MutationType.UPDATE_INSPECTION) {
      const existing = this.tasks().find(t => 
        t.status === 'PENDING' && 
        t.type === MutationType.UPDATE_INSPECTION && 
        t.inspectionId === newTask.inspectionId
      );

      if (existing) {
        const mergedPayload = {
          ...existing.payload,
          ...newTask.payload,
          metadata_values: { ...(existing.payload.metadata_values || {}), ...(newTask.payload.metadata_values || {}) },
          section_statuses: { ...(existing.payload.section_statuses || {}), ...(newTask.payload.section_statuses || {}) }
        };
        const updatedTask = { ...existing, payload: mergedPayload };
        this.tasks.update(ts => ts.map(t => t.id === existing.id ? updatedTask : t));
        
        // Save to DB in background
        this.dbReady.then(() => this.saveTaskToDB(updatedTask).then(() => this.processQueue()));
        return;
      }
    }

    this.tasks.update(t => [...t, newTask]);
    this.updateCounts();

    // 2. Save to DB and process queue in background
    this.dbReady.then(() => {
      this.saveTaskToDB(newTask).then(() => this.processQueue());
    });
  }

  private async processQueue() {
    if (!this.isOnline() || this.activeTasksCount() === 0) return;
    
    // Safety check: if we're "processing" but no tasks are actually in SYNCING state, reset.
    const syncingCount = this.tasks().filter(t => t.status === 'SYNCING').length;
    if (this.isProcessing && syncingCount === 0) {
      this.isProcessing = false;
    }

    if (this.isProcessing) return;
    this.isProcessing = true;

    // Get pending tasks that are ready (not waiting for an ID)
    const pendingTasks = this.tasks().filter(t => 
      t.status === 'PENDING' && 
      (t.type === MutationType.CREATE_FINDING || t.type === MutationType.UPDATE_INSPECTION || !!t.findingId)
    );
    
    // Process with concurrency limit of 2
    from(pendingTasks).pipe(
      mergeMap(task => this.processTask(task), 2),
      finalize(() => {
        this.isProcessing = false;
        // Check if more tasks were added while processing
        if (this.tasks().some(t => t.status === 'PENDING')) {
          this.processQueue();
        }
      })
    ).subscribe();
  }

  private processTask(task: MutationTask) {
    // Mark as syncing
    this.updateTaskStatus(task.id, 'SYNCING');

    return of(null).pipe(
      delay(task.retries > 0 ? Math.pow(2, task.retries) * 1000 : 0), // Exponential backoff
      concatMap(() => race(
        this.executeMutation(task),
        timer(60000).pipe(
          map(() => { throw new Error('Timeout'); })
        )
      )),
      tap((result) => {
        this.updateTaskStatus(task.id, 'COMPLETED', undefined, result);
      }),
      catchError(err => {
        this.handleTaskError(task, err);
        return of(null);
      })
    );
  }

  private executeMutation(task: MutationTask) {
    switch (task.type) {
      case MutationType.CREATE_FINDING:
        return this.inspectionsService.createFinding(task.inspectionId, task.payload).pipe(
          tap(finding => {
            if (task.clientFindingId) {
              this.mapClientFindingIdToServerId(task.clientFindingId, finding.id);
            }
            this.taskCompleted$.next({ type: task.type, result: finding, clientFindingId: task.clientFindingId });
          })
        );
      case MutationType.UPDATE_FINDING:
        return this.inspectionsService.updateFinding(task.inspectionId, task.findingId!, task.payload).pipe(
          tap(finding => {
            this.taskCompleted$.next({ type: task.type, result: finding });
          })
        );
      case MutationType.UPLOAD_PHOTO:
        return this.inspectionsService.uploadPhoto(task.inspectionId, task.findingId!, task.file!, task.payload.caption);
      case MutationType.UPDATE_PHOTO: {
        const { photoId, ...dto } = task.payload;
        return this.inspectionsService.updatePhoto(task.inspectionId, task.findingId!, photoId, dto);
      }
      case MutationType.DELETE_PHOTO:
        return this.inspectionsService.deletePhoto(task.inspectionId, task.findingId!, task.payload.photoId);
      case MutationType.UPDATE_INSPECTION:
        return this.inspectionsService.updateInspection(task.inspectionId, task.payload);
      default:
        return of(null);
    }
  }

  private async mapClientFindingIdToServerId(clientId: string, serverId: string) {
    const affectedTasks = this.tasks().filter(t => t.clientFindingId === clientId || t.findingId === clientId);
    for (const task of affectedTasks) {
      const updatedTask = { ...task, findingId: serverId, clientFindingId: undefined };
      await this.saveTaskToDB(updatedTask);
      this.tasks.update(ts => ts.map(t => t.id === task.id ? updatedTask : t));
    }
    // Re-trigger queue now that dependencies (finding IDs) are resolved
    this.processQueue();
  }

  private async updateTaskStatus(id: string, status: MutationTask['status'], error?: string, result?: any) {
    const task = this.tasks().find(t => t.id === id);
    if (!task) return;

    const updatedTask = { 
      ...task, 
      status, 
      lastError: error || task.lastError,
      result: result || (task as any).result 
    };
    
    // Always update signals immediately
    this.tasks.update(ts => ts.map(t => t.id === id ? updatedTask : t));
    this.updateCounts();

    // Persist status change to DB
    await this.saveTaskToDB(updatedTask);

    if (status === 'COMPLETED') {
      // BUFFER PERIOD: Keep the task in the signal for 30 seconds after completion
      // This ensures mergePendingMutations continues to apply the change while SWR refreshes.
      // Smart Deduplication will hide the duplicate once the server actually confirms it.
      setTimeout(() => {
        this.tasks.update(ts => ts.filter(t => t.id !== id));
        this.updateCounts();
        // Remove from DB too
        this.deleteTaskFromDB(id);
      }, 30000);
    }
  }

  async updateTaskPayload(id: string, payload: any) {
    const task = this.tasks().find(t => t.id === id);
    if (!task) return;

    const updatedTask = { ...task, payload: { ...task.payload, ...payload } };
    
    // Update signal
    this.tasks.update(ts => ts.map(t => t.id === id ? updatedTask : t));
    
    // Update DB
    await this.saveTaskToDB(updatedTask);
  }

  async cancelTask(id: string) {
    // 1. Remove from signal immediately
    this.tasks.update(ts => ts.filter(t => t.id !== id));
    this.updateCounts();
    
    // 2. Remove from DB
    await this.deleteTaskFromDB(id);
  }

  async clearAllTasks() {
    const allIds = this.tasks().map(t => t.id);

    // 1. Remove from signal
    this.tasks.set([]);
    this.updateCounts();

    // 2. Remove from DB
    for (const id of allIds) {
      await this.deleteTaskFromDB(id);
    }
  }



  private async handleTaskError(task: MutationTask, error: any) {
    const maxRetries = 5;
    const isNetworkError = !navigator.onLine || error.status === 0 || error.status >= 500;
    
    if (isNetworkError && task.retries < maxRetries) {
      // Retryable
      const updatedTask: MutationTask = { 
        ...task, 
        status: 'PENDING', 
        retries: task.retries + 1,
        lastError: error.message || 'Network Error'
      };
      await this.saveTaskToDB(updatedTask);
      this.tasks.update(ts => ts.map(t => t.id === task.id ? updatedTask : t));
    } else {
      // Dead Letter
      this.updateTaskStatus(task.id, 'FAILED', error.message || 'Permanent Failure');
    }
    this.updateCounts();
  }

  // DB Helpers
  private async getAllTasksFromDB(): Promise<MutationTask[]> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveTaskToDB(task: MutationTask): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(task);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteTaskFromDB(id: string): Promise<void> {
    await this.dbReady;
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async retryFailedTasks() {
    const failedTasks = this.tasks().filter(t => t.status === 'FAILED');
    for (const task of failedTasks) {
      await this.updateTaskStatus(task.id, 'PENDING');
    }
    this.processQueue();
  }
}
