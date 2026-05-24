import { Injectable } from '@angular/core';
import imageCompression from 'browser-image-compression';

@Injectable({
  providedIn: 'root'
})
export class ImageCompressionService {

  private readonly defaultOptions = {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85
  };

  async compressImage(file: File, options: any = this.defaultOptions): Promise<File> {
    try {
      // If it's not an image, just return the original file
      if (!file.type.startsWith('image/')) {
        return file;
      }

      const sizeBefore = file.size / 1024 / 1024;
      const compressedBlob = await imageCompression(file, options);
      const sizeAfter = compressedBlob.size / 1024 / 1024;
      
      console.log(`[ImageCompression] ${file.name}: ${sizeBefore.toFixed(2)}MB -> ${sizeAfter.toFixed(2)}MB (${((1 - sizeAfter/sizeBefore) * 100).toFixed(1)}% reduction)`);

      // Convert Blob back to File to maintain filename and metadata if possible
      return new File([compressedBlob], file.name, {
        type: options.fileType || file.type,
        lastModified: Date.now()
      });
    } catch (error) {
      console.error('Image compression failed:', error);
      // Fallback to original file if compression fails
      return file;
    }
  }
}
