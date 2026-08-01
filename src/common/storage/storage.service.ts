import { Injectable } from '@nestjs/common';
import { AwsS3Service } from './aws-s3.service';
import { IStorageService, UploadFileParams } from './storage.interface';

/**
 * StorageService is the public facade exposed to all business modules.
 *
 * It delegates every operation to the configured storage provider (AwsS3Service).
 * Business modules must only depend on this service — never on AwsS3Service directly.
 */
@Injectable()
export class StorageService implements IStorageService {
  constructor(private readonly s3: AwsS3Service) {}

  uploadFile(params: UploadFileParams): Promise<string> {
    return this.s3.uploadFile(params);
  }

  deleteFile(key: string): Promise<void> {
    return this.s3.deleteFile(key);
  }

  deleteMultipleFiles(keys: string[]): Promise<void> {
    return this.s3.deleteMultipleFiles(keys);
  }

  fileExists(key: string): Promise<boolean> {
    return this.s3.fileExists(key);
  }

  generatePublicUrl(key: string): string {
    return this.s3.generatePublicUrl(key);
  }

  extractObjectKey(urlOrKey: string): string {
    return this.s3.extractObjectKey(urlOrKey);
  }

  isObjectKey(value: string): boolean {
    return this.s3.isObjectKey(value);
  }
}
