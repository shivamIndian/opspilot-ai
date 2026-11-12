# VPC Module - OpsPilot AI
# Multi-AZ networking with public, application, and data subnets

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0.0"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-vpc"
  })
}

# ------------------------------------------------------------------------------
# Subnets
# ------------------------------------------------------------------------------

# Public Subnets (for ALB and NAT Gateways)
resource "aws_subnet" "public" {
  count                   = var.az_count
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 4, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-public-${local.azs[count.index]}"
    Type = "Public"
  })
}

# Private Application Subnets (for ECS Fargate Tasks)
resource "aws_subnet" "application" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 4)
  availability_zone = local.azs[count.index]

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-app-${local.azs[count.index]}"
    Type = "Application"
  })
}

# Private Data Subnets (for RDS PostgreSQL and ElastiCache Redis)
resource "aws_subnet" "data" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 4, count.index + 8)
  availability_zone = local.azs[count.index]

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-data-${local.azs[count.index]}"
    Type = "Data"
  })
}

# ------------------------------------------------------------------------------
# Gateways & Routing
# ------------------------------------------------------------------------------

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-igw"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Elastic IPs for NAT Gateway(s)
resource "aws_eip" "nat" {
  count  = var.single_nat_gateway ? 1 : var.az_count
  domain = "vpc"

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-nat-eip-${count.index + 1}"
  })
}

# NAT Gateways
resource "aws_nat_gateway" "nat" {
  count         = var.single_nat_gateway ? 1 : var.az_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-nat-${count.index + 1}"
  })

  depends_on = [aws_internet_gateway.igw]
}

# Private Application Route Tables
resource "aws_route_table" "application" {
  count  = var.az_count
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = var.single_nat_gateway ? aws_nat_gateway.nat[0].id : aws_nat_gateway.nat[count.index].id
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-app-rt-${local.azs[count.index]}"
  })
}

resource "aws_route_table_association" "application" {
  count          = var.az_count
  subnet_id      = aws_subnet.application[count.index].id
  route_table_id = aws_route_table.application[count.index].id
}

# Private Data Route Table (Isolated - no Internet/NAT access)
resource "aws_route_table" "data" {
  vpc_id = aws_vpc.main.id

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-data-rt"
  })
}

resource "aws_route_table_association" "data" {
  count          = var.az_count
  subnet_id      = aws_subnet.data[count.index].id
  route_table_id = aws_route_table.data.id
}

# ------------------------------------------------------------------------------
# DB & Cache Subnet Groups
# ------------------------------------------------------------------------------

resource "aws_db_subnet_group" "rds" {
  name        = "${var.environment}-opspilot-rds-subnet-group"
  description = "Database subnet group for RDS PostgreSQL"
  subnet_ids  = aws_subnet.data[*].id

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-rds-subnet-group"
  })
}

resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.environment}-opspilot-redis-subnet-group"
  description = "ElastiCache subnet group for Redis"
  subnet_ids  = aws_subnet.data[*].id

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-redis-subnet-group"
  })
}

# ------------------------------------------------------------------------------
# Gateway VPC Endpoints for S3 (reduces NAT transfer costs)
# ------------------------------------------------------------------------------

resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat([aws_route_table.public.id], aws_route_table.application[*].id)

  tags = merge(var.tags, {
    Name = "${var.environment}-opspilot-s3-endpoint"
  })
}
