"""PDF text extraction using PyMuPDF."""

import pymupdf
from typing import List
from app.config.settings import settings
from app.document_processing.extraction.base import (
    BaseExtractor,
    ExtractedDocument,
    ExtractedPage,
)
from app.document_processing.extraction.normalizer import TextNormalizer
from app.document_processing.exceptions import (
    InvalidFileSignatureError,
    CorruptedDocumentError,
    EncryptedPdfUnsupportedError,
    NoExtractableTextError,
    DocumentPageLimitExceededError,
    DocumentTooLargeError,
)


class PdfExtractor(BaseExtractor):
    """Extracts text page-by-page from genuine PDF documents."""

    def extract(self, file_bytes: bytes, filename: str) -> ExtractedDocument:
        # 1. Verify %PDF- magic signature (first 1024 bytes)
        if not file_bytes[:1024].startswith(b"%PDF-") and b"%PDF-" not in file_bytes[:1024]:
            raise InvalidFileSignatureError("File does not start with genuine %PDF- magic signature")

        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        except Exception as e:
            raise CorruptedDocumentError(f"Unable to parse PDF stream: {str(e)}")

        try:
            # 2. Check encryption / password protection
            if doc.is_encrypted:
                raise EncryptedPdfUnsupportedError(
                    "Password-protected or encrypted PDFs are not supported"
                )

            page_count = len(doc)
            if page_count == 0:
                raise NoExtractableTextError("PDF contains 0 pages")

            # 3. Enforce maximum allowable page count
            if page_count > settings.MAX_DOCUMENT_PAGES:
                raise DocumentPageLimitExceededError(
                    f"PDF contains {page_count} pages, which exceeds the limit of {settings.MAX_DOCUMENT_PAGES}"
                )

            extracted_pages: List[ExtractedPage] = []
            full_text_parts: List[str] = []
            current_char_offset = 0

            # 4. Extract text page by page
            for page_idx in range(page_count):
                page = doc[page_idx]
                page_text_raw = page.get_text("text") or ""
                page_text = TextNormalizer.normalize(page_text_raw)

                if page_text:
                    char_start = current_char_offset
                    char_end = char_start + len(page_text)
                    extracted_pages.append(
                        ExtractedPage(
                            page_number=page_idx + 1,  # 1-based index
                            text=page_text,
                            char_start=char_start,
                            char_end=char_end,
                        )
                    )
                    full_text_parts.append(page_text)
                    # +2 characters accounting for "\n\n" page delimiter
                    current_char_offset = char_end + 2

            joined_text = "\n\n".join(full_text_parts).strip()

            # 5. Check if document has no extractable text (e.g. scanned image only)
            if TextNormalizer.is_empty_or_whitespace(joined_text):
                raise NoExtractableTextError(
                    "No extractable text found in PDF. Scanned images or rasterized PDFs require OCR (unsupported in this pipeline)."
                )

            # 6. Check character count limit
            if len(joined_text) > settings.MAX_EXTRACTED_CHARS:
                raise DocumentTooLargeError(
                    f"Extracted character count ({len(joined_text)}) exceeds limit of {settings.MAX_EXTRACTED_CHARS}"
                )

            return ExtractedDocument(
                full_text=joined_text,
                page_count=page_count,
                pages=extracted_pages,
                sections=[],
                extraction_method="pymupdf",
                metadata={
                    "format": "pdf",
                    "total_pages": page_count,
                    "pages_with_text": len(extracted_pages),
                    "is_pdf": True,
                },
            )
        finally:
            doc.close()
