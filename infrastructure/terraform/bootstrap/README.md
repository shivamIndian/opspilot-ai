# OpsPilot AI — Terraform Remote State Bootstrap

This directory contains the initial bootstrap configuration to create the S3 bucket and DynamoDB locking table required to store remote Terraform state files securely.

## One-Time Initialization Instructions

1. Configure your AWS credentials via AWS CLI or SSO:
   ```bash
   aws configure
   ```

2. Initialize and apply the bootstrap configuration:
   ```bash
   cd infrastructure/terraform/bootstrap
   terraform init
   terraform apply
   ```

3. Note the output values (`state_bucket_name` and `lock_table_name`). These values are referenced in the backend configurations of `dev`, `staging`, and `production`.
