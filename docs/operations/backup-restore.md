# OpsPilot AI — Backup & Disaster Recovery Guide

## 1. Backup Strategy Overview

| Data Asset | Backup Mechanism | Frequency | Retention Window | Storage Location |
| :--- | :--- | :---: | :---: | :--- |
| **PostgreSQL 16 Database** | AWS RDS Automated Snapshots + Transaction Logs (WAL) | Continuous (WAL) + Daily Snapshots | 30 days (Prod) / 7 days (Staging) | AWS RDS S3 Dedicated Vault |
| **S3 Private Documents** | S3 Bucket Versioning + Cross-Region Replication (Optional) | Continuous on PutObject | 365 days (Noncurrent versions) | S3 Standard-IA |
| **Terraform State** | S3 Versioned Bucket with DynamoDB Lock Table | Every Apply | Permanent versioning | Private S3 State Bucket |
| **Secrets & Keys** | AWS Secrets Manager Version Staging | Automatic on secret rotation | Version histories preserved | AWS Secrets Manager (KMS encrypted) |

---

## 2. Recovery Objectives

- **RPO (Recovery Point Objective)**: `< 5 minutes` (Point-in-time recovery to within 5 minutes of any database failure).
- **RTO (Recovery Time Objective)**: `< 30 minutes` (Restoration of new RDS instance and ECS task redirection).

---

## 3. Database Restoration Procedures

### Point-in-Time Recovery via AWS CLI
```bash
# 1. Restore database instance to a specific target timestamp (UTC)
aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier production-opspilot-postgres \
    --target-db-instance-identifier production-opspilot-postgres-restored \
    --restore-time "2026-11-04T12:00:00Z" \
    --db-subnet-group-name production-opspilot-rds-subnet-group \
    --vpc-security-group-ids sg-xxxxxx

# 2. Verify restored database health
aws rds describe-db-instances \
    --db-instance-identifier production-opspilot-postgres-restored \
    --query "DBInstances[0].DBInstanceStatus"

# 3. Update database URL secret in AWS Secrets Manager
aws secretsmanager update-secret \
    --secret-id production/opspilot/api \
    --secret-string file://updated-api-secret.json

# 4. Force ECS rolling deployment to pick up the restored database
aws ecs update-service \
    --cluster production-opspilot-cluster \
    --service production-opspilot-api-svc \
    --force-new-deployment
```

---

## 4. Disaster Recovery Validation Testing

- Test restore procedures must be validated periodically in a staging environment.
- Never restore directly over a running production database. Always restore to a temporary identifier (`-restored`) and verify schema integrity before cutting over traffic.
