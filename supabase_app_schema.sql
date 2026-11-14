--
-- PostgreSQL database dump
--

\restrict XHgHo1Uu7bdPRfAdRT4MeLabJIGRijNMMLZwhDLormBZvHyQJhebiY6pIY1Nv2s

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
-- Name: app; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA app;


--
-- Name: SCHEMA app; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA app IS 'OpsPilot Core Business & API Data Domain';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_action_approvals; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.agent_action_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    decision character varying(16) NOT NULL,
    decided_by uuid NOT NULL,
    decision_reason text,
    decided_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_approval_decision CHECK (((decision)::text = ANY ((ARRAY['approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: agent_action_executions; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.agent_action_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    executed_by uuid NOT NULL,
    execution_status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    target_entity_type character varying(64),
    target_entity_id character varying(128),
    execution_result jsonb,
    error_details jsonb,
    idempotency_key character varying(128) NOT NULL,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT chk_execution_status CHECK (((execution_status)::text = ANY ((ARRAY['pending'::character varying, 'success'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: agent_action_proposals; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.agent_action_proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    run_id character varying(128) NOT NULL,
    thread_id character varying(128) NOT NULL,
    requested_by uuid NOT NULL,
    action_type character varying(64) NOT NULL,
    tool_name character varying(64) NOT NULL,
    risk_level character varying(16) DEFAULT 'medium'::character varying NOT NULL,
    proposal_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(32) DEFAULT 'awaiting_approval'::character varying NOT NULL,
    justification text,
    policy_snapshot jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone,
    CONSTRAINT chk_proposal_risk CHECK (((risk_level)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT chk_proposal_status CHECK (((status)::text = ANY ((ARRAY['awaiting_approval'::character varying, 'approved'::character varying, 'rejected'::character varying, 'executed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: agent_workflow_outbox; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.agent_workflow_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    event_type character varying(64) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(16) DEFAULT 'pending'::character varying NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 5 NOT NULL,
    last_error text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    processed_at timestamp with time zone,
    next_attempt_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_outbox_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: auth_audit_logs; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.auth_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    event_type character varying(100) NOT NULL,
    ip_address inet,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: conversation_messages; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.conversation_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    role character varying(32) NOT NULL,
    content text NOT NULL,
    citations jsonb DEFAULT '[]'::jsonb NOT NULL,
    tool_calls jsonb DEFAULT '[]'::jsonb NOT NULL,
    action_proposals jsonb DEFAULT '[]'::jsonb NOT NULL,
    telemetry jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(32) DEFAULT 'completed'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_message_role CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying, 'system'::character varying])::text[]))),
    CONSTRAINT chk_message_status CHECK (((status)::text = ANY ((ARRAY['sending'::character varying, 'streaming'::character varying, 'completed'::character varying, 'failed'::character varying, 'waiting_approval'::character varying])::text[])))
);


--
-- Name: conversations; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) DEFAULT 'New Conversation'::character varying NOT NULL,
    thread_id character varying(128) NOT NULL,
    status character varying(32) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT chk_conversation_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying, 'deleted'::character varying])::text[])))
);


--
-- Name: documents; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    uploaded_by_user_id uuid NOT NULL,
    original_filename character varying(255) NOT NULL,
    display_name character varying(255) NOT NULL,
    description text,
    file_extension character varying(20) NOT NULL,
    mime_type character varying(150) NOT NULL,
    size_bytes bigint NOT NULL,
    sha256_checksum character varying(64) NOT NULL,
    storage_provider character varying(30) DEFAULT 'local'::character varying NOT NULL,
    storage_key text NOT NULL,
    status character varying(30) DEFAULT 'active'::character varying NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    archived_at timestamp with time zone,
    processing_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    processing_generation integer DEFAULT 1 NOT NULL,
    processing_pipeline_version character varying(100),
    processing_attempts integer DEFAULT 0 NOT NULL,
    page_count integer,
    extracted_char_count bigint,
    chunk_count integer DEFAULT 0 NOT NULL,
    processing_error_code character varying(100),
    processed_at timestamp with time zone,
    processing_started_at timestamp with time zone,
    processing_updated_at timestamp with time zone,
    embedding_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    embedding_generation integer DEFAULT 0 NOT NULL,
    embedding_provider character varying(50),
    embedding_model character varying(150),
    embedding_dimensions integer,
    embedded_chunk_count integer DEFAULT 0 NOT NULL,
    embedding_error_code character varying(100),
    embedding_started_at timestamp with time zone,
    embedded_at timestamp with time zone,
    embedding_updated_at timestamp with time zone,
    CONSTRAINT chk_document_chunk_count CHECK ((chunk_count >= 0)),
    CONSTRAINT chk_document_embedded_chunk_count CHECK ((embedded_chunk_count >= 0)),
    CONSTRAINT chk_document_embedding_generation CHECK ((embedding_generation >= 0)),
    CONSTRAINT chk_document_embedding_status CHECK (((embedding_status)::text = ANY ((ARRAY['pending'::character varying, 'queued'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'skipped'::character varying])::text[]))),
    CONSTRAINT chk_document_extension CHECK (((file_extension)::text = ANY ((ARRAY['pdf'::character varying, 'docx'::character varying, 'txt'::character varying, 'md'::character varying])::text[]))),
    CONSTRAINT chk_document_processing_attempts CHECK ((processing_attempts >= 0)),
    CONSTRAINT chk_document_processing_generation CHECK ((processing_generation >= 1)),
    CONSTRAINT chk_document_processing_status CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'queued'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[]))),
    CONSTRAINT chk_document_size CHECK ((size_bytes > 0)),
    CONSTRAINT chk_document_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT chk_document_storage_provider CHECK (((storage_provider)::text = ANY ((ARRAY['local'::character varying, 's3'::character varying])::text[])))
);


