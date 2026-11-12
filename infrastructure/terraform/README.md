# OpsPilot AI — AWS Terraform Infrastructure as Code

This directory contains the production-grade, modular, variable-driven Terraform configurations for deploying OpsPilot AI on Amazon Web Services (AWS).

---

## 1. Directory Structure

```
infrastructure/terraform/
├── bootstrap/               # One-time S3 state bucket + DynamoDB lock table provisioning
├── modules/                 # Reusable, parameterized infrastructure modules
│   ├── vpc/                 # Multi-AZ VPC, subnets (Public, App, Data), NAT Gateways, S3 Endpoint
│   ├── security_groups/     # Tiered least-privilege security groups
│   ├── s3_frontend/         # S3 static asset bucket + CloudFront OAC distribution
│   ├── s3_documents/        # Private multi-tenant organizational document storage
│   ├── rds_postgres/        # RDS PostgreSQL 16 with custom pgvector parameter group
│   ├── elasticache_redis/   # ElastiCache Redis 7 replication group (BullMQ queues)
│   ├── iam/                 # ECS execution roles, least-privilege task roles, GitHub OIDC
│   ├── secrets/             # AWS Secrets Manager with automatic credential generation
│   ├── alb/                 # Public Application Load Balancer with health checks & routing
│   ├── ecs/                 # ECS Fargate Cluster, Task Definitions, Services & Autoscaling
│   └── cloudwatch/          # Log Groups, Metrics Alarms & SNS Alert Topic
└── environments/            # Environment composition root modules
    ├── dev/                 # Minimal single-NAT, low-memory development environment
    ├── staging/             # Pre-production test environment with single-NAT cost optimization
    └── production/          # High-Availability Multi-AZ, Multi-NAT, Deletion-Protected environment
```

---

## 2. Deployment Prerequisites

1. **AWS CLI & Terraform**:
   - Terraform `>= 1.5.0`
   - AWS CLI v2 configured with IAM credentials for target account.
2. **Container Images in ECR**:
   - `opspilot-api` (built from `apps/api/Dockerfile`)
   - `opspilot-ai-service` (built from `apps/ai-service/Dockerfile`)
3. **One-Time Remote State Bootstrap**:
   ```bash
   cd infrastructure/terraform/bootstrap
   terraform init
   terraform apply
   ```

---

## 3. Provisioning Workflows

> [!WARNING]
> Do not execute `terraform apply` or create billable resources in AWS without explicit authorization from the project owner.

### Validating & Planning (Staging Example)

```bash
cd infrastructure/terraform/environments/staging

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Initialize Terraform (fetches modules and providers)
terraform init

# Validate syntax and configuration
terraform validate

# Inspect dry-run plan
terraform plan
```

---

## 4. Key Security & Operational Invariants

1. **Zero Hardcoded Secrets**: Secrets are randomly generated at bootstrap and managed via AWS Secrets Manager with `lifecycle { ignore_changes = [secret_string] }`.
2. **Keyless GitHub Actions CI/CD**: Uses AWS IAM OpenID Connect (OIDC) federation — no permanent AWS access keys are committed or configured in repository secrets.
3. **Isolated Private Tiers**: RDS, ElastiCache, and Python AI microservices have NO public IP addresses and accept traffic only from authorized security group peers.
4. **pgvector Native Support**: RDS PostgreSQL 16 utilizes a custom DB parameter group setting `shared_preload_libraries = "vector"`.
5. **Cost Optimization**: `single_nat_gateway = true` for dev/staging saves ~$65/month in idle NAT gateway fees compared to multi-AZ production.
