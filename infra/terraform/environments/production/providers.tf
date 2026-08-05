# Empty by design — each provider reads its token from the environment, decrypted by
# dotenvx at invocation: CLOUDFLARE_API_TOKEN, VERCEL_API_TOKEN, DIGITALOCEAN_TOKEN.

provider "cloudflare" {}

provider "vercel" {}

provider "digitalocean" {}
