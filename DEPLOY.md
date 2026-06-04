# DEPLOY — Saul actions to flip n8n-nodes-mentionfox live

The build was completed by Claude Code in `C:\Users\ritekit\n8n-nodes-mentionfox\` (this directory). Bash and PowerShell were sandboxed on this run, so git init / gh repo create / npm install / push / publish were not executable from inside the agent. Below are the four steps you (Saul) run from a normal PowerShell terminal to ship.

## 1. Initialize git repo and create GitHub origin

From `C:\Users\ritekit\n8n-nodes-mentionfox\`:

```powershell
cd C:\Users\ritekit\n8n-nodes-mentionfox
git init
git add -A
git commit -m "[FoxAPIs 0.2] n8n dedicated node — 8 resources, 30+ operations, 5 trigger nodes, 8 workflow templates, ready for npm publish

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git branch -M main
gh repo create OsakaSaul/n8n-nodes-mentionfox --public --description "n8n community node for MentionFox + FoxAPIs" --source=. --remote=origin --push
```

If `gh` is not installed: create the GitHub repo manually at https://github.com/new (name `n8n-nodes-mentionfox`, public), then:

```powershell
git remote add origin https://github.com/OsakaSaul/n8n-nodes-mentionfox.git
git push -u origin main
```

## 2. Install dependencies and verify build

```powershell
cd C:\Users\ritekit\n8n-nodes-mentionfox
npm install
npm run lint
npm run build
```

Expected: tsc compiles `dist/` cleanly, gulp copies SVG icons. Lint should pass on the first run.

If lint flags issues: `npm run lintfix` typically resolves them. Re-run lint, re-build.

## 3. Set NPM_TOKEN secret on GitHub

For the CI publish-on-tag flow (`.github/workflows/test-and-publish.yml`):

1. Generate npm token: `npm token create --read-only=false` (or via npmjs.com → Access Tokens → Generate New Token → "Automation").
2. Add to GitHub: https://github.com/OsakaSaul/n8n-nodes-mentionfox/settings/secrets/actions → New repository secret → name `NPM_TOKEN`, value the token.

## 4. Publish v0.1.0

Two paths:

**Path A — Tag-driven (preferred, runs through CI):**

```powershell
git tag v0.1.0
git push origin v0.1.0
```

This triggers the `Publish to npm` job in `test-and-publish.yml`.

**Path B — Direct from local:**

```powershell
npm login
npm publish --access public
```

Verify: https://www.npmjs.com/package/n8n-nodes-mentionfox

## 5. Smoke-test in a local n8n instance

```powershell
cd $env:USERPROFILE\.n8n\custom
# If the directory does not exist:
mkdir $env:USERPROFILE\.n8n\custom
cd $env:USERPROFILE\.n8n\custom
npm init -y
npm install n8n-nodes-mentionfox
n8n start
```

In n8n's UI:

- Create a `MentionFox API` credential, paste a bearer token from https://mentionfox.com/connect, click "Test" — should pass.
- Create a workflow with the MentionFox node → Subject → get_dossier on a known person.
- Run, confirm output.

## 6. Trigger marketing-page flip

Sibling agent #98 leaves `foxapis.com/integrations/n8n.html` at "in progress" status. Once npm + GitHub are live:

- Coordinate with the foxapis-cf agent to flip status to "Live"
- Add the npm link
- Publish a LinkedIn post (one-liner with the npm install command)

## 7. (Later) Submit to n8n verified community packages

Per `docs/n8n-pr.md`. Open a PR against `n8n-io/n8n` referencing this repo + npm package + the quality-criteria checklist.

## 8. (Later) Build /api/v1/whoami in MentionFox repo

The credential test currently uses MCP `tools/list` as a proxy for "is the bearer valid". The richer credential test the spec calls for — returning plan + credit balance + rate limit — needs a dedicated `/api/v1/whoami` endpoint built into `sonic-spotter-hq` (or as a new MCP method `mentionfox/whoami`). This is a separate dispatch in the MentionFox repo.

When that endpoint ships, swap the credential test in `credentials/MentionFoxApi.credentials.ts`:

```ts
test: {
  request: {
    baseURL: '={{$credentials.baseUrl.replace("/mcp", "/api/v1/whoami")}}',
    method: 'GET',
  },
  rules: [{ type: 'responseSuccessBody', properties: { key: 'plan', value: undefined } }],
}
```

Bump to v0.2.0 alongside that change.
