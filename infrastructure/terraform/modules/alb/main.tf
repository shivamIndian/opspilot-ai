# Application Load Balancer Module - OpsPilot AI
# Public ALB with HTTP/HTTPS listeners, health checks, and path routing

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}

resource "aws_lb" "main" {
  name               = "${var.environment}-opspilot-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.public_subnet_ids

  drop_invalid_header_fields = true
  enable_deletion_protection = var.enable_deletion_protection

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-alb"
  })
}

# ------------------------------------------------------------------------------
# 1. Target Group for Node.js API ECS Tasks
# ------------------------------------------------------------------------------
resource "aws_lb_target_group" "api" {
  name        = "${var.environment}-opspilot-api-tg"
  port        = 4000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  deregistration_delay = 30

  health_check {
    enabled             = true
    path                = "/health/live"
    port                = "4000"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-api-tg"
  })
}

# ------------------------------------------------------------------------------
# 2. HTTPS Listener (Active when ACM Certificate is Configured)
# ------------------------------------------------------------------------------
resource "aws_lb_listener" "https" {
  count = var.acm_certificate_arn != null ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  # Default action returns 404 for unrouted paths
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "application/json"
      message_body = "{\"success\":false,\"error\":{\"code\":\"NOT_FOUND\",\"message\":\"Endpoint not found on OpsPilot API Gateway\"}}"
      status_code  = "404"
    }
  }
}

# HTTPS Path Routing Rules: route /api/* and /health/* to Node.js API
resource "aws_lb_listener_rule" "https_api_routing" {
  count = var.acm_certificate_arn != null ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/health/*"]
    }
  }
}

# ------------------------------------------------------------------------------
# 3. HTTP Listener (Port 80)
# ------------------------------------------------------------------------------
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  dynamic "default_action" {
    for_each = var.acm_certificate_arn != null ? [1] : []
    content {
      type = "redirect"
      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = var.acm_certificate_arn == null ? [1] : []
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.api.arn
    }
  }
}
