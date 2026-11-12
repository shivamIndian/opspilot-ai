"""Extraction package exports and format dispatcher."""

from app.document_processing.extraction.base import (
    BaseExtractor,
    ExtractedDocument,
    ExtractedPage,
    ExtractedSection,
)
from app.document_processing.extraction.pdf_extractor import PdfExtractor
from app.document_processing.extraction.docx_extractor import DocxExtractor
from app.document_processing.extraction.text_extractor import TextExtractor
from app.document_processing.extraction.markdown_extractor import MarkdownExtractor
from app.document_processing.extraction.normalizer import TextNormalizer
from app.document_processing.exceptions import UnsupportedFileTypeError


def get_extractor(extension: str) -> BaseExtractor:
    """Dispatches appropriate extractor based on lowercase file extension."""
    clean_ext = extension.lower().lstrip(".")
    if clean_ext == "pdf":
        return PdfExtractor()
    elif clean_ext == "docx":
        return DocxExtractor()
    elif clean_ext == "txt":
        return TextExtractor()
    elif clean_ext == "md":
        return MarkdownExtractor()
    else:
        raise UnsupportedFileTypeError(
            f"Unsupported file extension '.{clean_ext}'. Supported: .pdf, .docx, .txt, .md"
        )


__all__ = [
    "BaseExtractor",
    "ExtractedDocument",
    "ExtractedPage",
    "ExtractedSection",
    "PdfExtractor",
    "DocxExtractor",
    "TextExtractor",
    "MarkdownExtractor",
    "TextNormalizer",
    "get_extractor",
]
