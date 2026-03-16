# OPENCLAW_STACK.md — Technical Reference

## OpenClaw Resources
- Docs: https://docs.openclaw.ai
- GitHub: https://github.com/openclaw/openclaw
- Skills hub: https://hub.openclaw.ai

## Model Providers
- Primary: openai-codex/gpt-5.3-codex (OAuth via new account)
- Fallbacks: openai/gpt-5.1-codex → openai/gpt-5.3-codex → openai-codex/gpt-5.1-codex-mini → openai/gpt-4.1-mini

## Key Commands
- openclaw skills list — list available skills
- openclaw gateway stop/start — manage gateway
- openclaw configure — change settings
- gh run list --limit 5 — check CI status
- stat /var/www/office/Build/WebGL.wasm.gz | grep Modify — verify deploy

## Implementation Rules
1. Check local OpenClaw docs first, then docs.openclaw.ai
2. Before any change: check latest release and changelog
3. Always have fallback model provider
4. Diagnosis order: openclaw status → targeted checks → logs
5. Any external guide is secondary, not source of truth

## Pre-Change Checklist
- [ ] Current OpenClaw release checked
- [ ] Breaking changes in docs checked
- [ ] Primary and fallback model provider set
- [ ] Rollback plan exists (backup/commit)
- [ ] Changes documented in workspace

## WebGL/Unity Critical Rules
- NEVER use Shader.Find("Standard") — returns null in URP WebGL
- ALWAYS use Shader.Find("Universal Render Pipeline/Lit")
- If scene is black: first check shader null errors in browser console
- URP fallback: Shader.Find("Hidden/InternalErrorShader")

## SSH Tunnel (for browser access)
- Command: ssh -N -L 18789:127.0.0.1:18789 antonbot@5.45.115.12
- Browser: http://127.0.0.1:18789
- Token: 906d803d570653290bacd4a5ad98d8aaf66f81c7369d5061
