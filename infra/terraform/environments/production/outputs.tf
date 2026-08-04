output "fqdn" {
  description = "Hostname this environment serves."
  value       = local.fqdn
}

output "url" {
  value = "https://${local.fqdn}"
}

output "cname_target" {
  description = "What the CNAME points at, for eyeballing against Vercel's recommendation."
  value       = cloudflare_dns_record.app.content
}
