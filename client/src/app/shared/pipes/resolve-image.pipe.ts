import { Pipe, PipeTransform, inject } from '@angular/core';
import { ImageCacheService } from '../../core/services/image-cache.service';

@Pipe({
  name: 'resolveImage',
  standalone: true
})
export class ResolveImagePipe implements PipeTransform {
  private imageCache = inject(ImageCacheService);

  /**
   * Transforms a remote URL into a local cached URL.
   * Usage: [src]="photo.storage_url | resolveImage | async"
   */
  async transform(url: string | undefined): Promise<string> {
    if (!url) return '';
    return this.imageCache.getImageUrl(url);
  }
}
