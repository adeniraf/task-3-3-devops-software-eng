terraform {
  required_version = ">= 1.5.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.5.0"
    }
  }
}

variable "image" {
  description = "Registry image reference pinned to the digest published by CI."
  type        = string

  validation {
    condition     = can(regex("^[^@[:space:]]+@sha256:[0-9a-f]{64}$", var.image))
    error_message = "Pass a registry image reference pinned to a SHA-256 digest."
  }
}

variable "kubeconfig_path" {
  description = "Path to the kubeconfig for the local cluster."
  type        = string
  default     = "~/.kube/task-api-config"
}

provider "kubernetes" {
  config_path    = pathexpand(var.kubeconfig_path)
  config_context = "kind-task-api"
}

locals {
  name = "task-api"
  port = 3000
  labels = {
    "app.kubernetes.io/name" = local.name
  }
}

resource "kubernetes_deployment_v1" "api" {
  metadata {
    name   = local.name
    labels = local.labels
  }

  spec {
    replicas                  = 1
    progress_deadline_seconds = 90

    strategy {
      type = "Recreate"
    }

    selector {
      match_labels = local.labels
    }

    template {
      metadata {
        labels = local.labels
      }

      spec {
        automount_service_account_token = false

        container {
          name  = local.name
          image = var.image

          port {
            name           = "http"
            container_port = local.port
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = "http"
            }
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = "http"
            }
          }

          security_context {
            run_as_non_root            = true
            allow_privilege_escalation = false
            read_only_root_filesystem  = true

            capabilities {
              drop = ["ALL"]
            }

            seccomp_profile {
              type = "RuntimeDefault"
            }
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "api" {
  metadata {
    name   = local.name
    labels = local.labels
  }

  spec {
    selector = local.labels

    port {
      name        = "http"
      port        = local.port
      target_port = "http"
    }
  }
}
