import io
from unittest.mock import patch, AsyncMock
import pytest
import pymupdf
from docx import Document as DocxDocument
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.config.settings import settings
from app.document_processing.extraction.normalizer import TextNormalizer
from app.document_processing.extraction.text_extractor import TextExtractor
from app.document_processing.extraction.markdown_extractor import MarkdownExtractor
from app.document_processing.extraction.docx_extractor import DocxExtractor
from app.document_processing.extraction.pdf_extractor import PdfExtractor
from app.document_processing.chunking.splitter import DocumentSplitter
from app.document_processing.extraction.base import ExtractedDocument, ExtractedPage, ExtractedSection
from app.document_processing.schemas import ProcessDocumentResponse, ProcessingRunSummary
from app.document_processing.exceptions import (
    CorruptedDocumentError,
    NoExtractableTextError,
    ChunkLimitExceededError,
)


class TestTextNormalizer:
    def test_unicode_nfc_and_newlines(self):
        decomposed = "e\u0301cole"
        raw = f"Hello\r\nWorld\r\rTest\n\n\n\nMore Spaces\t\tEnd {decomposed}"
        normalized = TextNormalizer.normalize(raw)

        assert "école" in normalized
        assert "\r" not in normalized
        assert "\n\n\n" not in normalized
        assert "Hello\nWorld\n\nTest\n\nMore Spaces\t\tEnd école" == normalized

    def test_control_character_stripping(self):
        raw = "Hello\x00\x08\x0b\x0cWorld\nTab\tKept"
        normalized = TextNormalizer.normalize(raw)
        assert "\x00" not in normalized
        assert "\x08" not in normalized
        assert "\x0b" not in normalized
        assert "HelloWorld\nTab\tKept" == normalized


class TestTextExtractor:
    def test_valid_text_extraction(self):
        extractor = TextExtractor()
        content = "Sample document header\n\nThis is paragraph one.\nThis is paragraph two.".encode("utf-8")
        doc = extractor.extract(content, "sample.txt")

        assert "paragraph one" in doc.full_text
        assert doc.metadata["char_length"] == len(doc.full_text)

    def test_binary_null_byte_rejection(self):
        extractor = TextExtractor()
        content = b"Binary \x00 file with corrupted null bytes"
        with pytest.raises(CorruptedDocumentError) as exc_info:
            extractor.extract(content, "bad.txt")
        assert exc_info.value.error_code == "CORRUPTED_DOCUMENT"

    def test_empty_content_rejection(self):
        extractor = TextExtractor()
        content = b"    \n\n   \t  "
        with pytest.raises(NoExtractableTextError) as exc_info:
            extractor.extract(content, "empty.txt")
        assert exc_info.value.error_code == "NO_EXTRACTABLE_TEXT"


class TestMarkdownExtractor:
    def test_markdown_heading_hierarchy(self):
        extractor = MarkdownExtractor()
        md_text = """# Main Title

Introduction text under main title.

## Section 1: Background

Background paragraph detailing system overview.

### Subsection 1.1: Architecture

Architecture bullet points:
- Item 1
- Item 2

```python
def hello():
    return "world"
```
"""
        doc = extractor.extract(md_text.encode("utf-8"), "guide.md")

        assert len(doc.sections) >= 3
        section_titles = [s.title for s in doc.sections]
        assert "Main Title" in section_titles
        assert "Section 1: Background" in section_titles
        assert "def hello():" in doc.full_text


class TestDocxExtractor:
    def test_docx_extraction_success(self):
        docx = DocxDocument()
        docx.add_heading("Docx Document Title", level=1)
        docx.add_paragraph("First section paragraph text.")
        table = docx.add_table(rows=2, cols=2)
        table.cell(0, 0).text = "Header A"
        table.cell(0, 1).text = "Header B"
        table.cell(1, 0).text = "Val 1"
        table.cell(1, 1).text = "Val 2"

        buf = io.BytesIO()
        docx.save(buf)
        raw_bytes = buf.getvalue()

        extractor = DocxExtractor()
        doc = extractor.extract(raw_bytes, "test.docx")

        assert "Docx Document Title" in doc.full_text
        assert "First section paragraph text." in doc.full_text
        assert "Header A | Header B" in doc.full_text
        assert "Val 1 | Val 2" in doc.full_text

    def test_invalid_zip_rejection(self):
        extractor = DocxExtractor()
        corrupted_bytes = b"PK\x03\x04not a real zip archive file content"
        with pytest.raises(CorruptedDocumentError) as exc_info:
            extractor.extract(corrupted_bytes, "fake.docx")
        assert exc_info.value.error_code == "CORRUPTED_DOCUMENT"


