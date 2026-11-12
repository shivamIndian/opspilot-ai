import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { env } from '../../../config/env.js';
import type { IStorageProvider } from './storage.interface.js';
import type { SaveFileParams, SaveFileResult, FileMetadataResult } from './storage.types.js';

export class LocalStorageProvider implements IStorageProvider {
  private storageRoot: string;

  constructor(customRoot?: string) {
    const rawRoot = customRoot || env.DOCUMENT_STORAGE_ROOT || '.data/opspilot-uploads';
    this.storageRoot = path.isAbsolute(rawRoot) ? rawRoot : path.resolve(process.cwd(), rawRoot);
  }

  /**
   * Resolves physical storage path for a file while strictly verifying
   * that it stays within the configured organization subfolder.
   */
  public resolvePath(organizationId: string, storageKey: string): string {
    return this.getSecureFilePath(organizationId, storageKey);
  }

  private getSecureFilePath(organizationId: string, storageKey: string): string {
    // Explicit guard against directory traversal sequences
    if (storageKey.includes('..') || organizationId.includes('..') || path.isAbsolute(storageKey)) {
      throw new Error('SECURITY_ERROR: Path traversal detected in storage path resolution');
    }

    const sanitizedOrgId = path.basename(organizationId);
    const sanitizedKey = path.basename(storageKey);

    const expectedOrgDir = path.resolve(this.storageRoot, sanitizedOrgId);
    const resolvedFilePath = path.resolve(expectedOrgDir, sanitizedKey);

    // Verify resolved path is strictly inside expectedOrgDir
    if (
      !resolvedFilePath.startsWith(expectedOrgDir + path.sep) &&
      resolvedFilePath !== expectedOrgDir
    ) {
      throw new Error('SECURITY_ERROR: Path traversal detected in storage path resolution');
    }

    return resolvedFilePath;
  }

  async save(params: SaveFileParams): Promise<SaveFileResult> {
    const targetPath = this.getSecureFilePath(params.organizationId, params.storageKey);
    const parentDir = path.dirname(targetPath);

    // Ensure parent directory exists
    await fs.promises.mkdir(parentDir, { recursive: true, mode: 0o750 });

    if (params.sourcePath) {
      // Copy or rename temporary file into private permanent storage
      await fs.promises.copyFile(params.sourcePath, targetPath);
      const stat = await fs.promises.stat(targetPath);
      return {
        storageKey: params.storageKey,
        sizeBytes: stat.size,
      };
    }

    if (params.buffer) {
      await fs.promises.writeFile(targetPath, params.buffer, { mode: 0o640 });
      return {
        storageKey: params.storageKey,
        sizeBytes: params.buffer.length,
      };
    }

    if (params.stream) {
      const writeStream = fs.createWriteStream(targetPath, { mode: 0o640 });
      await pipeline(params.stream, writeStream);
      const stat = await fs.promises.stat(targetPath);
      return {
        storageKey: params.storageKey,
        sizeBytes: stat.size,
      };
    }

    throw new Error('STORAGE_ERROR: No source provided to save file');
  }

  async readStream(organizationId: string, storageKey: string): Promise<fs.ReadStream> {
    const targetPath = this.getSecureFilePath(organizationId, storageKey);

    try {
      await fs.promises.access(targetPath, fs.constants.R_OK);
    } catch {
      throw new Error('STORAGE_FILE_NOT_FOUND: Physical file missing in storage');
    }

    return fs.createReadStream(targetPath);
  }

  async delete(organizationId: string, storageKey: string): Promise<boolean> {
    try {
      const targetPath = this.getSecureFilePath(organizationId, storageKey);
      await fs.promises.unlink(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  async exists(organizationId: string, storageKey: string): Promise<boolean> {
    try {
      const targetPath = this.getSecureFilePath(organizationId, storageKey);
      await fs.promises.access(targetPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(organizationId: string, storageKey: string): Promise<FileMetadataResult> {
    const targetPath = this.getSecureFilePath(organizationId, storageKey);
    const stat = await fs.promises.stat(targetPath);
    return {
      sizeBytes: stat.size,
      lastModified: stat.mtime,
    };
  }
}

export const localStorageProvider = new LocalStorageProvider();