--
-- Name: email_verification_tokens; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.email_verification_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: organization_audit_logs; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.organization_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    actor_user_id uuid,
    action character varying(100) NOT NULL,
    target_type character varying(100),
    target_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: organization_invitations; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.organization_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    token_hash text NOT NULL,
    invited_by uuid NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_org_invitation_role CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'member'::character varying])::text[]))),
    CONSTRAINT chk_org_invitation_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'expired'::character varying, 'revoked'::character varying])::text[])))
);


--
-- Name: organization_members; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_org_member_role CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying])::text[]))),
    CONSTRAINT chk_org_member_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'removed'::character varying])::text[])))
);


--
-- Name: organization_ticket_counters; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.organization_ticket_counters (
    organization_id uuid NOT NULL,
    last_ticket_number bigint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    logo_url text,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_org_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'archived'::character varying])::text[])))
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: pgmigrations; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.pgmigrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    run_on timestamp without time zone NOT NULL
);


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE; Schema: app; Owner: -
--

CREATE SEQUENCE app.pgmigrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pgmigrations_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: -
--

ALTER SEQUENCE app.pgmigrations_id_seq OWNED BY app.pgmigrations.id;


--
-- Name: ticket_activity_logs; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.ticket_activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    actor_user_id uuid,
    action character varying(100) NOT NULL,
    old_values jsonb,
    new_values jsonb,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ticket_comments; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.ticket_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    author_user_id uuid NOT NULL,
    body text NOT NULL,
    visibility character varying(20) DEFAULT 'public'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT chk_comment_visibility CHECK (((visibility)::text = ANY ((ARRAY['public'::character varying, 'internal'::character varying])::text[])))
);