class TestPdfExtractor:
    def test_synthetic_pdf_extraction(self):
        pdf_doc = pymupdf.open()
        p1 = pdf_doc.new_page()
        p1.insert_text((72, 72), "First Page Header\nFirst page content details.")
        p2 = pdf_doc.new_page()
        p2.insert_text((72, 72), "Second Page Header\nSecond page content details.")

        pdf_bytes = pdf_doc.tobytes()
        pdf_doc.close()

        extractor = PdfExtractor()
        doc = extractor.extract(pdf_bytes, "test.pdf")

        assert doc.page_count == 2
        assert len(doc.pages) == 2
        assert "First Page Header" in doc.pages[0].text
        assert "Second Page Header" in doc.pages[1].text
        assert doc.pages[0].page_number == 1
        assert doc.pages[1].page_number == 2

    def test_scanned_or_empty_pdf_rejection(self):
        pdf_doc = pymupdf.open()
        pdf_doc.new_page()  # blank page without text
        pdf_bytes = pdf_doc.tobytes()
        pdf_doc.close()

        extractor = PdfExtractor()
        with pytest.raises(NoExtractableTextError) as exc_info:
            extractor.extract(pdf_bytes, "blank.pdf")
        assert exc_info.value.error_code == "NO_EXTRACTABLE_TEXT"


class TestDocumentSplitter:
    def test_chunking_with_overlap_and_metadata(self):
        splitter = DocumentSplitter(chunk_size=200, chunk_overlap=30)
        long_text = ("Enterprise Agentic AI workflow management and document indexing. " * 20).strip()
        page = ExtractedPage(page_number=1, text=long_text, char_start=0, char_end=len(long_text))
        sec = ExtractedSection(title="Introduction", level=1, char_start=0, char_end=len(long_text))
        extracted = ExtractedDocument(
            full_text=long_text,
            pages=[page],
            sections=[sec],
            page_count=1,
            extraction_method="test",
        )

        chunks = splitter.split_document(extracted)

        assert len(chunks) > 1
        for i, chunk in enumerate(chunks):
            assert chunk.chunk_index == i
            assert len(chunk.content) <= 250
            assert chunk.page_start == 1
            assert chunk.section_title == "Introduction"
            assert chunk.content_hash is not None
            assert len(chunk.content_hash) == 64

    def test_max_chunks_limit_exceeded(self):
        splitter = DocumentSplitter(chunk_size=50, chunk_overlap=10, max_chunks=3)
        long_text = "Word " * 200
        extracted = ExtractedDocument(
            full_text=long_text,
            pages=[ExtractedPage(page_number=1, text=long_text, char_start=0, char_end=len(long_text))],
            sections=[],
            page_count=1,
            extraction_method="test",
        )

        with pytest.raises(ChunkLimitExceededError) as exc_info:
            splitter.split_document(extracted)
        assert exc_info.value.error_code == "CHUNK_LIMIT_EXCEEDED"


class TestInternalProcessEndpoint:
    @pytest.mark.asyncio
    async def test_missing_internal_token(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/internal/v1/documents/process",
                data={
                    "document_id": "11111111-1111-1111-1111-111111111111",
                    "organization_id": "22222222-2222-2222-2222-222222222222",
                    "processing_generation": 1,
                    "source_checksum": "a" * 64,
                    "file_extension": "txt",
                },
                files={"file": ("test.txt", b"Valid text content", "text/plain")},
            )
            assert response.status_code == 401
            assert response.json()["detail"]["error_code"] == "MISSING_SERVICE_TOKEN"

    @pytest.mark.asyncio
    async def test_invalid_internal_token(self):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/internal/v1/documents/process",
                headers={"Authorization": "Bearer completely-wrong-token"},
                data={
                    "document_id": "11111111-1111-1111-1111-111111111111",
                    "organization_id": "22222222-2222-2222-2222-222222222222",
                    "processing_generation": 1,
                    "source_checksum": "a" * 64,
                    "file_extension": "txt",
                },
                files={"file": ("test.txt", b"Valid text content", "text/plain")},
            )
            assert response.status_code == 401
            assert response.json()["detail"]["error_code"] == "UNAUTHORIZED_SERVICE"

    @pytest.mark.asyncio
    async def test_successful_processing_internal_call(self):
        transport = ASGITransport(app=app)
        token = settings.AI_SERVICE_INTERNAL_TOKEN

        mock_response = ProcessDocumentResponse(
            success=True,
            processing_run_id="33333333-3333-3333-3333-333333333333",
            organization_id="22222222-2222-2222-2222-222222222222",
            document_id="11111111-1111-1111-1111-111111111111",
            processing_generation=1,
            status="completed",
            chunk_count=5,
            extracted_char_count=500,
            page_count=1,
            pipeline_version="document-pipeline-v1",
        )

        with patch(
            "app.document_processing.router.document_processing_service.process_document",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/internal/v1/documents/process",
                    headers={"Authorization": f"Bearer {token}"},
                    data={
                        "document_id": "11111111-1111-1111-1111-111111111111",
                        "organization_id": "22222222-2222-2222-2222-222222222222",
                        "processing_generation": 1,
                        "source_checksum": "a" * 64,
                        "file_extension": "txt",
                    },
                    files={"file": ("sample.txt", b"Hello world! This is a test document.", "text/plain")},
                )

                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["document_id"] == "11111111-1111-1111-1111-111111111111"
                assert data["status"] == "completed"
                assert data["chunk_count"] == 5
                assert data["extracted_char_count"] == 500
                assert data["page_count"] == 1
