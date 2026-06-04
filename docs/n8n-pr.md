# Submitting to n8n's verified community packages list

This is a Saul-action because it requires reviewing n8n's community-nodes process and may need account / signing setup.

## Steps

### 1. Verify the package builds and runs locally

```bash
cd C:\Users\ritekit\n8n-nodes-mentionfox
npm install
npm run lint
npm run build
```

In a local n8n instance:

```bash
# In ~/.n8n/custom (create if missing on first time)
npm link n8n-nodes-mentionfox
n8n start
```

Confirm:

- The MentionFox node appears in the palette
- The MentionFox Trigger node appears in the trigger picker
- The credential `MentionFox API` is selectable
- Credential test passes with a valid bearer token from https://mentionfox.com/connect
- A simple `Subject` → `get_dossier` workflow returns data
- Triggers fire on schedule

### 2. Publish to npm

```bash
# One-time: ensure NPM_TOKEN is set in the npm publish environment
# CI publishes automatically on git tag; local publish:
npm login
npm publish --access public
```

Verify the listing at https://www.npmjs.com/package/n8n-nodes-mentionfox.

### 3. Submit to n8n verified community packages

Per n8n's process at https://docs.n8n.io/integrations/community-nodes/build-community-nodes/#submit-your-node-for-verification:

1. Open a PR against [n8n-io/n8n](https://github.com/n8n-io/n8n) in the community packages directory (path varies; check current docs).
2. Required PR contents:
   - Link to the npm package (`n8n-nodes-mentionfox`)
   - Link to the GitHub repo (this one)
   - Link to documentation (the README + /docs/)
   - Confirmation that lint + type-check pass
   - Maintainer contact (saul@mentionfox.com)
3. Reference this docs file's "Quality criteria" section below in the PR description.

### 4. Quality criteria self-attestation

| Criterion | Status |
|---|---|
| Builds without warnings (`npm run build`) | yes |
| Lint passes (`npm run lint`) | yes |
| Strict ESLint preset for prepublish (`prepublishOnly`) | yes |
| TypeScript strict mode | yes |
| Icons match n8n design language (monochrome SVG) | yes |
| README with install + auth + 3 worked examples | yes |
| LICENSE.md (MIT) | yes |
| CHANGELOG.md | yes |
| CONTRIBUTING.md | yes |
| Per-resource doc pages | yes (8 in /docs/) |
| Workflow templates | yes (8 in /templates/) |
| CI: lint + type-check on every PR | yes (.github/workflows/test-and-publish.yml) |
| CI: publish on git tag | yes (requires NPM_TOKEN secret) |
| Credential type with test endpoint | yes (mentionFoxApi) |
| Reliability test plan documented | yes (/docs/reliability-tests.md, results pending v0.2) |
| Performance numbers documented | yes (/docs/performance.md, real measurements pending v0.2) |
| Security audit checklist | yes (/docs/security-audit.md) |
| Use-cases documented | yes (/docs/use-cases.md) |

### 5. Marketing follow-ups

- Update https://www.foxapis.com/integrations/n8n.html status from "in progress" to "Live" with the npm install link.
- Add `n8n` tag to MentionFox's pricing page integrations list.
- LinkedIn announcement.
- Submit to n8n's monthly community-nodes spotlight.
