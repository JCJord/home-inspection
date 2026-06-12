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
  DELETE_FINDING = 'DELETE_FINDING',
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
  pendingDelete?: boolean;
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
    
    const validTasks: MutationTask[] = [];

    // Cleanup logic: If tasks were stuck in COMPLETED state due to a page reload
    // during their 30-second buffer, remove them from DB to prevent memory leak.
    for (const task of allTasks) {
      if (task.status === 'COMPLETED') {
        // Safe to remove immediately on load since SWR will fetch fresh data anyway
        await this.deleteTaskFromDB(task.id);
        continue;
      }
      validTasks.push(task);
    }

    // Regenerate blob URLs for files if they exist (for UI display after refresh)
    const tasksWithUrls = validTasks.map(task => {
      const t = { ...task } as any;
      
      // Reset any tasks that were interrupted while SYNCING back to PENDING
      if (t.status === 'SYNCING') {
        t.status = 'PENDING';
      }

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
    // We must block tasks whose findingId is actually a clientFindingId of an uncompleted CREATE_FINDING task
    const pendingClientIds = new Set(
      this.tasks()
        .filter(t => t.type === MutationType.CREATE_FINDING && t.clientFindingId)
        .map(t => t.clientFindingId)
    );

    const pendingTasks = this.tasks().filter(t => {
      if (t.status !== 'PENDING') return false;
      if (t.type === MutationType.CREATE_FINDING || t.type === MutationType.UPDATE_INSPECTION) return true;
      
      if (t.findingId) {
        // If the findingId is waiting to be mapped from a CREATE_FINDING task, hold off
        if (pendingClientIds.has(t.findingId)) return false;
        return true;
      }
      
      return false;
    });
    
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

  private processTask(originalTask: MutationTask) {
    // Re-fetch from signal because a prior task might have mapped its IDs
    // (e.g. CREATE_FINDING mapped clientFindingId -> serverId for this task)
    const task = this.tasks().find(t => t.id === originalTask.id);
    if (!task) return of(null);

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
        return this.inspectionsService.uploadPhoto(task.inspectionId, task.findingId!, task.file!, task.payload.caption).pipe(
          tap(photo => {
            this.taskCompleted$.next({ type: task.type, result: photo, clientFindingId: task.clientFindingId });
          })
        );
      case MutationType.UPDATE_PHOTO: {
        const { photoId, ...dto } = task.payload;
        return this.inspectionsService.updatePhoto(task.inspectionId, task.findingId!, photoId, dto).pipe(
          tap(photo => {
            this.taskCompleted$.next({ type: task.type, result: photo });
          })
        );
      }
      case MutationType.DELETE_PHOTO:
        return this.inspectionsService.deletePhoto(task.inspectionId, task.findingId!, task.payload.photoId).pipe(
          tap(() => {
            this.taskCompleted$.next({ type: task.type, result: null });
          }),
          map(() => null),
          catchError(err => {
            if (err.status === 404) {
              this.taskCompleted$.next({ type: task.type, result: null });
              return of(null);
            }
            throw err;
          })
        );
      case MutationType.DELETE_FINDING:
        return this.inspectionsService.deleteFinding(task.inspectionId, task.findingId!).pipe(
          tap(() => {
            this.taskCompleted$.next({ type: task.type, result: null });
          }),
          map(() => null),
          catchError(err => {
            if (err.status === 404) {
              this.taskCompleted$.next({ type: task.type, result: null });
              return of(null);
            }
            throw err;
          })
        );
      case MutationType.UPDATE_INSPECTION:
        return this.inspectionsService.updateInspection(task.inspectionId, task.payload).pipe(
          tap(inspection => {
            this.taskCompleted$.next({ type: task.type, result: inspection });
          })
        );
      default:
        return of(null);
    }
  }

  private async mapClientFindingIdToServerId(clientId: string, serverId: string) {
    const affectedTaskIds = this.tasks().filter(t => t.clientFindingId === clientId || t.findingId === clientId).map(t => t.id);
    
    // 1. Update signals synchronously to prevent race conditions
    this.tasks.update(ts => ts.map(t => {
      if (affectedTaskIds.includes(t.id)) {
        return { ...t, findingId: serverId, clientFindingId: undefined };
      }
      return t;
    }));

    // 2. Persist to DB in the background
    for (const taskId of affectedTaskIds) {
      const updatedTask = this.tasks().find(t => t.id === taskId);
      if (updatedTask) {
        await this.saveTaskToDB(updatedTask);
      }
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
      // If it's an UPDATE_INSPECTION task, remove it immediately instead of waiting 30 seconds
      if (updatedTask.type === MutationType.UPDATE_INSPECTION) {
        this.tasks.update(ts => ts.filter(t => t.id !== id));
        this.updateCounts();
        await this.deleteTaskFromDB(id);
        return;
      }

      // If marked for deletion while syncing, queue the delete task now that we have the server photo ID
      if (updatedTask.type === MutationType.UPLOAD_PHOTO && updatedTask.pendingDelete) {
        const serverPhotoId = (result || (updatedTask as any).result)?.id;
        if (serverPhotoId) {
          this.enqueue({
            type: MutationType.DELETE_PHOTO,
            inspectionId: updatedTask.inspectionId,
            findingId: updatedTask.findingId || updatedTask.clientFindingId,
            payload: { photoId: serverPhotoId.toString() }
          });
        }
        // Remove task immediately, no need for the 30s buffer
        this.tasks.update(ts => ts.filter(t => t.id !== id));
        this.updateCounts();
        await this.deleteTaskFromDB(id);
        return;
      }

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
    const taskToCancel = this.tasks().find(t => t.id === id);
    if (!taskToCancel) return;

    // Special handling for photo uploads that have already reached the server or are on their way
    if (taskToCancel.type === MutationType.UPLOAD_PHOTO) {
      if (taskToCancel.status === 'COMPLETED' && (taskToCancel as any).result?.id) {
        // Enqueue delete task immediately for the server photo ID
        this.enqueue({
          type: MutationType.DELETE_PHOTO,
          inspectionId: taskToCancel.inspectionId,
          findingId: taskToCancel.findingId || taskToCancel.clientFindingId,
          payload: { photoId: (taskToCancel as any).result.id.toString() }
        });
        
        // Remove the upload task from the signal and database
        this.tasks.update(ts => ts.filter(t => t.id !== id));
        this.updateCounts();
        await this.deleteTaskFromDB(id);
        return;
      } else if (taskToCancel.status === 'SYNCING') {
        // Mark for deletion upon completion so we can fetch its server ID and delete it then
        const updatedTask = { ...taskToCancel, pendingDelete: true };
        this.tasks.update(ts => ts.map(t => t.id === id ? updatedTask : t));
        await this.saveTaskToDB(updatedTask);
        return;
      }
    }

    // Default cancel behavior:
    // 1. Remove from signal immediately
    this.tasks.update(ts => ts.filter(t => t.id !== id));
    this.updateCounts();
    
    // 2. Remove from DB
    await this.deleteTaskFromDB(id);

    // 3. Cascade cancel dependent tasks (e.g. photos waiting on a failed finding)
    if (taskToCancel.type === MutationType.CREATE_FINDING && taskToCancel.clientFindingId) {
      const dependentTasks = this.tasks().filter(t => 
        t.clientFindingId === taskToCancel.clientFindingId || 
        t.findingId === taskToCancel.clientFindingId
      );
      for (const t of dependentTasks) {
        await this.cancelTask(t.id);
      }
    }
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
    const maxRetries = 3;
    const isNetworkError = !navigator.onLine || error.status === 0 || error.status >= 500 || error?.message === 'Timeout';
    
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