--
-- Name: tickets; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    ticket_number bigint NOT NULL,
    subject character varying(200) NOT NULL,
    description text NOT NULL,
    category character varying(50) NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    status character varying(30) DEFAULT 'open'::character varying NOT NULL,
    created_by_user_id uuid NOT NULL,
    assigned_to_user_id uuid,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    archived_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_ticket_category CHECK (((category)::text = ANY ((ARRAY['technical_support'::character varying, 'account_access'::character varying, 'bug_report'::character varying, 'billing'::character varying, 'feature_request'::character varying, 'general'::character varying])::text[]))),
    CONSTRAINT chk_ticket_priority CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT chk_ticket_status CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'waiting_on_customer'::character varying, 'resolved'::character varying, 'closed'::character varying])::text[])))
);


--
-- Name: user_sessions; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    token_family_id uuid NOT NULL,
    user_agent text,
    ip_address inet,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    replaced_by_session_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_used_at timestamp with time zone
);


--
-- Name: users; Type: TABLE; Schema: app; Owner: -
--

CREATE TABLE app.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    platform_role character varying(50) DEFAULT 'user'::character varying NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    email_verified_at timestamp with time zone,
    password_changed_at timestamp with time zone,
    last_login_at timestamp with time zone,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_platform_role CHECK (((platform_role)::text = ANY ((ARRAY['user'::character varying, 'platform_admin'::character varying])::text[]))),
    CONSTRAINT chk_user_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying])::text[])))
);


--
-- Name: pgmigrations id; Type: DEFAULT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.pgmigrations ALTER COLUMN id SET DEFAULT nextval('app.pgmigrations_id_seq'::regclass);


--
-- Name: agent_action_approvals agent_action_approvals_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_approvals
    ADD CONSTRAINT agent_action_approvals_pkey PRIMARY KEY (id);


--
-- Name: agent_action_executions agent_action_executions_idempotency_key_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_executions
    ADD CONSTRAINT agent_action_executions_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: agent_action_executions agent_action_executions_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_executions
    ADD CONSTRAINT agent_action_executions_pkey PRIMARY KEY (id);


--
-- Name: agent_action_executions agent_action_executions_proposal_id_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_executions
    ADD CONSTRAINT agent_action_executions_proposal_id_key UNIQUE (proposal_id);


--
-- Name: agent_action_proposals agent_action_proposals_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_proposals
    ADD CONSTRAINT agent_action_proposals_pkey PRIMARY KEY (id);


--
-- Name: agent_workflow_outbox agent_workflow_outbox_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_workflow_outbox
    ADD CONSTRAINT agent_workflow_outbox_pkey PRIMARY KEY (id);


--
-- Name: auth_audit_logs auth_audit_logs_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.auth_audit_logs
    ADD CONSTRAINT auth_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: conversation_messages conversation_messages_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.conversation_messages
    ADD CONSTRAINT conversation_messages_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: documents documents_storage_key_key; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.documents
    ADD CONSTRAINT documents_storage_key_key UNIQUE (storage_key);


--
-- Name: email_verification_tokens email_verification_tokens_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_pkey PRIMARY KEY (id);


--
-- Name: organization_audit_logs organization_audit_logs_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_audit_logs
    ADD CONSTRAINT organization_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: organization_invitations organization_invitations_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_invitations
    ADD CONSTRAINT organization_invitations_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organization_ticket_counters organization_ticket_counters_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_ticket_counters
    ADD CONSTRAINT organization_ticket_counters_pkey PRIMARY KEY (organization_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: pgmigrations pgmigrations_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.pgmigrations
    ADD CONSTRAINT pgmigrations_pkey PRIMARY KEY (id);


--
-- Name: ticket_activity_logs ticket_activity_logs_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.ticket_activity_logs
    ADD CONSTRAINT ticket_activity_logs_pkey PRIMARY KEY (id);


--
-- Name: ticket_comments ticket_comments_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.ticket_comments
    ADD CONSTRAINT ticket_comments_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tickets uq_tickets_org_number; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.tickets
    ADD CONSTRAINT uq_tickets_org_number UNIQUE (organization_id, ticket_number);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_agent_approvals_decided_by; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_approvals_decided_by ON app.agent_action_approvals USING btree (decided_by);


--
-- Name: idx_agent_approvals_org_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_approvals_org_id ON app.agent_action_approvals USING btree (organization_id);


--
-- Name: idx_agent_approvals_proposal_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_approvals_proposal_id ON app.agent_action_approvals USING btree (proposal_id);


--
-- Name: idx_agent_executions_idempotency; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_executions_idempotency ON app.agent_action_executions USING btree (idempotency_key);


--
-- Name: idx_agent_executions_org_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_executions_org_id ON app.agent_action_executions USING btree (organization_id);


--
-- Name: idx_agent_executions_proposal_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_executions_proposal_id ON app.agent_action_executions USING btree (proposal_id);


--
-- Name: idx_agent_outbox_org_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_outbox_org_id ON app.agent_workflow_outbox USING btree (organization_id);


--
-- Name: idx_agent_outbox_pending; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_outbox_pending ON app.agent_workflow_outbox USING btree (status, next_attempt_at) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying])::text[]));


