import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PersistenceService } from './persistence.service';
import { Inspection } from '../models/inspection.interface';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImageCacheService {
  private http = inject(HttpClient);
  private persistence = inject(PersistenceService);
  
  // Memory cache of active ObjectURLs to prevent leaks and re-resolution
  private urlMap = new Map<string, string>();

  /**
   * Pre-fetches all photos in an inspection and stores them in IndexedDB.
   */
  async prefetchInspection(inspection: Inspection): Promise<void> {
    const photos = inspection.findings?.flatMap(f => f.photos || []) || [];
    
    // Also include cover photo if present
    if (inspection.cover_photo_url) {
      photos.push({ storage_url: inspection.cover_photo_url } as any);
    }

    // Process in batches or one by one to avoid overwhelming the network
    for (const photo of photos) {
      if (photo.storage_url) {
        await this.ensureCached(photo.storage_url);
      }
    }
  }

  /**
   * Ensures a photo is stored in IndexedDB.
   */
  async ensureCached(url: string): Promise<void> {
    const fullUrl = this.getFullUrl(url);
    
    // Check if already in DB
    const cached = await this.persistence.getPhoto(fullUrl);
    if (cached) return;

    try {
      // Download as blob
      const blob = await firstValueFrom(this.http.get(fullUrl, { responseType: 'blob' }));
      await this.persistence.savePhoto(fullUrl, blob);
    } catch (err) {
      console.warn(`[ImageCache] Failed to cache: ${fullUrl}`, err);
    }
  }

  /**
   * Resolves a remote URL to a local Blob URL if cached.
   * If not cached, returns the original remote URL.
   */
  async getImageUrl(url: string | undefined): Promise<string> {
    if (!url) return '';
    
    // Handle already local URLs (blobs or base64)
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;

    const fullUrl = this.getFullUrl(url);

    // Check memory map first
    if (this.urlMap.has(fullUrl)) {
      return this.urlMap.get(fullUrl)!;
    }

    // Check IndexedDB
    const blob = await this.persistence.getPhoto(fullUrl);
    if (blob) {
      const localUrl = URL.createObjectURL(blob);
      this.urlMap.set(fullUrl, localUrl);
      return localUrl;
    }

    // Fallback to network URL
    return fullUrl;
  }

  private getFullUrl(url: string): string {
    if (url.startsWith('http')) return url;
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${environment.apiUrl}${path}`;
  }

  /**
   * Clean up memory-mapped URLs
   */
  clearMemoryCache(): void {
    this.urlMap.forEach(url => URL.revokeObjectURL(url));
    this.urlMap.clear();
  }
}
