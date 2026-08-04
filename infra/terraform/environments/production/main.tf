locals {
  fqdn = "${var.subdomain}.${var.zone_name}"
}

resource "vercel_project_domain" "app" {
  project_id = var.vercel_project_id
  team_id    = var.vercel_team_id
  domain     = local.fqdn
}

resource "cloudflare_dns_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = local.fqdn
  type    = "CNAME"
  content = var.vercel_cname_target
  ttl     = var.cloudflare_dns_ttl

  proxied = false

  comment = "Managed by Terraform for comp-trial."

  depends_on = [vercel_project_domain.app]
}
