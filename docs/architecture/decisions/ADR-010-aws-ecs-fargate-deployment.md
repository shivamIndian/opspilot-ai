# ADR-010: AWS ECS Fargate & CloudFront OAC Cloud Deployment

## Status
Accepted

## Context
Deploying OpsPilot AI to AWS requires high availability, minimal server management overhead, containerized isolation, strict least-privilege network routing, and keyless CI/CD.

## Decision
We standardized on:
1. React SPA: Amazon S3 static hosting with CloudFront CDN using Origin Access Control (OAC).
2. Backend & AI Microservices: Amazon ECS with AWS Fargate in private VPC subnets.
3. Internal Discovery: AWS Cloud Map private DNS (`opspilot.internal`).
4. Database & Cache: Amazon RDS for PostgreSQL 16 (pgvector) and Amazon ElastiCache for Redis 7.
5. Infrastructure as Code: Modular, environment-separated Terraform (`dev`, `staging`, `production`).
6. CI/CD: Keyless GitHub Actions deployment via IAM OpenID Connect (OIDC) federation.

## Consequences
- Serverless container execution (no EC2 patching or OS management).
- Private subnet isolation with zero public IP exposure for databases or AI services.
- Deterministic, repeatable deployments across development, staging, and production.
