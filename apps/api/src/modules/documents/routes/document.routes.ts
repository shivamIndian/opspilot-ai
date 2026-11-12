import { Router } from 'express';
import { documentController } from '../controllers/document.controller.js';
import { handleDocumentUpload } from '../middleware/document-upload.middleware.js';
import { requireAuthentication } from '../../auth/middleware/authentication.middleware.js';
import { requireOrganizationContext } from '../../organizations/middleware/organization-context.middleware.js';
import { fileUploadLimiter } from '../../../middleware/rate-limiter.js';

export const documentRouter = Router({ mergeParams: true });

// All document endpoints require valid authentication and active organization membership
documentRouter.use(requireAuthentication);
documentRouter.use(requireOrganizationContext);

// 1. Upload a document to the organization
documentRouter.post('/', fileUploadLimiter, handleDocumentUpload, (req, res, next) =>
  documentController.upload(req, res, next)
);

// 2. List documents with filters, sorting, and pagination
documentRouter.get('/', (req, res, next) => documentController.list(req, res, next));

// 3. Document details by ID
documentRouter.get('/:documentId', (req, res, next) =>
  documentController.getDetails(req, res, next)
);

// 4. Download document binary stream with safe headers
documentRouter.get('/:documentId/download', (req, res, next) =>
  documentController.download(req, res, next)
);

// 5. Update document display name or description
documentRouter.patch('/:documentId', (req, res, next) =>
  documentController.updateMetadata(req, res, next)
);

// 6. Soft archive document (owner/admin only)
documentRouter.post('/:documentId/archive', (req, res, next) =>
  documentController.archive(req, res, next)
);

// 7. Restore archived document (owner/admin only)
documentRouter.post('/:documentId/restore', (req, res, next) =>
  documentController.restore(req, res, next)
);

// 8. Document processing status
documentRouter.get('/:documentId/processing-status', (req, res, next) =>
  documentController.getProcessingStatus(req, res, next)
);

// 9. Manual document reprocessing (owner/admin only)
documentRouter.post('/:documentId/process', (req, res, next) =>
  documentController.reprocess(req, res, next)
);

// 10. Document embedding status
documentRouter.get('/:documentId/embeddings/status', (req, res, next) =>
  documentController.getEmbeddingStatus(req, res, next)
);

// 11. Manual document embedding reprocessing (owner/admin only)
documentRouter.post('/:documentId/embeddings/reprocess', (req, res, next) =>
  documentController.reprocessEmbeddings(req, res, next)
);
