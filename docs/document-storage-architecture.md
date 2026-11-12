# Document Storage Architecture

## 1. Storage Abstraction Layer

OpsPilot AI decouples business logic from physical storage hardware through the `IStorageProvider` interface.

```typescript
export interface IStorageProvider {
  save(params: SaveFileParams): Promise<SaveFileResult>;
  readStream(organizationId: string, storageKey: string): Promise<Readable>;
  delete(organizationId: string, storageKey: string): Promise<boolean>;
  exists(organizationId: string, storageKey: string): Promise<boolean>;
  getMetadata(organizationId: string, storageKey: string): Promise<FileMetadataResult>;
}
```

The current implementation uses `LocalStorageProvider`, which persists documents to a private, non-public directory structure configurable via `DOCUMENT_STORAGE_ROOT` (defaulting to `.data/opspilot-uploads`).

## 2. Directory Layout & Organization Isolation

```
opspilot-ai/
  .data/
    opspilot-uploads/
      aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/  <-- Org ID A
        e53b6f20-8025-46b5-8208-e87f1b6da4a0.pdf
        0fa48b87-7341-4e43-8559-0a6ee9a27218.docx
      bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/  <-- Org ID B
        2109e25d-2092-4f76-ae0e-7d43efc6ebf2.txt
```

### Path Traversal Defense

Paths are constructed using `path.resolve` combined with `path.basename` and explicit checks for `..` or absolute path prefixes:

```typescript
if (storageKey.includes('..') || organizationId.includes('..') || path.isAbsolute(storageKey)) {
  throw new Error('SECURITY_ERROR: Path traversal detected in storage path resolution');
}
```

If the resolved path deviates from `expectedOrgDir + path.sep`, execution halts immediately.

## 3. Unguessable Storage Keys

Files are never stored on disk with their user-supplied original filename. A secure UUID is generated for every upload:
`storage_key = `${crypto.randomUUID()}.${fileExtension}`;`

This eliminates:

- Filename collisions
- Command/shell injection via crafted filenames
- Unauthorized discovery via directory guessing or brute-force enumeration
- OS-level character encoding issues
