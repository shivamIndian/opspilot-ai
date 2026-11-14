--
-- PostgreSQL database dump
--

\restrict X3S3mvWQ1ka2YfpERhpJMAinwp1Cwo6qEqjUrOBcmeMQk4hSBUI3lDLOTeYrNX8

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ai; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA ai;


--
-- Name: SCHEMA ai; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA ai IS 'OpsPilot Cognitive Engine & Vector Embeddings Domain';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_conversation_summaries; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.agent_conversation_summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    conversation_id character varying(255) NOT NULL,
    summary text NOT NULL,
    summary_hash character varying(64) NOT NULL,
    message_count integer DEFAULT 0 NOT NULL,
    summary_version character varying(50) DEFAULT 'v1.0'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: agent_memories; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.agent_memories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    memory_type character varying(50) NOT NULL,
    category character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    content_hash character varying(64) NOT NULL,
    importance_score smallint DEFAULT '5'::smallint NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    source_type character varying(50),
    source_reference uuid,
    consent_version character varying(50) DEFAULT 'v1.0'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: agent_memory_embeddings; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.agent_memory_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    memory_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    model character varying(150) NOT NULL,
    dimensions integer NOT NULL,
    embedding_space character varying(255) NOT NULL,
    embedding double precision[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: agent_memory_events; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.agent_memory_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    memory_id uuid,
    event_type character varying(100) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: agent_memory_settings; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.agent_memory_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    memory_enabled boolean DEFAULT false NOT NULL,
    memory_extraction_enabled boolean DEFAULT false NOT NULL,
    episodic_memory_enabled boolean DEFAULT false NOT NULL,
    retention_days integer,
    consent_version character varying(50) DEFAULT 'v1.0'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: agent_tool_executions; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.agent_tool_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    request_id character varying(128) NOT NULL,
    execution_id character varying(128) NOT NULL,
    tool_name character varying(64) NOT NULL,
    risk_level character varying(32) NOT NULL,
    execution_status character varying(32) NOT NULL,
    input_hash character varying(64),
    output_summary text,
    duration_ms double precision,
    error_code character varying(64),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_workflow_runs; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.agent_workflow_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id character varying(128) NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    request_id character varying(128) NOT NULL,
    workflow_name character varying(100) DEFAULT 'opspilot_support_workflow'::character varying NOT NULL,
    workflow_version character varying(50) DEFAULT 'v1.0'::character varying NOT NULL,
    status character varying(50) DEFAULT 'queued'::character varying NOT NULL,
    intent character varying(100),
    selected_tool character varying(100),
    requires_approval boolean DEFAULT false NOT NULL,
    proposal_id uuid,
    error_code character varying(100),
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    current_step character varying(100),
    total_steps integer DEFAULT 0 NOT NULL,
    completed_steps_count integer DEFAULT 0 NOT NULL,
    tool_call_count integer DEFAULT 0 NOT NULL,
    replan_count integer DEFAULT 0 NOT NULL,
    execution_summary text,
    final_response text,
    citations jsonb DEFAULT '[]'::jsonb NOT NULL,
    action_proposals jsonb DEFAULT '[]'::jsonb NOT NULL,
    duration_ms double precision
);


--
-- Name: alembic_version; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.alembic_version (
    version_num character varying(128) NOT NULL
);


--
-- Name: checkpoint_blobs; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.checkpoint_blobs (
    thread_id text NOT NULL,
    checkpoint_ns text DEFAULT ''::text NOT NULL,
    channel text NOT NULL,
    version text NOT NULL,
    type text NOT NULL,
    blob bytea
);


--
-- Name: checkpoint_migrations; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.checkpoint_migrations (
    v integer NOT NULL
);


--
-- Name: checkpoint_writes; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.checkpoint_writes (
    thread_id text NOT NULL,
    checkpoint_ns text DEFAULT ''::text NOT NULL,
    checkpoint_id text NOT NULL,
    task_id text NOT NULL,
    idx integer NOT NULL,
    channel text NOT NULL,
    type text,
    blob bytea NOT NULL,
    task_path text DEFAULT ''::text NOT NULL
);


