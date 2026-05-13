import { Injectable, inject, signal } from '@angular/core';
import { InspectionsService } from './inspections.service';
import { BehaviorSubject, from, of, Subject } from 'rxjs';
import { concatMap, mergeMap, catchError, finalize, tap, delay } from 'rxjs/operators';

export enum MutationType {
  CREATE_FINDING = 'CREATE_FINDING',
  UPDATE_FINDING = 'UPDATE_FINDING',
  UPLOAD_PHOTO = 'UPLOAD_PHOTO',
  DELETE_PHOTO = 'DELETE_PHOTO'
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
  private isProcessing = false;
  
  // Broadcast completions for ID swapping
  taskCompleted$ = new Subject<TaskCompletion>();
  
  // Signals for UI
  activeTasksCount = signal(0);
  failedTasksCount = signal(0);
  isOnline = signal(navigator.onLine);

  constructor() {
    this.initDB().then(() => {
      this.loadTasks();
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
    this.tasks.set(allTasks);
    this.updateCounts();
    this.processQueue();
  }

  private updateCounts() {
    const currentTasks = this.tasks();
    this.activeTasksCount.set(currentTasks.filter(t => t.status === 'PENDING' || t.status === 'SYNCING').length);
    this.failedTasksCount.set(currentTasks.filter(t => t.status === 'FAILED').length);
  }

  async enqueue(task: Omit<MutationTask, 'id' | 'status' | 'retries' | 'createdAt'>) {
    const newTask: MutationTask = {
      ...task,
      id: crypto.randomUUID(),
      status: 'PENDING',
      retries: 0,
      createdAt: Date.now()
    };

    await this.saveTaskToDB(newTask);
    this.tasks.update(t => [...t, newTask]);
    this.updateCounts();
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || !this.isOnline() || this.activeTasksCount() === 0) return;
    this.isProcessing = true;

    // Get pending tasks that are ready (not waiting for an ID)
    const pendingTasks = this.tasks().filter(t => 
      t.status === 'PENDING' && 
      (t.type === MutationType.CREATE_FINDING || !!t.findingId)
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
      concatMap(() => this.executeMutation(task)),
      tap(() => {
        this.completeTask(task.id);
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
      case MutationType.DELETE_PHOTO:
        return this.inspectionsService.deletePhoto(task.inspectionId, task.findingId!, task.payload.photoId);
      default:
        return of(null);
    }
  }

  private async mapClientFindingIdToServerId(clientId: string, serverId: string) {
    const affectedTasks = this.tasks().filter(t => t.clientFindingId === clientId);
    for (const task of affectedTasks) {
      const updatedTask = { ...task, findingId: serverId, clientFindingId: undefined };
      await this.saveTaskToDB(updatedTask);
      this.tasks.update(ts => ts.map(t => t.id === task.id ? updatedTask : t));
    }
  }

  private async updateTaskStatus(id: string, status: MutationTask['status'], error?: string) {
    const task = this.tasks().find(t => t.id === id);
    if (!task) return;

    const updatedTask = { ...task, status, lastError: error || task.lastError };
    await this.saveTaskToDB(updatedTask);
    this.tasks.update(ts => ts.map(t => t.id === id ? updatedTask : t));
    this.updateCounts();
  }

  private async completeTask(id: string) {
    await this.deleteTaskFromDB(id);
    this.tasks.update(ts => ts.filter(t => t.id !== id));
    this.updateCounts();
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
