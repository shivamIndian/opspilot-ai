import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '../../../config/env.js';
import type { IStorageProvider } from './storage.interface.js';
import type { SaveFileParams, SaveFileResult, FileMetadataResult } from './storage.types.js';

export class S3StorageProvider implements IStorageProvider {
  private s3: S3Client;
  private bucket: string;

  constructor(bucketName?: string, region?: string) {
    this.bucket = bucketName || env.AWS_S3_DOCUMENT_BUCKET || 'opspilot-documents-private';
    this.s3 = new S3Client({
      region: region || env.AWS_REGION || 'us-east-1',
    });
  }

  private getS3ObjectKey(organizationId: string, storageKey: string): string {
    if (storageKey.includes('..') || organizationId.includes('..')) {
      throw new Error('SECURITY_ERROR: Path traversal detected in S3 storage key resolution');
    }
    const sanitizedOrg = path.basename(organizationId);
    const sanitizedKey = path.basename(storageKey);
    return `${sanitizedOrg}/${sanitizedKey}`;
  }

  async save(params: SaveFileParams): Promise<SaveFileResult> {
    const objectKey = this.getS3ObjectKey(params.organizationId, params.storageKey);

    let body: Buffer | Readable;
    let contentLength: number;

    if (params.buffer) {
      body = params.buffer;
      contentLength = params.buffer.length;
    } else if (params.sourcePath) {
      const stat = await fs.promises.stat(params.sourcePath);
      contentLength = stat.size;
      body = fs.createReadStream(params.sourcePath);
    } else if (params.stream) {
      body = params.stream;
      contentLength = 0;
    } else {
      throw new Error('INVALID_STORAGE_PARAMS: No file source provided');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
      Body: body,
      ContentLength: contentLength > 0 ? contentLength : undefined,
      ContentType: params.mimeType || 'application/octet-stream',
      ServerSideEncryption: 'AES256',
    });

    await this.s3.send(command);

    return {
      storageKey: params.storageKey,
      sizeBytes: contentLength,
    };
  }

  async readStream(organizationId: string, storageKey: string): Promise<Readable> {
    const objectKey = this.getS3ObjectKey(organizationId, storageKey);
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });

    const response = await this.s3.send(command);
    if (!response.Body) {
      throw new Error(`S3_OBJECT_EMPTY: Object '${objectKey}' contains no data stream.`);
    }

    return response.Body as Readable;
  }

  async delete(organizationId: string, storageKey: string): Promise<boolean> {
    const objectKey = this.getS3ObjectKey(organizationId, storageKey);
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });

    await this.s3.send(command);
    return true;
  }

  async exists(organizationId: string, storageKey: string): Promise<boolean> {
    const objectKey = this.getS3ObjectKey(organizationId, storageKey);
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      });
      await this.s3.send(command);
      return true;
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  }

  async getMetadata(organizationId: string, storageKey: string): Promise<FileMetadataResult> {
    const objectKey = this.getS3ObjectKey(organizationId, storageKey);
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: objectKey,
    });

    const response = await this.s3.send(command);
    return {
      sizeBytes: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
    };
  }
}

export const s3StorageProvider = new S3StorageProvider();
