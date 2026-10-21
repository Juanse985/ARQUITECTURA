# ============================================================================
# ARCHIVO: terraform/MainInfrastructure.tf
# CASO 8: CLOUD NATIVE - INFRAESTRUCTURA COMO CÓDIGO (IaC) MULTI-ZONA (3 AZs)
# ============================================================================

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

provider "aws" {
  region = var.awsRegion
}

resource "aws_kms_key" "saasDataEncryptionKey" {
  description             = "KMS Key para cifrado AES-256 de saasCloudDb"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    projectName = var.projectName
    environment = var.environment
    compliance  = "ISO27001-SOC2"
  }
}

resource "aws_s3_bucket" "saasBackupsPitr" {
  bucket = "${var.projectName}-${var.environment}-backups-pitr"

  tags = {
    projectName = var.projectName
    environment = var.environment
    purpose     = "DistributedDatabasePitrBackups"
  }
}

resource "aws_s3_bucket_versioning" "saasBackupsVersioning" {
  bucket = aws_s3_bucket.saasBackupsPitr.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "saasBackupsEncryption" {
  bucket = aws_s3_bucket.saasBackupsPitr.id
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.saasDataEncryptionKey.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_vpc" "saasVpc" {
  cidr_block           = var.vpcCidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.projectName}-vpc"
  }
}

resource "aws_subnet" "privateDbSubnets" {
  count             = length(var.availabilityZones)
  vpc_id            = aws_vpc.saasVpc.id
  cidr_block        = cidrsubnet(var.vpcCidr, 4, count.index + 1)
  availability_zone = var.availabilityZones[count.index]

  tags = {
    Name                               = "${var.projectName}-privateDb-${var.availabilityZones[count.index]}"
    "kubernetes.io/role/internal-elb" = "1"
    "topology.kubernetes.io/zone"      = var.availabilityZones[count.index]
  }
}
