-- ==============================================================================
-- OpsPilot AI - PostgreSQL Application Roles Initialization Script
-- File: infrastructure/postgres/init/01-create-application-roles.sql
-- Description: Safe, idempotent provisioning of least-privilege login roles and
--              schema access controls for OpsPilot AI.
--
-- Supported Execution Methods:
-- 1. Automated Script (Recommended - reads credentials from environment):
--    npm run db:init:local
--
-- 2. Direct psql Execution (with password variables):
--    psql -U postgres -h localhost -p 5432 \
--      -v ON_ERROR_STOP=1 \
--      -v api_db_password='<API_PASSWORD>' \
--      -v ai_db_password='<AI_PASSWORD>' \
--      -f infrastructure/postgres/init/01-create-application-roles.sql
-- ==============================================================================

-- 1. Ensure target database exists
SELECT 'CREATE DATABASE opspilot_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'opspilot_db')\gexec

\c opspilot_db

-- 2. Optional: Enable pgvector extension if available in the PostgreSQL installation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
        CREATE EXTENSION IF NOT EXISTS vector;
        RAISE NOTICE '[INFO] pgvector extension enabled successfully.';
    ELSE
        RAISE NOTICE '[INFO] pgvector extension not installed in this PostgreSQL engine. Skipping extension provisioning.';
    END IF;
END
$$;

-- 3. Idempotent Application Roles Provisioning (Least-Privilege Enforcement)
DO $$
DECLARE
    v_api_pass text := COALESCE(NULLIF(current_setting('opspilot.api_password', true), ''), :'api_db_password');
    v_ai_pass  text := COALESCE(NULLIF(current_setting('opspilot.ai_password', true), ''), :'ai_db_password');
BEGIN
    -- Fallback safety check for password values
    IF v_api_pass IS NULL OR v_api_pass = '' THEN
        v_api_pass := 'change_this_api_password';
    END IF;
    IF v_ai_pass IS NULL OR v_ai_pass = '' THEN
        v_ai_pass := 'change_this_ai_password';
    END IF;

    -- Node.js Express API Role: opspilot_api
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'opspilot_api') THEN
        EXECUTE format(
            'CREATE ROLE opspilot_api WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS',
            v_api_pass
        );
        RAISE NOTICE '[SUCCESS] Role opspilot_api created.';
    ELSE
        EXECUTE format(
            'ALTER ROLE opspilot_api WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS',
            v_api_pass
        );
        RAISE NOTICE '[SUCCESS] Role opspilot_api updated with least-privilege attributes.';
    END IF;

    -- Python FastAPI AI Service Role: opspilot_ai
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'opspilot_ai') THEN
        EXECUTE format(
            'CREATE ROLE opspilot_ai WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS',
            v_ai_pass
        );
        RAISE NOTICE '[SUCCESS] Role opspilot_ai created.';
    ELSE
        EXECUTE format(
            'ALTER ROLE opspilot_ai WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS',
            v_ai_pass
        );
        RAISE NOTICE '[SUCCESS] Role opspilot_ai updated with least-privilege attributes.';
    END IF;
END
$$;

-- 4. Database Connection & Schema Creation Access
GRANT CONNECT, CREATE ON DATABASE opspilot_db TO opspilot_api;
GRANT CONNECT, CREATE ON DATABASE opspilot_db TO opspilot_ai;

-- 5. Harden Public Schema
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO opspilot_api, opspilot_ai;

-- 6. Schema 1: app (Owned by opspilot_api for Core Business & Express backend)
CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION opspilot_api;
ALTER ROLE opspilot_api SET search_path TO app, public;
GRANT USAGE, CREATE ON SCHEMA app TO opspilot_api;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO opspilot_api;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app TO opspilot_api;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA app TO opspilot_api;

-- Default privileges for tables/sequences created in schema app
ALTER DEFAULT PRIVILEGES FOR ROLE opspilot_api IN SCHEMA app GRANT ALL ON TABLES TO opspilot_api;
ALTER DEFAULT PRIVILEGES FOR ROLE opspilot_api IN SCHEMA app GRANT ALL ON SEQUENCES TO opspilot_api;
ALTER DEFAULT PRIVILEGES FOR ROLE opspilot_api IN SCHEMA app GRANT ALL ON ROUTINES TO opspilot_api;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app GRANT ALL ON TABLES TO opspilot_api;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app GRANT ALL ON SEQUENCES TO opspilot_api;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA app GRANT ALL ON ROUTINES TO opspilot_api;

-- 7. Schema 2: ai (Owned by opspilot_ai for FastAPI AI microservice & LangGraph checkpointer)
CREATE SCHEMA IF NOT EXISTS ai AUTHORIZATION opspilot_ai;
ALTER ROLE opspilot_ai SET search_path TO ai, public;
GRANT USAGE, CREATE ON SCHEMA ai TO opspilot_ai;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ai TO opspilot_ai;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ai TO opspilot_ai;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA ai TO opspilot_ai;

-- Default privileges for tables/sequences created in schema ai
ALTER DEFAULT PRIVILEGES FOR ROLE opspilot_ai IN SCHEMA ai GRANT ALL ON TABLES TO opspilot_ai;
ALTER DEFAULT PRIVILEGES FOR ROLE opspilot_ai IN SCHEMA ai GRANT ALL ON SEQUENCES TO opspilot_ai;
ALTER DEFAULT PRIVILEGES FOR ROLE opspilot_ai IN SCHEMA ai GRANT ALL ON ROUTINES TO opspilot_ai;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ai GRANT ALL ON TABLES TO opspilot_ai;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ai GRANT ALL ON SEQUENCES TO opspilot_ai;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ai GRANT ALL ON ROUTINES TO opspilot_ai;

-- 8. Enforce Strict Cross-Schema Isolation (Least Privilege)
REVOKE ALL ON SCHEMA ai FROM opspilot_api;
REVOKE ALL ON SCHEMA app FROM opspilot_ai;
