import type { Readable } from 'node:stream';
import type { SaveFileParams, SaveFileResult, FileMetadataResult } from './storage.types.js';

export interface IStorageProvider {
  /**
   * Persists a file from local temp path, buffer, or stream into private storage.
   */
  save(params: SaveFileParams): Promise<SaveFileResult>;

  /**
   * Returns a readable stream for authenticated file download.
   */
  readStream(organizationId: string, storageKey: string): Promise<Readable>;

  /**
   * Deletes a physical file from storage (used primarily for compensation on failed DB insert).
   */
  delete(organizationId: string, storageKey: string): Promise<boolean>;

  /**
   * Checks whether a physical file exists in storage.
   */
  exists(organizationId: string, storageKey: string): Promise<boolean>;

  /**
   * Retrieves physical file metadata (size, last modified).
   */
  getMetadata(organizationId: string, storageKey: string): Promise<FileMetadataResult>;
}
