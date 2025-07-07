# ==============================================================================
# Terraform Configuration for FamRemit
# Version: 1.0
# ==============================================================================

# --- Provider Configuration ---
# This tells Terraform we are building our infrastructure on AWS.
# It assumes you have your AWS credentials configured on your machine.
provider "aws" {
  region = "eu-west-2" # London - Should match our Supabase region for best performance
}

# --- S3 Bucket for KYC Documents ---
# This defines our secure, private, encrypted bucket for storing user ID documents.
resource "aws_s3_bucket" "kyc_documents" {
  bucket = "famremit-kyc-documents-prod" # Bucket names must be globally unique

  # Tags help us organize and track costs
  tags = {
    Name        = "FamRemit KYC Documents"
    Project     = "FamRemit"
    Environment = "Production"
  }
}

# --- Bucket-Level Security Settings ---
# Enforce best practices for security and access control.
resource "aws_s3_bucket_public_access_block" "kyc_documents_access_block" {
  bucket = aws_s3_bucket.kyc_documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --- Encryption Configuration ---
# Enforce server-side encryption on all objects uploaded to the bucket.
# We use AWS-managed keys (AES256) for simplicity in this initial setup.
# For SOC 2, we would upgrade this to use our own KMS key.
resource "aws_s3_bucket_server_side_encryption_configuration" "kyc_documents_encryption" {
  bucket = aws_s3_bucket.kyc_documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# --- Web Application Firewall (WAF) ---
# This defines a basic firewall to protect our API endpoint.
# It includes standard rules to block common threats like SQL injection and cross-site scripting.
resource "aws_wafv2_web_acl" "api_firewall" {
  name  = "famremit-api-firewall"
  scope = "REGIONAL" # Use REGIONAL for Application Load Balancers / API Gateway

  default_action {
    allow {}
  }

  # Rule 1: Use an AWS-managed ruleset for common threats
  rule {
    name     = "AWS-Managed-Core-Rule-Set"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "aws-managed-common-rules"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "famremit-api-acl"
    sampled_requests_enabled   = true
  }
}