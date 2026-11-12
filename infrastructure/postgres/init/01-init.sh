#!/usr/bin/env bash
set -e

# ==============================================================================
# OpsPilot AI - PostgreSQL & pgvector Infrastructure Initialization
# Executed automatically by PostgreSQL container entrypoint on empty volume.
# ==============================================================================

echo "======================================================================"
echo ">> Initializing OpsPilot AI PostgreSQL Infrastructure (opspilot_db) <<"
echo "======================================================================"

# Ensure environment variables have fallbacks if running manually
POSTGRES_DB="${POSTGRES_DB:-opspilot_db}"
POSTGRES_USER="${POSTGRES_USER:-opspilot_admin}"
API_DB_USER="${API_DB_USER:-opspilot_api}"
API_DB_PASSWORD="${API_DB_PASSWORD:-change_this_api_password}"
AI_DB_USER="${AI_DB_USER:-opspilot_ai}"
AI_DB_PASSWORD="${AI_DB_PASSWORD:-change_this_ai_password}"

echo "[INFO] Target Database: ${POSTGRES_DB}"
echo "[INFO] Provisioning application role: ${API_DB_USER}"
echo "[INFO] Provisioning AI service role: ${AI_DB_USER}"

# Connect as superuser / administrator to perform privileged initialization
psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER}" --dbname "${POSTGRES_DB}" <<-EOSQL
    -- 1. Enable pgvector extension
    CREATE EXTENSION IF NOT EXISTS vector;
    SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

    -- 2. Idempotent Role Creation
    DO \$\$
    BEGIN
        -- Node.js API Application Role
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${API_DB_USER}') THEN
            CREATE ROLE ${API_DB_USER} WITH LOGIN PASSWORD '${API_DB_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
            RAISE NOTICE 'Role % created successfully', '${API_DB_USER}';
        ELSE
            ALTER ROLE ${API_DB_USER} WITH PASSWORD '${API_DB_PASSWORD}';
            RAISE NOTICE 'Role % password updated', '${API_DB_USER}';
        END IF;

        -- Python AI Microservice Role
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${AI_DB_USER}') THEN
            CREATE ROLE ${AI_DB_USER} WITH LOGIN PASSWORD '${AI_DB_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
            RAISE NOTICE 'Role % created successfully', '${AI_DB_USER}';
        ELSE
            ALTER ROLE ${AI_DB_USER} WITH PASSWORD '${AI_DB_PASSWORD}';
            RAISE NOTICE 'Role % password updated', '${AI_DB_USER}';
        END IF;
    END
    \$\$;

    -- 3. Database Connection Grants
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${API_DB_USER};
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${AI_DB_USER};

    -- 4. Harden public schema
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    GRANT USAGE ON SCHEMA public TO ${API_DB_USER}, ${AI_DB_USER};

    -- 5. Create Schema 1: app (Owned by opspilot_api for Core Business & Express backend)
    CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION ${API_DB_USER};
    ALTER ROLE ${API_DB_USER} SET search_path TO app, public;
    GRANT ALL ON SCHEMA app TO ${API_DB_USER};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${API_DB_USER} IN SCHEMA app GRANT ALL ON TABLES TO ${API_DB_USER};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${API_DB_USER} IN SCHEMA app GRANT ALL ON SEQUENCES TO ${API_DB_USER};

    -- 6. Create Schema 2: ai (Owned by opspilot_ai for FastAPI AI microservice & pgvector)
    CREATE SCHEMA IF NOT EXISTS ai AUTHORIZATION ${AI_DB_USER};
    ALTER ROLE ${AI_DB_USER} SET search_path TO ai, public;
    GRANT ALL ON SCHEMA ai TO ${AI_DB_USER};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${AI_DB_USER} IN SCHEMA ai GRANT ALL ON TABLES TO ${AI_DB_USER};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${AI_DB_USER} IN SCHEMA ai GRANT ALL ON SEQUENCES TO ${AI_DB_USER};

    -- 7. Strict Cross-Schema Isolation (Enforce Least Privilege)
    REVOKE ALL ON SCHEMA ai FROM ${API_DB_USER};
    REVOKE ALL ON SCHEMA app FROM ${AI_DB_USER};
EOSQL

echo "[SUCCESS] OpsPilot AI PostgreSQL initialization script executed successfully."
