import type { Readable } from 'node:stream';

export type StorageProviderType = 'local' | 's3';

export interface SaveFileParams {
  organizationId: string;
  storageKey: string;
  sourcePath?: string;
  buffer?: Buffer;
  stream?: Readable;
  mimeType: string;
}

export interface SaveFileResult {
  storageKey: string;
  sizeBytes: number;
}

export interface FileMetadataResult {
  sizeBytes: number;
  lastModified: Date;
}