--
-- Name: idx_agent_outbox_proposal_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_outbox_proposal_id ON app.agent_workflow_outbox USING btree (proposal_id);


--
-- Name: idx_agent_proposals_org_created; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_proposals_org_created ON app.agent_action_proposals USING btree (organization_id, created_at DESC);


--
-- Name: idx_agent_proposals_org_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_proposals_org_id ON app.agent_action_proposals USING btree (organization_id);


--
-- Name: idx_agent_proposals_org_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_proposals_org_status ON app.agent_action_proposals USING btree (organization_id, status);


--
-- Name: idx_agent_proposals_requested_by; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_proposals_requested_by ON app.agent_action_proposals USING btree (requested_by);


--
-- Name: idx_agent_proposals_run_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_proposals_run_id ON app.agent_action_proposals USING btree (run_id);


--
-- Name: idx_agent_proposals_thread_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_agent_proposals_thread_id ON app.agent_action_proposals USING btree (thread_id);


--
-- Name: idx_auth_audit_logs_created_at; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_auth_audit_logs_created_at ON app.auth_audit_logs USING btree (created_at DESC);


--
-- Name: idx_auth_audit_logs_event_type; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_auth_audit_logs_event_type ON app.auth_audit_logs USING btree (event_type);


--
-- Name: idx_auth_audit_logs_user_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_auth_audit_logs_user_id ON app.auth_audit_logs USING btree (user_id);


--
-- Name: idx_conv_messages_conv_created; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_conv_messages_conv_created ON app.conversation_messages USING btree (conversation_id, created_at);


--
-- Name: idx_conv_messages_org; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_conv_messages_org ON app.conversation_messages USING btree (organization_id);


--
-- Name: idx_conversations_org_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_conversations_org_status ON app.conversations USING btree (organization_id, status);


--
-- Name: idx_conversations_org_user; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_conversations_org_user ON app.conversations USING btree (organization_id, user_id, updated_at DESC);


--
-- Name: idx_conversations_thread_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_conversations_thread_id ON app.conversations USING btree (thread_id);


--
-- Name: idx_documents_checksum; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_checksum ON app.documents USING btree (sha256_checksum);


--
-- Name: idx_documents_created_at; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_created_at ON app.documents USING btree (created_at DESC);


--
-- Name: idx_documents_emb_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_emb_status ON app.documents USING btree (embedding_status);


--
-- Name: idx_documents_org_created_at; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_org_created_at ON app.documents USING btree (organization_id, created_at DESC);


--
-- Name: idx_documents_org_emb_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_org_emb_status ON app.documents USING btree (organization_id, embedding_status);


--
-- Name: idx_documents_org_extension; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_org_extension ON app.documents USING btree (organization_id, file_extension);


--
-- Name: idx_documents_org_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_org_id ON app.documents USING btree (organization_id);


--
-- Name: idx_documents_org_id_emb_gen; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_org_id_emb_gen ON app.documents USING btree (organization_id, id, embedding_generation);


--
-- Name: idx_documents_org_id_generation; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_org_id_generation ON app.documents USING btree (organization_id, id, processing_generation);


