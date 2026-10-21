variable "projectName" {
  description = "Nombre del proyecto Cloud Native SaaS Multicliente"
  type        = string
  default     = "saas-cloudnative-5000orgs"
}

variable "environment" {
  description = "Entorno de despliegue (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "awsRegion" {
  description = "Region principal de despliegue"
  type        = string
  default     = "us-east-1"
}

variable "vpcCidr" {
  description = "Bloque CIDR de la red privada VPC"
  type        = string
  default     = "10.40.0.0/16"
}

variable "availabilityZones" {
  description = "Tres zonas de disponibilidad fisicamente independientes"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
