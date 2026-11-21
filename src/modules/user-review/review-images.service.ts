import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

import { StorageService } from '../../common/storage/storage.service';

export const MAX_REVIEW_IMAGES = 3;
export const MAX_REVIEW_IMAGE_BYTES = 5 * 1024 * 1024;
const supportedFormats = new Set(['jpeg', 'png', 'webp']);

export interface ReviewImageUpload {
  buffer: Buffer;
}

@Injectable()
export class ReviewImagesService {
  private readonly logger = new Logger(ReviewImagesService.name);

  constructor(private readonly storage: StorageService) {}

  async upload(userId: string, productId: string, files: ReviewImageUpload[]) {
    const keys: string[] = [];

    try {
      for (const file of files) {
        const buffer = await this.compress(file);
        const key = `${userId}/${productId}/images/${randomUUID()}.webp`;
        keys.push(key);
        await this.storage.uploadFile({
          key,
          buffer,
          mimeType: 'image/webp',
          cacheControl: 'private, no-store',
        });
      }
      return keys;
    } catch (error) {
      await this.remove(keys);
      throw error;
    }
  }

  async remove(keys: string[]) {
    if (!keys.length) return;
    try {
      await this.storage.deleteMultipleFiles(keys);
    } catch {
      this.logger.error('Review image cleanup failed');
    }
  }

  getLinks(keys: string[]) {
    return Promise.all(
      keys.map((key) => this.storage.generateDownloadUrl(key)),
    );
  }

  private async compress(file: ReviewImageUpload) {
    try {
      const image = sharp(file.buffer, { limitInputPixels: 24_000_000 });
      const { format, pages } = await image.metadata();
      if (!format || !supportedFormats.has(format) || (pages ?? 1) > 1) {
        throw new BadRequestException(
          'Review photos must be JPEG, PNG, or WebP still images.',
        );
      }
      return await image
        .rotate()
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        'A review photo is invalid or too large to process.',
      );
    }
  }
}
