import { env } from '../../../config/env.js';
import type { IStorageProvider } from './storage.interface.js';
import { LocalStorageProvider, localStorageProvider } from './local-storage.provider.js';
import { s3StorageProvider } from './s3-storage.provider.js';
import type { StorageProviderType } from './storage.types.js';

export class StorageFactory {
  static getProvider(type?: StorageProviderType): IStorageProvider {
    const selected = type || (env.DOCUMENT_STORAGE_PROVIDER as StorageProviderType) || 'local';

    switch (selected) {
      case 'local':
        return localStorageProvider;
      case 's3':
        return s3StorageProvider;
      default:
        return new LocalStorageProvider();
    }
  }
}
