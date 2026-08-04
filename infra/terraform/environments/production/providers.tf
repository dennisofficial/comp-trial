# Credentials come from the environment, decrypted by dotenvx at invocation:
#   CLOUDFLARE_API_TOKEN, VERCEL_API_TOKEN

provider "cloudflare" {}

provider "vercel" {}
