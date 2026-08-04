// Values arrive as TF_VAR_* from the decrypted .env.production.enc — never from a
// .tfvars file, which would put them on disk in plaintext next to the state.

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the apex in var.zone_name."
  type        = string
}

variable "vercel_team_id" {
  description = "Vercel team the project lives under."
  type        = string
}

variable "vercel_project_id" {
  description = "Vercel project ID that serves this domain."
  type        = string
}

variable "subdomain" {
  description = "Hostname label under the zone, e.g. \"comp-trial\"."
  type        = string
}

variable "zone_name" {
  description = "Apex domain the subdomain hangs off."
  type        = string
}

variable "cloudflare_dns_ttl" {
  description = "Record TTL. 1 means \"automatic\"."
  type        = number
  default     = 1
}

variable "vercel_cname_target" {
  description = <<-EOT
    Vercel's per-project DNS target. Read it from the project's domain config
    (`vercel api /v6/domains/<fqdn>/config` → recommendedCNAME) rather than
    assuming the generic cname.vercel-dns.com — newer accounts get a
    project-scoped target and Vercel prefers it.
  EOT
  type        = string
}
