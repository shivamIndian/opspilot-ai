"""DOCX text extraction using python-docx with ZIP bomb protection."""

import io
import zipfile
from typing import List
from docx import Document
from app.config.settings import settings
from app.document_processing.extraction.base import (
    BaseExtractor,
    ExtractedDocument,
    ExtractedSection,
)
from app.document_processing.extraction.normalizer import TextNormalizer
from app.document_processing.exceptions import (
    InvalidFileSignatureError,
    CorruptedDocumentError,
    NoExtractableTextError,
    DocumentTooLargeError,
)

MAX_UNCOMPRESSED_DOCX_BYTES = 100 * 1024 * 1024  # 100 MB max uncompressed ZIP limit
MAX_COMPRESSION_RATIO = 100  # Zip bomb ratio threshold


class DocxExtractor(BaseExtractor):
    """Extracts text, headings, and table data from Microsoft Word (.docx) files."""

    def extract(self, file_bytes: bytes, filename: str) -> ExtractedDocument:
        # 1. Verify ZIP container signature (PK\x03\x04)
        if not file_bytes.startswith(b"PK\x03\x04"):
            raise InvalidFileSignatureError("File does not start with genuine ZIP/DOCX header")

        file_stream = io.BytesIO(file_bytes)

        # 2. Inspect ZIP archive structure and guard against ZIP bombs
        try:
            with zipfile.ZipFile(file_stream, "r") as zf:
                namelist = zf.namelist()
                if "word/document.xml" not in namelist:
                    raise InvalidFileSignatureError(
                        "DOCX archive is missing required 'word/document.xml' container"
                    )

                total_uncompressed = 0
                compressed_size = max(len(file_bytes), 1)

                for info in zf.infolist():
                    total_uncompressed += info.file_size
                    if total_uncompressed > MAX_UNCOMPRESSED_DOCX_BYTES:
                        raise DocumentTooLargeError(
                            "Expanded DOCX size exceeds safe threshold (potential ZIP bomb)"
                        )

                if total_uncompressed / compressed_size > MAX_COMPRESSION_RATIO:
                    raise CorruptedDocumentError(
                        "Anomalous compression ratio detected (potential ZIP bomb)"
                    )
        except zipfile.BadZipFile as e:
            raise CorruptedDocumentError(f"Corrupted or invalid DOCX archive: {str(e)}")

        file_stream.seek(0)

        # 3. Parse with python-docx
        try:
            doc = Document(file_stream)
        except Exception as e:
            raise CorruptedDocumentError(f"python-docx failed to parse document: {str(e)}")

        sections: List[ExtractedSection] = []
        text_blocks: List[str] = []
        current_char_offset = 0

        # 4. Extract paragraphs and headings
        for p in doc.paragraphs:
            raw_text = p.text or ""
            normalized = TextNormalizer.normalize(raw_text)
            if not normalized:
                continue

            style_name = (p.style.name or "").lower()
            if "heading" in style_name:
                level = 1
                try:
                    # e.g., 'Heading 2' -> 2
                    level = int("".join(filter(str.isdigit, style_name)))
                except ValueError:
                    level = 1

                char_start = current_char_offset
                char_end = char_start + len(normalized)
                sections.append(
                    ExtractedSection(
                        title=normalized,
                        level=level,
                        char_start=char_start,
                        char_end=char_end,
                    )
                )

            text_blocks.append(normalized)
            current_char_offset += len(normalized) + 2

        # 5. Extract tables
        for table in doc.tables:
            table_rows_text: List[str] = []
            for row in table.rows:
                cell_texts = [
                    TextNormalizer.normalize(cell.text or "")
                    for cell in row.cells
                ]
                row_str = " | ".join(filter(None, cell_texts))
                if row_str:
                    table_rows_text.append(row_str)

            if table_rows_text:
                table_block = "\n".join(table_rows_text)
                text_blocks.append(table_block)
                current_char_offset += len(table_block) + 2

        full_text = "\n\n".join(text_blocks).strip()

        if TextNormalizer.is_empty_or_whitespace(full_text):
            raise NoExtractableTextError("DOCX contains no extractable text or tables")

        if len(full_text) > settings.MAX_EXTRACTED_CHARS:
            raise DocumentTooLargeError(
                f"Extracted character count ({len(full_text)}) exceeds limit of {settings.MAX_EXTRACTED_CHARS}"
            )

        return ExtractedDocument(
            full_text=full_text,
            page_count=None,
            pages=[],
            sections=sections,
            extraction_method="python-docx",
            metadata={
                "format": "docx",
                "paragraph_count": len(doc.paragraphs),
                "table_count": len(doc.tables),
                "heading_count": len(sections),
            },
        )