--
-- Name: idx_documents_org_proc_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_org_proc_status ON app.documents USING btree (organization_id, processing_status);


--
-- Name: idx_documents_org_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_org_status ON app.documents USING btree (organization_id, status);


--
-- Name: idx_documents_proc_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_proc_status ON app.documents USING btree (processing_status);


--
-- Name: idx_documents_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_status ON app.documents USING btree (status);


--
-- Name: idx_documents_uploader; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_documents_uploader ON app.documents USING btree (uploaded_by_user_id);


--
-- Name: idx_email_verification_tokens_hash; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_email_verification_tokens_hash ON app.email_verification_tokens USING btree (token_hash);


--
-- Name: idx_email_verification_tokens_user_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_email_verification_tokens_user_id ON app.email_verification_tokens USING btree (user_id);


--
-- Name: idx_org_audit_action; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_org_audit_action ON app.organization_audit_logs USING btree (action);


--
-- Name: idx_org_audit_actor; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_org_audit_actor ON app.organization_audit_logs USING btree (actor_user_id);


--
-- Name: idx_org_audit_created_at; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_org_audit_created_at ON app.organization_audit_logs USING btree (created_at DESC);


--
-- Name: idx_org_audit_org_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_org_audit_org_id ON app.organization_audit_logs USING btree (organization_id);


--
-- Name: idx_org_invitations_expires_at; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_org_invitations_expires_at ON app.organization_invitations USING btree (expires_at);


--
-- Name: idx_org_invitations_org_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_org_invitations_org_id ON app.organization_invitations USING btree (organization_id);


--
-- Name: idx_org_invitations_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_org_invitations_status ON app.organization_invitations USING btree (status);


--
-- Name: idx_org_invitations_token_hash; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_org_invitations_token_hash ON app.organization_invitations USING btree (token_hash);


--
-- Name: idx_org_invitations_unique_pending; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX idx_org_invitations_unique_pending ON app.organization_invitations USING btree (organization_id, lower((email)::text)) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_org_members_one_active_owner; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX idx_org_members_one_active_owner ON app.organization_members USING btree (organization_id) WHERE (((role)::text = 'owner'::text) AND ((status)::text = 'active'::text));


--
-- Name: idx_org_members_org_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_org_members_org_id ON app.organization_members USING btree (organization_id);


--
-- Name: idx_org_members_org_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_org_members_org_status ON app.organization_members USING btree (organization_id, status);


--
-- Name: idx_org_members_org_user; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX idx_org_members_org_user ON app.organization_members USING btree (organization_id, user_id);


--
-- Name: idx_org_members_user_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_org_members_user_id ON app.organization_members USING btree (user_id);


--
-- Name: idx_organizations_created_at; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_organizations_created_at ON app.organizations USING btree (created_at DESC);


--
-- Name: idx_organizations_created_by; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_organizations_created_by ON app.organizations USING btree (created_by);


--
-- Name: idx_organizations_slug_lower; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX idx_organizations_slug_lower ON app.organizations USING btree (lower((slug)::text));


--
-- Name: idx_organizations_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_organizations_status ON app.organizations USING btree (status);


--
-- Name: idx_password_reset_tokens_hash; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_password_reset_tokens_hash ON app.password_reset_tokens USING btree (token_hash);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user_id ON app.password_reset_tokens USING btree (user_id);


--
-- Name: idx_ticket_activity_action; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_ticket_activity_action ON app.ticket_activity_logs USING btree (action);


--
-- Name: idx_ticket_activity_actor; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_ticket_activity_actor ON app.ticket_activity_logs USING btree (actor_user_id);


--
-- Name: idx_ticket_activity_org_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_ticket_activity_org_id ON app.ticket_activity_logs USING btree (organization_id);


--
-- Name: idx_ticket_activity_ticket_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_ticket_activity_ticket_id ON app.ticket_activity_logs USING btree (ticket_id, created_at);


