export interface UploadFileParams {
  /** S3 object key — e.g. products/uuid/filename.jpg */
  key: string;
  /** Raw file buffer */
  buffer: Buffer;
  /** MIME type — e.g. image/jpeg */
  mimeType: string;
  /** Optional cache-control header value */
  cacheControl?: string;
}

export interface IStorageService {
  /**
   * Upload a file buffer to storage and return the stored object key.
   */
  uploadFile(params: UploadFileParams): Promise<string>;

  /**
   * Delete a single object by its key.
   * Resolves silently if the key does not exist.
   */
  deleteFile(key: string): Promise<void>;

  /**
   * Delete multiple objects by their keys in a single request.
   */
  deleteMultipleFiles(keys: string[]): Promise<void>;

  /**
   * Return true if an object with the given key exists in storage.
   */
  fileExists(key: string): Promise<boolean>;

  /**
   * Convert a stored object key into a fully-qualified public URL.
   * e.g. products/uuid/image.jpg → https://bucket.s3.region.amazonaws.com/products/uuid/image.jpg
   */
  generatePublicUrl(key: string): string;

  /**
   * Extract the S3 object key from a full URL.
   * If the input is already a key (not a URL), returns it unchanged.
   *
   * e.g. https://bucket.s3.region.amazonaws.com/products/uuid/image.jpg → products/uuid/image.jpg
   */
  extractObjectKey(urlOrKey: string): string;

  /**
   * Return true if the string looks like an S3 object key stored by this service
   * (i.e. starts with the products/ prefix, not a full URL).
   */
  isObjectKey(value: string): boolean;
}

export const STORAGE_SERVICE = Symbol('IStorageService');
