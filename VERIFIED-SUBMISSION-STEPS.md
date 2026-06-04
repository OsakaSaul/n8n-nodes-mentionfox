# n8n VERIFIED community node — remaining human steps

Everything code/CI-side is done and pushed (commit on `main`: provenance `publish.yml`, CI-only `test-and-publish.yml`, version `0.1.1`). Build + lint pass. The official scanner (`@n8n/scan-community-package`) now fails on **one** thing only: *"Package was not published with npm provenance."* These steps fix that and submit. ~10–15 minutes.

## What's already done (no action needed)
- ✅ `.github/workflows/publish.yml` — publishes with `--provenance` + `id-token: write` (the post-2026-05-01 verified requirement).
- ✅ `test-and-publish.yml` trimmed to CI-only (no non-provenance publish can fire).
- ✅ `package.json` bumped to **0.1.1** (0.1.0 is already on npm without provenance; a fresh version is required to publish with provenance).
- ✅ `npm run build` exit 0, `npm run lint` exit 0.
- ✅ Audit vs. verification rules: TypeScript ✓, n8n scaffolding conventions ✓, English-only interface/docs ✓. (Note: description says "MentionFox + FoxAPIs" — same vendor; the automated scan did not flag it, but if Creator-Portal human review objects to "one service per package," tighten the description to MentionFox only.)

## Step 1 — Add the npm token to GitHub repo secrets  (REQUIRED)
1. Create an npm token: npmjs.com → your avatar → **Access Tokens** → **Generate New Token** → **Granular Access Token** (or Automation). Give it **Read and write** on the `n8n-nodes-mentionfox` package.
2. Make sure the npm account's 2FA is set to **"Authorization only"** (not "Authorization and writes") — otherwise CI publish is blocked by an OTP prompt. (npmjs.com → Account → Two-Factor Authentication.)
3. In GitHub: `github.com/OsakaSaul/n8n-nodes-mentionfox` → **Settings → Secrets and variables → Actions → New repository secret**.
   - Name: `NPM_TOKEN`
   - Value: the token from step 1.

## Step 2 — Trigger the provenance publish  (REQUIRED)
Either:
- **Recommended:** GitHub → **Releases → Draft a new release** → tag `v0.1.1` → Publish release. This fires `publish.yml`, which builds and runs `npm publish --provenance --access public`.
- **Or:** GitHub → **Actions → "Publish (verified, with provenance)" → Run workflow** (manual dispatch on `main`).

Watch the Actions run go green. On success, npmjs.com/package/n8n-nodes-mentionfox will show a **"Provenance"** badge on v0.1.1.

## Step 3 — Confirm the scan now passes  (optional but reassuring)
Run (or have CC run): `npx @n8n/scan-community-package n8n-nodes-mentionfox`
Expect: ✅ passed (no "not published with provenance"). On this Windows box it needs `NODE_TLS_REJECT_UNAUTHORIZED=0` due to the local TLS proxy.

## Step 4 — Submit for verification via the n8n Creator Portal  (REQUIRED, account-gated)
1. Go to the n8n community-nodes submission flow (Creator Portal): https://n8n.io → Integrations → "Submit community node" (or https://creator.n8n.io). Sign in with the n8n account you want associated with the node.
2. Provide the package name `n8n-nodes-mentionfox` and the GitHub repo URL.
3. Submit. n8n runs the automated scan again + a human review. Once approved, the node becomes **discoverable + one-click installable** in the n8n nodes panel on Cloud and self-hosted (no more npm-only manual install).

## If something blocks
- Actions publish fails with 403/OTP → the npm token lacks write scope or 2FA is "auth-and-writes" (fix Step 1.2).
- Actions publish fails "cannot publish over existing version" → bump `package.json` version again (0.1.2) and re-release.
- Creator Portal rejects on "one service" → edit `package.json` description + README to MentionFox-only wording, bump version, re-publish, resubmit.
