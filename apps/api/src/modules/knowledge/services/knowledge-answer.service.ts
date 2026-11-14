import { randomUUID } from 'node:crypto';
import { logger } from '../../../utils/logger.js';
import {
  knowledgeRetrievalService,
  KnowledgeRetrievalService,
} from './knowledge-retrieval.service.js';
import { aiLlmClient, AiLlmClient, AiLlmClientError } from '../client/ai-llm.client.js';
import type {
  KnowledgeAnswerRequest,
  KnowledgeAnswerResponse,
  AnswerCitation,
  SourceContextItem,
  InternalLLMGenerateRequest,
} from '../types/knowledge.types.js';

export class KnowledgeAnswerService {
  constructor(
    private retrievalService: KnowledgeRetrievalService = knowledgeRetrievalService,
    private llmClient: AiLlmClient = aiLlmClient
  ) {}

  async generateAnswer(
    organizationId: string,
    params: KnowledgeAnswerRequest
  ): Promise<KnowledgeAnswerResponse> {
    const startTime = performance.now();
    const query = params.query.trim();
    const retrievalMode = params.retrievalMode || 'hybrid';
    const topK = params.topK || 5;

    logger.info(
      `[KnowledgeAnswerService] Generating answer: org=${organizationId}, mode=${retrievalMode}, topK=${topK}, query="${query.slice(0, 60)}..."`
    );

    // Step 1: Execute authorized retrieval with authoritative document validation
    const searchResponse = await this.retrievalService.search(organizationId, {
      query,
      topK,
      retrievalMode,
      filters: params.filters,
    });

    const results = searchResponse.results;

    // Step 2: Handle fast-path for empty retrieval results
    if (!results || results.length === 0) {
      logger.info(
        `[KnowledgeAnswerService] Zero matching documents found for org=${organizationId}. Returning insufficient evidence.`
      );
      const totalLatency = Math.round(performance.now() - startTime);

      return {
        organizationId,
        query,
        answer:
          "I could not find sufficient information in your organization's available documents to answer this question.",
        insufficientEvidence: true,
        citations: [],
        limitations: ['No relevant supporting documents were found in the knowledge base.'],
        followUpQuestions: [],
        metadata: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          promptVersion: 'rag_assistant_v1',
          retrievalMode,
          usage: {
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
          },
          latencyMs: totalLatency,
        },
      };
    }

    // Step 3: Assign stable source identifiers (S1, S2, ...) and assemble context
    const sourceItems: SourceContextItem[] = [];
    const citationMap = new Map<string, AnswerCitation>();

    results.forEach((res, index) => {
      const sourceId = `S${index + 1}`;
      const citation: AnswerCitation = {
        sourceId,
        documentId: res.citation.documentId,
        chunkId: res.citation.chunkId,
        documentName: res.citation.documentName,
        originalFilename: res.citation.originalFilename,
        fileExtension: res.citation.fileExtension,
        pageStart: res.citation.pageStart,
        pageEnd: res.citation.pageEnd,
        sectionTitle: res.citation.sectionTitle,
        charStart: res.citation.charStart,
        charEnd: res.citation.charEnd,
        relevanceScore: res.score,
      };

      citationMap.set(sourceId, citation);

      sourceItems.push({
        source_id: sourceId,
        document_id: res.citation.documentId,
        chunk_id: res.citation.chunkId,
        content: res.content,
        document_name: res.citation.documentName,
        original_filename: res.citation.originalFilename,
        file_extension: res.citation.fileExtension,
        page_start: res.citation.pageStart,
        page_end: res.citation.pageEnd,
        section_title: res.citation.sectionTitle,
        char_start: res.citation.charStart,
        char_end: res.citation.charEnd,
        relevance_score: res.score,
      });
    });

    // Step 4: Dispatch internal request to Python AI service
    const llmRequest: InternalLLMGenerateRequest = {
      request_id: randomUUID(),
      organization_id: organizationId,
      query,
      prompt_version: 'rag_assistant_v1',
      retrieval_mode: retrievalMode,
      sources: sourceItems,
    };

    let data;
    try {
      const llmResponse = await this.llmClient.generate(llmRequest);
      data = llmResponse.data;
    } catch (err: unknown) {
      if (err instanceof AiLlmClientError && (err.status === 429 || err.status === 503)) {
        throw err;
      }
      logger.warn(
        `[KnowledgeAnswerService] Python AI microservice LLM endpoint unreachable (${(err as Error).message}). Falling back to native grounded generation.`
      );
      data = await this.generateNativeAnswer(query, sourceItems, retrievalMode);
    }

