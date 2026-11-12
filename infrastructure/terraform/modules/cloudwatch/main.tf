# CloudWatch Monitoring, Log Groups & Alarms Module - OpsPilot AI
# Centralized observability and proactive anomaly alerting

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}

# ------------------------------------------------------------------------------
# 1. CloudWatch Log Groups
# ------------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.environment}-opspilot-api"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "ai" {
  name              = "/ecs/${var.environment}-opspilot-ai-service"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "workers" {
  name              = "/ecs/${var.environment}-opspilot-workers"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "migrations" {
  name              = "/ecs/${var.environment}-opspilot-migrations"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# ------------------------------------------------------------------------------
# 2. SNS Alert Topic
# ------------------------------------------------------------------------------
resource "aws_sns_topic" "alerts" {
  name = "${var.environment}-opspilot-ops-alerts"

  tags = var.tags
}

# ------------------------------------------------------------------------------
# 3. CloudWatch Metric Alarms
# ------------------------------------------------------------------------------

# API High CPU Alarm
resource "aws_cloudwatch_metric_alarm" "api_cpu_high" {
  alarm_name          = "${var.environment}-api-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Node.js API service CPU utilization exceeds 85% for 2 consecutive periods"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.api_service_name
  }

  tags = var.tags
}

# API High Memory Alarm
resource "aws_cloudwatch_metric_alarm" "api_memory_high" {
  alarm_name          = "${var.environment}-api-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Node.js API service memory utilization exceeds 90%"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.api_service_name
  }

  tags = var.tags
}

# AI Service High CPU Alarm
resource "aws_cloudwatch_metric_alarm" "ai_cpu_high" {
  alarm_name          = "${var.environment}-ai-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Python AI service CPU utilization exceeds 85%"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = var.ai_service_name
  }

  tags = var.tags
}

# ALB 5xx High Error Rate Alarm
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.environment}-alb-high-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB Target Group returned more than 10 5XX errors in 1 minute"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    TargetGroup  = var.alb_target_group_arn_suffix
    LoadBalancer = var.alb_arn_suffix
  }

  tags = var.tags
}

# RDS Low Free Storage Space
resource "aws_cloudwatch_metric_alarm" "rds_storage_low" {
  alarm_name          = "${var.environment}-rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5000000000 # 5 GB in bytes
  alarm_description   = "RDS free storage space is below 5 GB"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_identifier
  }

  tags = var.tags
}