--
-- Name: checkpoints; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.checkpoints (
    thread_id text NOT NULL,
    checkpoint_ns text DEFAULT ''::text NOT NULL,
    checkpoint_id text NOT NULL,
    parent_checkpoint_id text,
    type text,
    checkpoint jsonb NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: document_chunk_embeddings; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.document_chunk_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    document_id uuid NOT NULL,
    processing_run_id uuid NOT NULL,
    chunk_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    model character varying(150) NOT NULL,
    dimensions integer NOT NULL,
    embedding_space character varying(255) NOT NULL,
    content_hash character varying(64) NOT NULL,
    embedding double precision[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: document_chunks; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.document_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    document_id uuid NOT NULL,
    processing_run_id uuid NOT NULL,
    chunk_index integer NOT NULL,
    content text NOT NULL,
    content_hash character varying(64) NOT NULL,
    char_start bigint,
    char_end bigint,
    page_start integer,
    page_end integer,
    section_title text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, COALESCE(content, ''::text))) STORED
);


--
-- Name: document_processing_runs; Type: TABLE; Schema: ai; Owner: -
--

CREATE TABLE ai.document_processing_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    document_id uuid NOT NULL,
    processing_generation integer NOT NULL,
    pipeline_version character varying(100) NOT NULL,
    source_checksum character varying(64) NOT NULL,
    status character varying(30) NOT NULL,
    extraction_method character varying(50),
    page_count integer,
    extracted_char_count bigint,
    chunk_count integer DEFAULT 0 NOT NULL,
    error_code character varying(100),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: agent_conversation_summaries agent_conversation_summaries_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.agent_conversation_summaries
    ADD CONSTRAINT agent_conversation_summaries_pkey PRIMARY KEY (id);


--
-- Name: agent_memories agent_memories_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.agent_memories
    ADD CONSTRAINT agent_memories_pkey PRIMARY KEY (id);


--
-- Name: agent_memory_embeddings agent_memory_embeddings_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.agent_memory_embeddings
    ADD CONSTRAINT agent_memory_embeddings_pkey PRIMARY KEY (id);


--
-- Name: agent_memory_events agent_memory_events_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.agent_memory_events
    ADD CONSTRAINT agent_memory_events_pkey PRIMARY KEY (id);


--
-- Name: agent_memory_settings agent_memory_settings_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.agent_memory_settings
    ADD CONSTRAINT agent_memory_settings_pkey PRIMARY KEY (id);


--
-- Name: agent_tool_executions agent_tool_executions_execution_id_key; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.agent_tool_executions
    ADD CONSTRAINT agent_tool_executions_execution_id_key UNIQUE (execution_id);


--
-- Name: agent_tool_executions agent_tool_executions_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.agent_tool_executions
    ADD CONSTRAINT agent_tool_executions_pkey PRIMARY KEY (id);


--
-- Name: agent_workflow_runs agent_workflow_runs_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.agent_workflow_runs
    ADD CONSTRAINT agent_workflow_runs_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.alembic_version
    ADD CONSTRAINT alembic_version_pkey PRIMARY KEY (version_num);


--
-- Name: checkpoint_blobs checkpoint_blobs_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.checkpoint_blobs
    ADD CONSTRAINT checkpoint_blobs_pkey PRIMARY KEY (thread_id, checkpoint_ns, channel, version);


--
-- Name: checkpoint_migrations checkpoint_migrations_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.checkpoint_migrations
    ADD CONSTRAINT checkpoint_migrations_pkey PRIMARY KEY (v);


--
-- Name: checkpoint_writes checkpoint_writes_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.checkpoint_writes
    ADD CONSTRAINT checkpoint_writes_pkey PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx);


--
-- Name: checkpoints checkpoints_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.checkpoints
    ADD CONSTRAINT checkpoints_pkey PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id);


--
-- Name: document_chunk_embeddings document_chunk_embeddings_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.document_chunk_embeddings
    ADD CONSTRAINT document_chunk_embeddings_pkey PRIMARY KEY (id);


--
-- Name: document_chunks document_chunks_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.document_chunks
    ADD CONSTRAINT document_chunks_pkey PRIMARY KEY (id);


--
-- Name: document_processing_runs document_processing_runs_pkey; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.document_processing_runs
    ADD CONSTRAINT document_processing_runs_pkey PRIMARY KEY (id);