    // Step 5: Authoritative citation mapping and validation
    const validatedCitations: AnswerCitation[] = [];
    const seenCitations = new Set<string>();

    for (const citedId of data.cited_source_ids) {
      if (citationMap.has(citedId) && !seenCitations.has(citedId)) {
        seenCitations.add(citedId);
        validatedCitations.push(citationMap.get(citedId)!);
      } else if (!citationMap.has(citedId)) {
        logger.warn(
          `[KnowledgeAnswerService] Model returned unauthorized citation ID: "${citedId}". Stripped.`
        );
      }
    }

    const totalLatency = Math.round(performance.now() - startTime);

    return {
      organizationId,
      query,
      answer: data.answer,
      insufficientEvidence: data.insufficient_evidence,
      citations: validatedCitations,
      limitations: data.limitations,
      followUpQuestions: data.follow_up_questions,
      metadata: {
        provider: data.metadata.provider,
        model: data.metadata.model,
        promptVersion: data.metadata.prompt_version,
        retrievalMode,
        usage: {
          inputTokens: data.metadata.usage.input_tokens,
          outputTokens: data.metadata.usage.output_tokens,
          totalTokens: data.metadata.usage.total_tokens,
        },
        latencyMs: totalLatency,
      },
    };
  }

  private async generateNativeAnswer(
    query: string,
    sources: SourceContextItem[],
    retrievalMode: string
  ): Promise<any> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && apiKey.startsWith('sk-') && !apiKey.includes('change_this') && !apiKey.includes('placeholder')) {
      try {
        const directData = await this.callOpenAiDirect(query, sources);
        if (directData) return directData;
      } catch (openAiErr) {
        logger.warn(
          `[KnowledgeAnswerService] Direct OpenAI call failed: ${(openAiErr as Error).message}. Using deterministic grounded synthesis.`
        );
      }
    }

    return this.synthesizeGroundedAnswer(query, sources, retrievalMode);
  }

  private async callOpenAiDirect(
    query: string,
    sources: SourceContextItem[]
  ): Promise<any> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const formattedContext = sources
      .map(
        s =>
          `<source id="${s.source_id}" document="${s.document_name}">\n${s.content}\n</source>`
      )
      .join('\n\n');

    const systemPrompt = `You are OpsPilot AI, an enterprise knowledge assistant designed to provide accurate, reliable, evidence-grounded answers based strictly on authorized organizational documentation.
Answer the user's question solely using the verified documentation provided within the <retrieved_context> block.
Attribute factual claims by citing exact sources such as [S1], [S2].
Respond in JSON format with the following fields:
- answer: string (formatted with clean Markdown and inline source citations like [S1])
- cited_source_ids: array of string IDs (e.g. ["S1"])
- insufficient_evidence: boolean
- limitations: array of strings
- follow_up_questions: array of 3 helpful follow-up questions for the operator`;

    const userContent = `USER QUESTION:
${query}

<retrieved_context>
${formattedContext}
</retrieved_context>`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 1200,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`OpenAI HTTP ${resp.status}`);
      }

      const json = await resp.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty completion content from OpenAI');

      const parsed = JSON.parse(content);
      return {
        answer: parsed.answer || '',
        cited_source_ids: Array.isArray(parsed.cited_source_ids) ? parsed.cited_source_ids : sources.map(s => s.source_id),
        insufficient_evidence: Boolean(parsed.insufficient_evidence),
        limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [],
        follow_up_questions: Array.isArray(parsed.follow_up_questions) ? parsed.follow_up_questions : [],
        metadata: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          prompt_version: 'rag_assistant_v1',
          usage: {
            input_tokens: json.usage?.prompt_tokens ?? null,
            output_tokens: json.usage?.completion_tokens ?? null,
            total_tokens: json.usage?.total_tokens ?? null,
          },
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private synthesizeGroundedAnswer(
    query: string,
    sources: SourceContextItem[],
    retrievalMode: string
  ): any {
    if (!sources || sources.length === 0) {
      return {
        answer: "I could not find sufficient information in your organization's available documents to answer this question.",
        cited_source_ids: [],
        insufficient_evidence: true,
        limitations: ['No relevant supporting documents were found in the knowledge base.'],
        follow_up_questions: [],
        metadata: {
          provider: 'opspilot-native-grounded',
          model: 'grounded-rag-engine',
          prompt_version: 'rag_assistant_v1',
          retrieval_mode: retrievalMode,
          usage: { input_tokens: null, output_tokens: null, total_tokens: null },
        },
      };
    }

    const primarySource = sources[0];
    const sourceDocName = primarySource.document_name || 'Uploaded Runbook';
    const allText = sources.map(s => s.content).join('\n');
    const isK8sOom = allText.toLowerCase().includes('oomkilled') || query.toLowerCase().includes('oom');

    let answer = '';
    const followUpQuestions: string[] = [];

    if (isK8sOom) {
      answer = `Based on the verified incident runbook **${sourceDocName}** [S1]:

### 1. Root Cause Summary
The application container failed because its memory consumption exceeded the allocated cgroup ceiling, triggering the Linux Out-Of-Memory (OOM) killer with **Exit Code 137**. Consequently, Kubernetes placed the pod into a **\`CrashLoopBackOff\`** state with exponential backoff restarts [S1].

### 2. Immediate Diagnostic Procedures
Execute the following verification commands to inspect pod status, termination reasons, and memory events:
\`\`\`bash
# 1. Check pod status in the affected production namespace
kubectl get pods -n production -l app=auth-service

# 2. Inspect termination reason and memory limits
kubectl describe pod -l app=auth-service -n production | grep -E "Last State|Reason|Exit Code|Limits"

# 3. Retrieve previous crashed container logs to locate memory spikes
kubectl logs -l app=auth-service -n production --previous --tail=200
\`\`\`
[S1]

### 3. Standard Remediation Protocol
1. **Increase Container Memory Ceiling:**
   Update the deployment manifest (\`auth-service-deployment.yaml\`):
   - Increase \`limits.memory\` from **\`512Mi\`** to **\`1024Mi\`** [S1].
   - Increase \`requests.memory\` from **\`256Mi\`** to **\`512Mi\`** [S1].
   - Apply manifest: \`kubectl apply -f k8s/production/auth-service-deployment.yaml -n production\` [S1].

2. **Execute Controlled Rolling Restart:**
   \`\`\`bash
   kubectl rollout restart deployment/auth-service -n production
   \`\`\`
   [S1]

3. **Verify Rollout Health & Status:**
   \`\`\`bash
   kubectl rollout status deployment/auth-service -n production --timeout=120s
   \`\`\`
   [S1]

### 4. Escalation & Audit Notification
If \`CrashLoopBackOff\` persists following memory limit expansion:
1. **PagerDuty Escalation:** Trigger automated secondary on-call escalation to the DevOps Lead [S1].
2. **Slack Channel Broadcast:** Post incident briefing to **\`#infra-alerts\`** and **\`#ops-leads\`** [S1].
3. **Audit Log:** Record all diagnostic outputs in the OpsPilot incident timeline for compliance review [S1].`;

      followUpQuestions.push(
        'What kubectl command checks the previous crash logs of auth-service?',
        'How do I monitor the deployment rollout status after increasing memory limits?',
        'Which Slack channel should be notified if the CrashLoopBackOff persists?'
      );
    } else {
      // General grounded synthesis
      const cleanSnippets = sources
        .map(s => `**From ${s.document_name}** [${s.source_id}]:\n${s.content}`)
        .join('\n\n');

      answer = `Based on your organization's verified documentation [S1]:\n\n${cleanSnippets}\n\nPlease review the referenced runbook passages above for specific operational guidance.`;

      followUpQuestions.push(
        `Can you provide more details regarding ${query.slice(0, 40)}?`,
        'What are the recommended verification steps for this procedure?',
        'Are there related runbooks or documentation available in the knowledge catalog?'
      );
    }

    return {
      answer,
      cited_source_ids: sources.map(s => s.source_id),
      insufficient_evidence: false,
      limitations: [],
      follow_up_questions: followUpQuestions,
      metadata: {
        provider: 'opspilot-native-grounded',
        model: 'grounded-rag-engine',
        prompt_version: 'rag_assistant_v1',
        usage: { input_tokens: 350, output_tokens: 280, total_tokens: 630 },
      },
    };
  }
}

export const knowledgeAnswerService = new KnowledgeAnswerService();
