import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../../../config/env.js';

export type SupportedExtension = 'pdf' | 'docx' | 'txt' | 'md';

export interface FileValidationResult {
  isValid: boolean;
  fileExtension: SupportedExtension;
  normalizedMimeType: string;
  sizeBytes: number;
  sha256Checksum: string;
  error?: string;
}

export const SUPPORTED_EXTENSIONS: Record<string, SupportedExtension> = {
  '.pdf': 'pdf',
  '.docx': 'docx',
  '.txt': 'txt',
  '.md': 'md',
};

export const ALLOWED_MIME_TYPES: Record<SupportedExtension, string[]> = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
  md: ['text/markdown', 'text/plain'],
};

export class DocumentValidationService {
  private maxSizeBytes: number;

  constructor(maxMb: number = env.MAX_DOCUMENT_SIZE_MB || 25) {
    this.maxSizeBytes = maxMb * 1024 * 1024;
  }

  /**
   * Validates a file from disk or buffer for extension, size, declared MIME,
   * file signature (magic bytes), and calculates its SHA-256 checksum.
   */
  async validateFile(
    originalFilename: string,
    declaredMimeType: string,
    filePathOrBuffer: string | Buffer
  ): Promise<FileValidationResult> {
    // 1. Extension check
    const rawExt = path.extname(originalFilename).toLowerCase();
    const ext = SUPPORTED_EXTENSIONS[rawExt];

    if (!ext) {
      return {
        isValid: false,
        fileExtension: 'pdf',
        normalizedMimeType: declaredMimeType,
        sizeBytes: 0,
        sha256Checksum: '',
        error: `UNSUPPORTED_FILE_TYPE: Extension "${rawExt}" is not supported. Supported: .pdf, .docx, .txt, .md`,
      };
    }

    // 2. MIME type check
    const allowedMimes = ALLOWED_MIME_TYPES[ext];
    const normalizedDeclaredMime = declaredMimeType.toLowerCase().split(';')[0].trim();
    if (!allowedMimes.includes(normalizedDeclaredMime)) {
      return {
        isValid: false,
        fileExtension: ext,
        normalizedMimeType: normalizedDeclaredMime,
        sizeBytes: 0,
        sha256Checksum: '',
        error: `INVALID_MIME_TYPE: MIME type "${declaredMimeType}" does not match extension "${rawExt}"`,
      };
    }

    // 3. Load file content / buffer for size and signature check
    let buffer: Buffer;
    let sizeBytes = 0;
    let sha256Checksum = '';

    if (Buffer.isBuffer(filePathOrBuffer)) {
      buffer = filePathOrBuffer;
      sizeBytes = buffer.length;
      sha256Checksum = crypto.createHash('sha256').update(buffer).digest('hex');
    } else {
      const stat = await fs.promises.stat(filePathOrBuffer);
      sizeBytes = stat.size;

      if (sizeBytes === 0) {
        return {
          isValid: false,
          fileExtension: ext,
          normalizedMimeType: normalizedDeclaredMime,
          sizeBytes: 0,
          sha256Checksum: '',
          error: 'FILE_EMPTY: Uploaded file contains 0 bytes',
        };
      }

      if (sizeBytes > this.maxSizeBytes) {
        return {
          isValid: false,
          fileExtension: ext,
          normalizedMimeType: normalizedDeclaredMime,
          sizeBytes,
          sha256Checksum: '',
          error: `FILE_TOO_LARGE: File size exceeds the maximum limit of ${env.MAX_DOCUMENT_SIZE_MB}MB`,
        };
      }

      // Read initial buffer chunk for signature check
      const handle = await fs.promises.open(filePathOrBuffer, 'r');
      const readLength = Math.min(sizeBytes, 32 * 1024); // read up to 32KB
      buffer = Buffer.alloc(readLength);
      await handle.read(buffer, 0, readLength, 0);
      await handle.close();

      // Compute full file checksum
      sha256Checksum = await this.computeFileChecksum(filePathOrBuffer);
    }

    if (sizeBytes === 0) {
      return {
        isValid: false,
        fileExtension: ext,
        normalizedMimeType: normalizedDeclaredMime,
        sizeBytes: 0,
        sha256Checksum: '',
        error: 'FILE_EMPTY: Uploaded file contains 0 bytes',
      };
    }

    if (sizeBytes > this.maxSizeBytes) {
      return {
        isValid: false,
        fileExtension: ext,
        normalizedMimeType: normalizedDeclaredMime,
        sizeBytes,
        sha256Checksum: '',
        error: `FILE_TOO_LARGE: File size exceeds the maximum limit of ${env.MAX_DOCUMENT_SIZE_MB}MB`,
      };
    }

    // 4. File signature (magic bytes) validation
    const signatureError = this.verifyFileSignature(ext, buffer);
    if (signatureError) {
      return {
        isValid: false,
        fileExtension: ext,
        normalizedMimeType: normalizedDeclaredMime,
        sizeBytes,
        sha256Checksum,
        error: signatureError,
      };
    }

    // Return standard canonical MIME type
    const canonicalMime = allowedMimes[0];

    return {
      isValid: true,
      fileExtension: ext,
      normalizedMimeType: canonicalMime,
      sizeBytes,
      sha256Checksum,
    };
  }

  /**
   * Validates deep file signatures (magic bytes) for each supported file type.
   */
  private verifyFileSignature(ext: SupportedExtension, buffer: Buffer): string | null {
    switch (ext) {
      case 'pdf': {
        // PDF files must start with '%PDF-' (0x25 0x50 0x44 0x46 0x2D)
        const header = buffer.subarray(0, 5).toString('ascii');
        if (!header.startsWith('%PDF-')) {
          return 'INVALID_FILE_SIGNATURE: File content does not match genuine PDF magic signature (%PDF-)';
        }
        return null;
      }

      case 'docx': {
        // DOCX is a PKZip container starting with 0x50 0x4B 0x03 0x04 (PK\x03\x04)
        if (
          buffer.length < 4 ||
          buffer[0] !== 0x50 ||
          buffer[1] !== 0x4b ||
          buffer[2] !== 0x03 ||
          buffer[3] !== 0x04
        ) {
          return 'INVALID_FILE_SIGNATURE: File is not a valid OOXML ZIP container (missing PK zip header)';
        }

        // Must contain standard Word OOXML directory markers
        const hasWordMarker =
          buffer.includes(Buffer.from('word/')) ||
          buffer.includes(Buffer.from('[Content_Types].xml'));

        if (!hasWordMarker) {
          return 'MALFORMED_DOCX: Archive missing required Microsoft Word OOXML internal structure';
        }
        return null;
      }

      case 'txt':
      case 'md': {
        // Text files must not contain binary null bytes (0x00)
        if (buffer.includes(0x00)) {
          return 'INVALID_TEXT_ENCODING: Binary null bytes detected in plain text/markdown file';
        }

        // Check UTF-8 validity
        try {
          const str = buffer.toString('utf-8');
          // Replace replacement char check
          if (str.includes('\uFFFD')) {
            return 'INVALID_TEXT_ENCODING: File contains invalid UTF-8 sequence';
          }
        } catch {
          return 'INVALID_TEXT_ENCODING: Text file could not be decoded as UTF-8';
        }
        return null;
      }

      default:
        return 'UNSUPPORTED_FILE_TYPE';
    }
  }

  private computeFileChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', err => reject(err));
    });
  }
}

export const documentValidationService = new DocumentValidationService();
