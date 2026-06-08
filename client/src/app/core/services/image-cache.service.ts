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
    if (url.startsWith('blob:') || url.startsWith('data:')) return;

    const fullUrl = this.getFullUrl(url);
    const cacheKey = this.getCacheKey(url);
    
    // Check if already in DB using clean cache key
    const cached = await this.persistence.getPhoto(cacheKey);
    if (cached) return;

    try {
      // Download as blob using full presigned authenticated URL
      const blob = await firstValueFrom(this.http.get(fullUrl, { responseType: 'blob' }));
      await this.persistence.savePhoto(cacheKey, blob);
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
    const cacheKey = this.getCacheKey(url);

    // Check memory map first using clean cache key
    if (this.urlMap.has(cacheKey)) {
      return this.urlMap.get(cacheKey)!;
    }

    // Check IndexedDB
    const blob = await this.persistence.getPhoto(cacheKey);
    if (blob) {
      const localUrl = URL.createObjectURL(blob);
      this.urlMap.set(cacheKey, localUrl);
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
   * Cleans a URL to use as a stable cache key by stripping presigned query parameters.
   */
  private getCacheKey(url: string): string {
    const fullUrl = this.getFullUrl(url);
    try {
      const parsed = new URL(fullUrl);
      return parsed.origin + parsed.pathname;
    } catch (e) {
      return fullUrl;
    }
  }

  /**
   * Clean up memory-mapped URLs
   */
  clearMemoryCache(): void {
    this.urlMap.forEach(url => URL.revokeObjectURL(url));
    this.urlMap.clear();
  }

  /**
   * Removes cached image from both memory cache and IndexedDB persistence.
   */
  async removeCachedImage(url: string): Promise<void> {
    if (!url) return;
    const cacheKey = this.getCacheKey(url);

    // Revoke memory ObjectURL if it exists
    if (this.urlMap.has(cacheKey)) {
      const localUrl = this.urlMap.get(cacheKey)!;
      URL.revokeObjectURL(localUrl);
      this.urlMap.delete(cacheKey);
    }

    // Delete from IndexedDB
    await this.persistence.deletePhoto(cacheKey);
  }
}
