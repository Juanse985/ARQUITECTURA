output "vpcId" {
  description = "ID de la red privada VPC para el cluster distribuido"
  value       = aws_vpc.saasVpc.id
}

output "kmsKeyArn" {
  description = "ARN de la llave KMS para cifrado AES-256 en reposo"
  value       = aws_kms_key.saasDataEncryptionKey.arn
}

output "backupBucketName" {
  description = "Bucket S3 cifrado para WAL archiving y restauracion PITR"
  value       = aws_s3_bucket.saasBackupsPitr.bucket
}
