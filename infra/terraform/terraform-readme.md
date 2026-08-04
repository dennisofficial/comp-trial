# Terraform

Manages the custom domain: the Cloudflare DNS record and the Vercel domain
attachment that pairs with it.

```
infra/terraform/
  environments/
    production/
      main.tf providers.tf variables.tf versions.tf outputs.tf
      .env.production.enc          committed — values encrypted, keys plaintext
      .env.keys                    git-ignored — dotenvx private key
```

Following cubix-infra, `.env.keys` sits in the environment root and the wrapper
takes no `-fk`. (rs-crm-app shares one key at the terraform root with
`-fk ../../.env.keys`; that indirection only pays off across multiple
environments, and there is one here.)

The directory is `production/` to match `.env.production.enc` and
`DOTENV_PUBLIC_KEY_PRODUCTION_ENC` — dir, file and key all one tier name. The
other repos use `prod/` holding `.env.production.enc`; `docs/ENVS.md` calls that
drift out as a cautionary tale, so this follows the rule rather than the drift.

`infra/` is deliberately outside the Bun workspace, as in cubix-infra — CI never
runs Terraform and shouldn't install its toolchain. `dotenvx` comes from a global
install.

## Running it

```bash
cd infra/terraform/environments/production
bun run init
bun run plan
bun run apply
```

Every script wraps the binary in `dotenvx run -f .env.production.enc`, so
`CLOUDFLARE_API_TOKEN`, `VERCEL_API_TOKEN` and the `TF_VAR_*` inputs are decrypted
into the process and never touch disk in plaintext. There is deliberately no
`terraform.tfvars` — it would sit unencrypted next to the state.

No `--overload`: Terraform-provided env stays authoritative.

There is no `.env.example`. The committed `.env.production.enc` is the template —
dotenvx encrypts values only, so the variable names are readable and the file
documents itself.

## What this deliberately does _not_ manage

Scope was chosen so that **no secret ever enters Terraform state**, which is what
makes local state acceptable here.

| Not managed                                    | Why                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neon project                                   | Provisioned once and never changed. Importing it buys reproducibility of a thing nobody re-runs.                                                                                                                                                        |
| Vercel env vars (`DATABASE_URL`, `DIRECT_URL`) | `vercel_project_environment_variable` writes the value into `terraform.tfstate` in plaintext. Managing them here would put the database password in a file whose whole purpose is to be shared. Vercel's encrypted env store is already the right home. |
| Vercel project settings                        | Would fight the CLI/dashboard as the source of truth mid-trial for no gain.                                                                                                                                                                             |

A CNAME and a domain attachment carry nothing sensitive, so `terraform.tfstate`
stays boring. That is the reason the split falls where it does.

## `modules/`

Omitted. The house layout has one, but there is a single environment and two
resources — a module with exactly one caller is indirection, not reuse. Add it
when a second environment needs to share the definitions.

## Next steps beyond a prototype

1. **Remote state** (S3 + DynamoDB lock, or Terraform Cloud). Local state is fine
   for one operator and two resources; it stops being fine the moment a second
   person or CI runs `apply`.
2. **`terraform plan` in CI** on PRs touching `infra/`, so DNS changes get reviewed
   as a diff rather than applied from a laptop.
3. **Widen scope only with remote state in place** — the "no secrets in state" rule
   above is what keeps this safe today, and encrypted remote state is what would
   let it be relaxed.