--
-- Name: agent_memory_settings uq_agent_memory_settings_org_user; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.agent_memory_settings
    ADD CONSTRAINT uq_agent_memory_settings_org_user UNIQUE (organization_id, user_id);


--
-- Name: agent_workflow_runs uq_agent_workflow_org_request; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.agent_workflow_runs
    ADD CONSTRAINT uq_agent_workflow_org_request UNIQUE (organization_id, request_id);


--
-- Name: document_chunk_embeddings uq_chunk_embedding_space; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.document_chunk_embeddings
    ADD CONSTRAINT uq_chunk_embedding_space UNIQUE (chunk_id, embedding_space);


--
-- Name: document_chunks uq_doc_chunks_run_chunk_idx; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.document_chunks
    ADD CONSTRAINT uq_doc_chunks_run_chunk_idx UNIQUE (processing_run_id, chunk_index);


--
-- Name: document_processing_runs uq_doc_proc_runs_org_doc_gen; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.document_processing_runs
    ADD CONSTRAINT uq_doc_proc_runs_org_doc_gen UNIQUE (organization_id, document_id, processing_generation);


--
-- Name: agent_memory_embeddings uq_memory_embedding_space; Type: CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.agent_memory_embeddings
    ADD CONSTRAINT uq_memory_embedding_space UNIQUE (memory_id, embedding_space);


--
-- Name: checkpoint_blobs_thread_id_idx; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX checkpoint_blobs_thread_id_idx ON ai.checkpoint_blobs USING btree (thread_id);


--
-- Name: checkpoint_writes_thread_id_idx; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX checkpoint_writes_thread_id_idx ON ai.checkpoint_writes USING btree (thread_id);


--
-- Name: checkpoints_thread_id_idx; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX checkpoints_thread_id_idx ON ai.checkpoints USING btree (thread_id);


--
-- Name: idx_agent_conv_sum_lookup; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_conv_sum_lookup ON ai.agent_conversation_summaries USING btree (organization_id, user_id, conversation_id);


--
-- Name: idx_agent_conv_sum_org_user; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_conv_sum_org_user ON ai.agent_conversation_summaries USING btree (organization_id, user_id);


--
-- Name: idx_agent_mem_emb_org_user; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_mem_emb_org_user ON ai.agent_memory_embeddings USING btree (organization_id, user_id);


--
-- Name: idx_agent_mem_emb_space; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_mem_emb_space ON ai.agent_memory_embeddings USING btree (embedding_space);


--
-- Name: idx_agent_mem_events_created_at; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_mem_events_created_at ON ai.agent_memory_events USING btree (created_at);


--
-- Name: idx_agent_mem_events_org_user; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_mem_events_org_user ON ai.agent_memory_events USING btree (organization_id, user_id);


--
-- Name: idx_agent_mem_events_type; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_mem_events_type ON ai.agent_memory_events USING btree (event_type);


--
-- Name: idx_agent_mem_settings_org_user; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_mem_settings_org_user ON ai.agent_memory_settings USING btree (organization_id, user_id);


--
-- Name: idx_agent_memories_content_hash; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_memories_content_hash ON ai.agent_memories USING btree (organization_id, user_id, content_hash);


--
-- Name: idx_agent_memories_expires_at; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_memories_expires_at ON ai.agent_memories USING btree (expires_at);


--
-- Name: idx_agent_memories_org_user; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_memories_org_user ON ai.agent_memories USING btree (organization_id, user_id);


--
-- Name: idx_agent_memories_org_user_status; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_memories_org_user_status ON ai.agent_memories USING btree (organization_id, user_id, status);


--
-- Name: idx_agent_memories_type; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_memories_type ON ai.agent_memories USING btree (organization_id, user_id, memory_type);


--
-- Name: idx_agent_tool_exec_created_at; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_tool_exec_created_at ON ai.agent_tool_executions USING btree (created_at);


--
-- Name: idx_agent_tool_exec_org_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_tool_exec_org_id ON ai.agent_tool_executions USING btree (organization_id);


--
-- Name: idx_agent_tool_exec_request_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_tool_exec_request_id ON ai.agent_tool_executions USING btree (request_id);


