output "bucket_id" {
  description = "Name of the private documents S3 bucket"
  value       = aws_s3_bucket.documents.id
}

output "bucket_arn" {
  description = "ARN of the private documents S3 bucket"
  value       = aws_s3_bucket.documents.arn
}
