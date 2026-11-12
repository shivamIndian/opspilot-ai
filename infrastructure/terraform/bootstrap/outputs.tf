output "state_bucket_name" {
  description = "Name of the created Terraform state S3 bucket"
  value       = aws_s3_bucket.terraform_state.id
}

output "state_bucket_arn" {
  description = "ARN of the created Terraform state S3 bucket"
  value       = aws_s3_bucket.terraform_state.arn
}

output "lock_table_name" {
  description = "Name of the DynamoDB state locking table"
  value       = aws_dynamodb_table.terraform_locks.id
}
