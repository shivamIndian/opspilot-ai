# OpsPilot AI – Retrieval Ranking & Reciprocal Rank Fusion (RRF)

## 1. Reciprocal Rank Fusion (RRF) Formula

Cosine similarity scores (e.g. 0.85) and full-text ranking scores (e.g. 0.05 from `ts_rank_cd`) belong to entirely different scale distributions. Combining them directly by linear addition leads to severe calibration skew.

OpsPilot AI uses **Reciprocal Rank Fusion (RRF)**, which relies purely on ordinal rank positions:

$$\text{RRF Score}(c) = \frac{W_{\text{semantic}}}{K + r_{\text{semantic}}(c)} + \frac{W_{\text{keyword}}}{K + r_{\text{keyword}}(c)}$$

Where:

- $r_{\text{semantic}}(c) \in \{1, 2, 3, \dots\}$ is the 1-based rank position in the semantic vector search results.
- $r_{\text{keyword}}(c) \in \{1, 2, 3, \dots\}$ is the 1-based rank position in the full-text search results.
- $K = 60$ is the standard smoothing constant (configurable via `RRF_K`), preventing top ranks from completely drowning out secondary results.
- $W_{\text{semantic}} = 1.0$ and $W_{\text{keyword}} = 1.0$ (configurable weights).

If a candidate is present in only one branch, the other reciprocal term evaluates to 0.

## 2. Duplicate Chunk Handling & Deduplication

When a chunk appears in both the semantic and keyword result pools:

- The chunk is deduplicated by `chunk_id`.
- The merged RRF score accumulates contributions from both retrieval mechanisms.
- The retrieval method is marked as `"hybrid"`.
- If found by only vector search, it is marked as `"semantic"`.
- If found by only text search, it is marked as `"keyword"`.

## 3. Result Diversity & Over-Fetching

To prevent a single long document from dominating all top results:

- **Over-fetching**: The system retrieves up to `SEMANTIC_CANDIDATE_LIMIT = 50` and `KEYWORD_CANDIDATE_LIMIT = 50` before fusion.
- **Diversity Control (`max_chunks_per_doc`)**: Optional ceiling preventing more than $N$ chunks from any single document unless the total candidate pool is smaller than `top_k`.