--
-- Name: idx_ticket_comments_author; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_ticket_comments_author ON app.ticket_comments USING btree (author_user_id);


--
-- Name: idx_ticket_comments_org_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_ticket_comments_org_id ON app.ticket_comments USING btree (organization_id);


--
-- Name: idx_ticket_comments_ticket_created; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_ticket_comments_ticket_created ON app.ticket_comments USING btree (ticket_id, created_at);


--
-- Name: idx_ticket_comments_ticket_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_ticket_comments_ticket_id ON app.ticket_comments USING btree (ticket_id, created_at);


--
-- Name: idx_ticket_comments_visibility; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_ticket_comments_visibility ON app.ticket_comments USING btree (ticket_id, visibility);


--
-- Name: idx_tickets_created_at; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_tickets_created_at ON app.tickets USING btree (organization_id, created_at DESC);


--
-- Name: idx_tickets_org_archived; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_tickets_org_archived ON app.tickets USING btree (organization_id, archived_at);


--
-- Name: idx_tickets_org_assigned_to; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_tickets_org_assigned_to ON app.tickets USING btree (organization_id, assigned_to_user_id);


--
-- Name: idx_tickets_org_category; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_tickets_org_category ON app.tickets USING btree (organization_id, category);


--
-- Name: idx_tickets_org_created_by; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_tickets_org_created_by ON app.tickets USING btree (organization_id, created_by_user_id);


--
-- Name: idx_tickets_org_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_tickets_org_id ON app.tickets USING btree (organization_id);


--
-- Name: idx_tickets_org_priority; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_tickets_org_priority ON app.tickets USING btree (organization_id, priority);


--
-- Name: idx_tickets_org_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_tickets_org_status ON app.tickets USING btree (organization_id, status);


--
-- Name: idx_tickets_org_status_created; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_tickets_org_status_created ON app.tickets USING btree (organization_id, status, created_at DESC);


--
-- Name: idx_user_sessions_expires_at; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_user_sessions_expires_at ON app.user_sessions USING btree (expires_at);


--
-- Name: idx_user_sessions_family; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_user_sessions_family ON app.user_sessions USING btree (token_family_id);


--
-- Name: idx_user_sessions_token_hash; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_user_sessions_token_hash ON app.user_sessions USING btree (token_hash);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_user_sessions_user_id ON app.user_sessions USING btree (user_id);


--
-- Name: idx_users_email_lower; Type: INDEX; Schema: app; Owner: -
--

CREATE UNIQUE INDEX idx_users_email_lower ON app.users USING btree (lower((email)::text));


--
-- Name: idx_users_platform_role; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_users_platform_role ON app.users USING btree (platform_role);


--
-- Name: idx_users_status; Type: INDEX; Schema: app; Owner: -
--

CREATE INDEX idx_users_status ON app.users USING btree (status);


--
-- Name: agent_action_approvals agent_action_approvals_decided_by_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_approvals
    ADD CONSTRAINT agent_action_approvals_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES app.users(id) ON DELETE RESTRICT;


--
-- Name: agent_action_approvals agent_action_approvals_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_approvals
    ADD CONSTRAINT agent_action_approvals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: agent_action_approvals agent_action_approvals_proposal_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_approvals
    ADD CONSTRAINT agent_action_approvals_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES app.agent_action_proposals(id) ON DELETE CASCADE;


--
-- Name: agent_action_executions agent_action_executions_executed_by_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_executions
    ADD CONSTRAINT agent_action_executions_executed_by_fkey FOREIGN KEY (executed_by) REFERENCES app.users(id) ON DELETE RESTRICT;


--
-- Name: agent_action_executions agent_action_executions_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_executions
    ADD CONSTRAINT agent_action_executions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: agent_action_executions agent_action_executions_proposal_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_executions
    ADD CONSTRAINT agent_action_executions_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES app.agent_action_proposals(id) ON DELETE CASCADE;


