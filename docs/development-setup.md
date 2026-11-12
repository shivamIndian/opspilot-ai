# OpsPilot AI — Development Environment Setup Guide

Follow this guide to configure your local workstation and launch all three tiers of the OpsPilot AI platform.

---

## 1. Prerequisites & Required Software

Ensure the following runtimes and tools are installed:

| Tool        | Minimum Version | Recommended Version | Verification Command |
| :---------- | :-------------- | :------------------ | :------------------- |
| **Node.js** | `>= 20.0.0`     | `22.x LTS`          | `node -v`            |
| **npm**     | `>= 10.0.0`     | `11.x`              | `npm -v`             |
| **Python**  | `>= 3.11.0`     | `3.11.9`            | `python --version`   |
| **uv**      | `>= 0.4.0`      | `0.13.x`            | `uv --version`       |
| **Git**     | `>= 2.38.0`     | `Latest`            | `git --version`      |

---

## 2. Installing `uv` (Astral Python Package Manager)

If `uv` is not present on your system, install it using the recommended method:

### Windows (PowerShell)

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
# Or via pip if Python Scripts are already in PATH:
python -m pip install uv
```

### macOS / Linux

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Verify the installation:

```bash
uv --version
```

---

## 3. Repository Installation

Clone the repository and enter the project root:

```bash
git clone <repo-url> opspilot-ai
cd opspilot-ai
```

### Step 3.1: Install Node.js Workspaces (Frontend & Core API)

From the `opspilot-ai` root directory:

```bash
npm install
```

This installs root developer tools and all dependencies for both `@opspilot/web` and `@opspilot/api` via npm workspaces.

### Step 3.2: Install Python AI Microservice Dependencies

From the `opspilot-ai` root directory:

```bash
uv sync --project apps/ai-service --extra dev
```

`uv` will automatically create an isolated `.venv` inside `apps/ai-service/` and install all production and development dependencies.

---

## 4. Environment Configuration

Copy the example environment files to their active `.env` locations:

```bash
# Web Frontend
cp apps/web/.env.example apps/web/.env

# Core API Backend
cp apps/api/.env.example apps/api/.env

# AI Microservice
cp apps/ai-service/.env.example apps/ai-service/.env
```

### Environment Variable Defaults

#### Web Frontend (`apps/web/.env`)

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

#### Core API Backend (`apps/api/.env`)

```env
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5173
AI_SERVICE_URL=http://localhost:8000
```

#### AI Microservice (`apps/ai-service/.env`)

```env
APP_ENV=development
APP_HOST=127.0.0.1
APP_PORT=8000
```

---

## 5. Running the Applications

### Option A: Run All Services Concurrently (Recommended)

From the repository root:

```bash
npm run dev
```

This launches:

- **Web UI** on [http://localhost:5173](http://localhost:5173)
- **Core API** on [http://localhost:4000](http://localhost:4000)
- **AI Microservice** on [http://localhost:8000](http://localhost:8000)

---

### Option B: Run Services Independently

#### 1. Web Frontend

```bash
npm run dev:web
# Or directly from apps/web:
cd apps/web && npm run dev
```

Accessible at: `http://localhost:5173`

#### 2. Core API Backend

```bash
npm run dev:api
# Or directly from apps/api:
cd apps/api && npm run dev
```

Accessible at: `http://localhost:4000/api/v1/health`

#### 3. Python AI Microservice

```bash
npm run dev:ai
# Or directly with uv:
uv run --project apps/ai-service uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Accessible at: `http://localhost:8000/health`  
Interactive Swagger docs: `http://localhost:8000/docs`

---

## 6. Verification & Quality Commands

```bash
# Run type check across TypeScript applications
npm run typecheck

# Run linters
npm run lint

# Run unit tests
npm run test

# Check code formatting with Prettier
npm run format:check
```

---

## 7. Troubleshooting Common Problems

### Port Conflicts (EADDRINUSE)

- **Symptom**: `Error: listen EADDRINUSE: address already in use :::4000` or `:::8000`
- **Solution**: Identify the process occupying the port and terminate it:
  - Windows: `Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process -Force`
  - macOS/Linux: `lsof -ti:4000 | xargs kill -9`

### uv Command Not Found

- **Symptom**: `uv : The term 'uv' is not recognized`
- **Solution**: Ensure your Python `Scripts` directory or `~/.local/bin` is present in your system `PATH` environment variable. Alternatively, execute via `python -m uv`.

### CORS Rejection in Browser

- **Symptom**: `Access to XMLHttpRequest at 'http://localhost:4000' from origin 'http://localhost:5173' has been blocked by CORS policy`
- **Solution**: Confirm that `FRONTEND_URL` in `apps/api/.env` exactly matches the port and origin of the frontend (`http://localhost:5173`).