--
-- Name: idx_agent_tool_exec_tool_name; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_tool_exec_tool_name ON ai.agent_tool_executions USING btree (tool_name);


--
-- Name: idx_agent_workflow_runs_created_at; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_workflow_runs_created_at ON ai.agent_workflow_runs USING btree (created_at);


--
-- Name: idx_agent_workflow_runs_org_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_workflow_runs_org_id ON ai.agent_workflow_runs USING btree (organization_id);


--
-- Name: idx_agent_workflow_runs_request_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_workflow_runs_request_id ON ai.agent_workflow_runs USING btree (request_id);


--
-- Name: idx_agent_workflow_runs_status; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_workflow_runs_status ON ai.agent_workflow_runs USING btree (status);


--
-- Name: idx_agent_workflow_runs_thread_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_workflow_runs_thread_id ON ai.agent_workflow_runs USING btree (thread_id);


--
-- Name: idx_agent_workflow_runs_user_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_agent_workflow_runs_user_id ON ai.agent_workflow_runs USING btree (user_id);


--
-- Name: idx_doc_chunks_doc_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_doc_chunks_doc_id ON ai.document_chunks USING btree (document_id);


--
-- Name: idx_doc_chunks_org_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_doc_chunks_org_id ON ai.document_chunks USING btree (organization_id);


--
-- Name: idx_doc_chunks_run_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_doc_chunks_run_id ON ai.document_chunks USING btree (processing_run_id);


--
-- Name: idx_doc_chunks_search_vector; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_doc_chunks_search_vector ON ai.document_chunks USING gin (search_vector);


--
-- Name: idx_doc_embeddings_chunk_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_doc_embeddings_chunk_id ON ai.document_chunk_embeddings USING btree (chunk_id);


--
-- Name: idx_doc_embeddings_doc_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_doc_embeddings_doc_id ON ai.document_chunk_embeddings USING btree (document_id);


--
-- Name: idx_doc_embeddings_org_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_doc_embeddings_org_id ON ai.document_chunk_embeddings USING btree (organization_id);


--
-- Name: idx_doc_embeddings_run_id; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_doc_embeddings_run_id ON ai.document_chunk_embeddings USING btree (processing_run_id);


--
-- Name: idx_doc_embeddings_space; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_doc_embeddings_space ON ai.document_chunk_embeddings USING btree (embedding_space);


--
-- Name: idx_doc_proc_runs_org_doc; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_doc_proc_runs_org_doc ON ai.document_processing_runs USING btree (organization_id, document_id);


--
-- Name: idx_doc_proc_runs_status; Type: INDEX; Schema: ai; Owner: -
--

CREATE INDEX idx_doc_proc_runs_status ON ai.document_processing_runs USING btree (status);


--
-- Name: agent_memory_embeddings agent_memory_embeddings_memory_id_fkey; Type: FK CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.agent_memory_embeddings
    ADD CONSTRAINT agent_memory_embeddings_memory_id_fkey FOREIGN KEY (memory_id) REFERENCES ai.agent_memories(id) ON DELETE CASCADE;


--
-- Name: document_chunk_embeddings fk_chunk_embeddings_chunk; Type: FK CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.document_chunk_embeddings
    ADD CONSTRAINT fk_chunk_embeddings_chunk FOREIGN KEY (chunk_id) REFERENCES ai.document_chunks(id) ON DELETE CASCADE;


--
-- Name: document_chunk_embeddings fk_chunk_embeddings_processing_run; Type: FK CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.document_chunk_embeddings
    ADD CONSTRAINT fk_chunk_embeddings_processing_run FOREIGN KEY (processing_run_id) REFERENCES ai.document_processing_runs(id) ON DELETE CASCADE;


--
-- Name: document_chunks fk_document_chunks_processing_run; Type: FK CONSTRAINT; Schema: ai; Owner: -
--

ALTER TABLE ONLY ai.document_chunks
    ADD CONSTRAINT fk_document_chunks_processing_run FOREIGN KEY (processing_run_id) REFERENCES ai.document_processing_runs(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict X3S3mvWQ1ka2YfpERhpJMAinwp1Cwo6qEqjUrOBcmeMQk4hSBUI3lDLOTeYrNX8