--
-- Name: agent_action_proposals agent_action_proposals_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_proposals
    ADD CONSTRAINT agent_action_proposals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: agent_action_proposals agent_action_proposals_requested_by_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_action_proposals
    ADD CONSTRAINT agent_action_proposals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES app.users(id) ON DELETE RESTRICT;


--
-- Name: agent_workflow_outbox agent_workflow_outbox_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_workflow_outbox
    ADD CONSTRAINT agent_workflow_outbox_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: agent_workflow_outbox agent_workflow_outbox_proposal_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.agent_workflow_outbox
    ADD CONSTRAINT agent_workflow_outbox_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES app.agent_action_proposals(id) ON DELETE CASCADE;


--
-- Name: auth_audit_logs auth_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.auth_audit_logs
    ADD CONSTRAINT auth_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE SET NULL;


--
-- Name: conversation_messages conversation_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.conversation_messages
    ADD CONSTRAINT conversation_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES app.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_messages conversation_messages_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.conversation_messages
    ADD CONSTRAINT conversation_messages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: conversation_messages conversation_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.conversation_messages
    ADD CONSTRAINT conversation_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.conversations
    ADD CONSTRAINT conversations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.conversations
    ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- Name: documents documents_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.documents
    ADD CONSTRAINT documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: documents documents_uploaded_by_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.documents
    ADD CONSTRAINT documents_uploaded_by_user_id_fkey FOREIGN KEY (uploaded_by_user_id) REFERENCES app.users(id) ON DELETE RESTRICT;


--
-- Name: email_verification_tokens email_verification_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.email_verification_tokens
    ADD CONSTRAINT email_verification_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- Name: organization_audit_logs organization_audit_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_audit_logs
    ADD CONSTRAINT organization_audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES app.users(id) ON DELETE SET NULL;


--
-- Name: organization_audit_logs organization_audit_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_audit_logs
    ADD CONSTRAINT organization_audit_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_invitations organization_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_invitations
    ADD CONSTRAINT organization_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- Name: organization_invitations organization_invitations_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_invitations
    ADD CONSTRAINT organization_invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- Name: organization_ticket_counters organization_ticket_counters_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organization_ticket_counters
    ADD CONSTRAINT organization_ticket_counters_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_created_by_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.organizations
    ADD CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES app.users(id) ON DELETE RESTRICT;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- Name: ticket_activity_logs ticket_activity_logs_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.ticket_activity_logs
    ADD CONSTRAINT ticket_activity_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES app.users(id) ON DELETE SET NULL;


--
-- Name: ticket_activity_logs ticket_activity_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.ticket_activity_logs
    ADD CONSTRAINT ticket_activity_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: ticket_activity_logs ticket_activity_logs_ticket_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.ticket_activity_logs
    ADD CONSTRAINT ticket_activity_logs_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES app.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_comments ticket_comments_author_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.ticket_comments
    ADD CONSTRAINT ticket_comments_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES app.users(id) ON DELETE RESTRICT;


--
-- Name: ticket_comments ticket_comments_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.ticket_comments
    ADD CONSTRAINT ticket_comments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: ticket_comments ticket_comments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.ticket_comments
    ADD CONSTRAINT ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES app.tickets(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.tickets
    ADD CONSTRAINT tickets_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES app.users(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.tickets
    ADD CONSTRAINT tickets_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES app.users(id) ON DELETE RESTRICT;


--
-- Name: tickets tickets_organization_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.tickets
    ADD CONSTRAINT tickets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES app.organizations(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_replaced_by_session_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.user_sessions
    ADD CONSTRAINT user_sessions_replaced_by_session_id_fkey FOREIGN KEY (replaced_by_session_id) REFERENCES app.user_sessions(id) ON DELETE SET NULL;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: -
--

ALTER TABLE ONLY app.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict XHgHo1Uu7bdPRfAdRT4MeLabJIGRijNMMLZwhDLormBZvHyQJhebiY6pIY1Nv2s

