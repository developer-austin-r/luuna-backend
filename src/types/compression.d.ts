declare module 'compression' {
  import { RequestHandler } from 'express';

  type CompressionOptions = {
    threshold?: number | string;
    level?: number;
    memLevel?: number;
    strategy?: number;
    chunkSize?: number;
    windowBits?: number;
    filter?: (
      req: Parameters<RequestHandler>[0],
      res: Parameters<RequestHandler>[1],
    ) => boolean;
  };

  export default function compression(
    options?: CompressionOptions,
  ): RequestHandler;
}
