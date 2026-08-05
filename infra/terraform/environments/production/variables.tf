# Values arrive as TF_VAR_* from the decrypted .env.production.enc — never a .tfvars
# file, which would put them on disk in plaintext next to the state.

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

variable "api_subdomain" {
  description = "Hostname label for the NestJS API, e.g. \"api\"."
  type        = string
}

variable "github_repo" {
  description = "owner/name of the repo App Platform builds from."
  type        = string
}

variable "api_instance_size_slug" {
  description = "App Platform container size. basic-xxs is 1 vCPU / 512 MiB."
  type        = string
  default     = "basic-xxs"
}

variable "database_url" {
  description = <<-EOT
    Pooled Neon connection string for the API container.

    This value lands in terraform.tfstate. That is a deliberate reversal of the
    "no secrets in state" rule this root started with — an app spec cannot
    reference a secret it does not carry. The mitigations: state is git-ignored
    and .dockerignore'd, and the file must now be treated as a credential.
    Encrypted remote state is the first thing to add here, not an optional
    polish item. See terraform-readme.md.
  EOT
  type        = string
  sensitive   = true
}
