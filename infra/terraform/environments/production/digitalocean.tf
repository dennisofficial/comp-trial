locals {
  api_fqdn = "${var.api_subdomain}.${var.zone_name}"
  web_url  = "https://${local.fqdn}"
}

resource "digitalocean_app" "api" {
  spec {
    name   = "comp-trial-api"
    region = "nyc"

    domain {
      name = local.api_fqdn
      type = "PRIMARY"
    }

    service {
      name               = "api"
      instance_size_slug = var.api_instance_size_slug
      instance_count     = 1

      http_port       = 8080
      dockerfile_path = "apps/api/Dockerfile"

      github {
        repo           = var.github_repo
        branch         = "main"
        deploy_on_push = true
      }

      health_check {
        http_path             = "/v1/health"
        initial_delay_seconds = 20
        period_seconds        = 10
        timeout_seconds       = 5
        success_threshold     = 1
        failure_threshold     = 3
      }

      env {
        key   = "DATABASE_URL"
        value = var.database_url
        type  = "SECRET"
        scope = "RUN_TIME"
      }

      env {
        key   = "CORS_ALLOWED_ORIGINS"
        value = local.web_url
        scope = "RUN_TIME"
      }

      env {
        key   = "NODE_ENV"
        value = "production"
        scope = "RUN_TIME"
      }
    }
  }
}

resource "cloudflare_dns_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = local.api_fqdn
  type    = "CNAME"
  content = replace(digitalocean_app.api.default_ingress, "https://", "")
  ttl     = var.cloudflare_dns_ttl

  # Unproxied for the same reason as the app record in main.tf.
  proxied = false
  comment = "Managed by Terraform for comp-trial (API)."
}
