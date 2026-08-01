import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  NotFound,
} from '@aws-sdk/client-s3';
import { IStorageService, UploadFileParams } from './storage.interface';

/** Maps common file extensions to their MIME types. */
const SUPPORTED_MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  pdf: 'application/pdf',
};

@Injectable()
export class AwsS3Service implements IStorageService {
  private readonly logger = new Logger(AwsS3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('aws.region');
    const bucket = this.configService.get<string>('aws.bucket');
    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
    );
    const baseUrl = this.configService.get<string>('aws.s3BaseUrl');

    if (!region || !bucket || !accessKeyId || !secretAccessKey || !baseUrl) {
      throw new Error(
        'Missing required AWS S3 environment variables: ' +
          'AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BASE_URL',
      );
    }

    this.bucket = bucket;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // strip trailing slash

    this.client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log(
      `AwsS3Service initialised — bucket: ${bucket}, region: ${region}`,
    );
  }

  // ─────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────

  /**
   * Upload a buffer to S3 and return the stored object key.
   */
  async uploadFile(params: UploadFileParams): Promise<string> {
    const {
      key,
      buffer,
      mimeType,
      cacheControl = 'public, max-age=31536000',
    } = params;

    this.logger.log(
      `Uploading file to S3 — key: ${key}, size: ${buffer.length} bytes`,
    );

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          CacheControl: cacheControl,
        }),
      );

      this.logger.log(`Upload success — key: ${key}`);
      return key;
    } catch (err) {
      this.logger.error(
        `Upload failed — key: ${key}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw new InternalServerErrorException(
        `Failed to upload file to S3: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Delete a single S3 object. Resolves silently if not found.
   */
  async deleteFile(key: string): Promise<void> {
    // Skip deletion for legacy values that are full external URLs not belonging to this bucket
    if (!this.isObjectKey(key) && this.isExternalUrl(key)) {
      this.logger.warn(
        `Skipping S3 delete — value is an external URL, not a managed key: ${key}`,
      );
      return;
    }

    const resolvedKey = this.extractObjectKey(key);

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: resolvedKey,
        }),
      );
      this.logger.log(`Delete success — key: ${resolvedKey}`);
    } catch (err) {
      // S3 DeleteObject does not throw on missing objects, but guard anyway
      this.logger.error(
        `Delete failed — key: ${resolvedKey}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /**
   * Delete multiple S3 objects in a single API call (max 1 000 per request).
   */
  async deleteMultipleFiles(keys: string[]): Promise<void> {
    if (!keys.length) return;

    // Filter to only managed object keys; skip legacy external URLs
    const managedKeys = keys
      .map((k) => this.extractObjectKey(k))
      .filter((k) => !this.isExternalUrl(k));

    if (!managedKeys.length) return;

    // Batch into groups of 1 000 (AWS limit)
    const batches: string[][] = [];
    for (let i = 0; i < managedKeys.length; i += 1000) {
      batches.push(managedKeys.slice(i, i + 1000));
    }

    for (const batch of batches) {
      try {
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
              Objects: batch.map((Key) => ({ Key })),
              Quiet: true,
            },
          }),
        );
        this.logger.log(`Batch delete success — ${batch.length} objects`);
      } catch (err) {
        this.logger.error(
          `Batch delete failed — ${batch.length} objects`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  }

  /**
   * Return true if the object exists in S3.
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (err) {
      if (err instanceof NotFound) return false;
      // Re-throw unexpected errors
      throw err;
    }
  }

  /**
   * Construct the public URL for a given object key.
   * Only use this when building API responses — never store the URL in the DB.
   */
  generatePublicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  /**
   * Extract the object key from a full S3 URL or pass through an existing key.
   *
   * Examples:
   *   https://bucket.s3.amazonaws.com/products/uuid/img.jpg → products/uuid/img.jpg
   *   products/uuid/img.jpg → products/uuid/img.jpg
   */
  extractObjectKey(urlOrKey: string): string {
    if (!urlOrKey) return urlOrKey;

    // Already a relative key — return as-is
    if (!urlOrKey.startsWith('http://') && !urlOrKey.startsWith('https://')) {
      return urlOrKey;
    }

    // Strip the base URL prefix if it matches our bucket
    if (urlOrKey.startsWith(this.baseUrl)) {
      return urlOrKey.slice(this.baseUrl.length).replace(/^\//, '');
    }

    // For full URLs from other origins, attempt to extract the path portion
    try {
      const url = new URL(urlOrKey);
      return url.pathname.replace(/^\//, '');
    } catch {
      return urlOrKey;
    }
  }

  /**
   * Return true when the value is a managed S3 object key (starts with products/).
   */
  isObjectKey(value: string): boolean {
    if (!value) return false;
    return (
      !value.startsWith('http://') &&
      !value.startsWith('https://') &&
      value.startsWith('products/')
    );
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  /** Resolve the MIME type for a file extension. */
  static getMimeType(extension: string): string | undefined {
    return SUPPORTED_MIME_TYPES[extension.toLowerCase().replace('.', '')];
  }

  /** Return all supported MIME types as a flat array. */
  static getSupportedMimeTypes(): string[] {
    return Object.values(SUPPORTED_MIME_TYPES);
  }

  /** Return true when the value is a full URL (not a relative key). */
  private isExternalUrl(value: string): boolean {
    return value.startsWith('http://') || value.startsWith('https://');
  }
}
