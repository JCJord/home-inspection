import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DraftService {
  private readonly PREFIX = 'draft:';

  /**
   * Save a draft to localStorage (Synchronous)
   */
  save(key: string, data: any): void {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Handle quota exceeded or other storage errors
      console.error('Failed to save draft to localStorage', e);
    }
  }

  /**
   * Load a draft from localStorage
   */
  load<T>(key: string): T | null {
    const json = localStorage.getItem(this.PREFIX + key);
    if (!json) return null;
    
    try {
      const wrapper = JSON.parse(json);
      return wrapper.data as T;
    } catch (e) {
      console.error('Failed to parse draft from localStorage', e);
      return null;
    }
  }

  /**
   * Remove a specific draft
   */
  clear(key: string): void {
    localStorage.removeItem(this.PREFIX + key);
  }

  /**
   * Clear all drafts managed by this service
   */
  clearAll(): void {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}
