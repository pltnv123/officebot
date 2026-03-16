# Engineering Division — OfficeBot Integration

## Division Overview
- **Source**: `agents/agency/engineering/*.md`
- **Total Agents**: 23
- **Primary Robot**: WORKER
- **Zone**: Engineering Zone (blue)
- **Telegram Topic**: `engineering`
- **Escalation**: WORKER → REVIEWER → CHIEF

## Agent Mapping

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 1 | `engineering-frontend-developer` | WORKER/web | WORKER | Frontend, UI components, React/Vue/Angular | `frontend`, `ui`, `web` |
| 2 | `engineering-backend-architect` | WORKER/api | WORKER | API design, server architecture | `backend`, `api`, `server` |
| 3 | `engineering-code-reviewer` | WORKER→REVIEWER | REVIEWER | Code quality review, PR review | Auto on PR |
| 4 | `engineering-devops-automator` | WORKER→BUILDER | BUILDER | CI/CD pipelines, automation | `devops`, `ci`, `deploy` |
| 5 | `engineering-security-engineer` | WORKER/sec | WORKER | Security audits, vulnerability fixes | `security`, `auth`, `vuln` |
| 6 | `engineering-sre` | WORKER→BUILDER | BUILDER | Reliability, monitoring, SLOs | `sre`, `monitoring`, `uptime` |
| 7 | `engineering-senior-developer` | WORKER/lead | WORKER | Complex features, architecture decisions | Priority tasks, tech debt |
| 8 | `engineering-rapid-prototyper` | WORKER/proto | WORKER | Quick MVPs, proof of concepts | `prototype`, `mvp`, `spike` |
| 9 | `engineering-ai-engineer` | WORKER/ai | WORKER | ML pipelines, AI integrations | `ai`, `ml`, `model` |
| 10 | `engineering-data-engineer` | WORKER/data | WORKER | Data pipelines, ETL, warehousing | `data`, `etl`, `pipeline` |
| 11 | `engineering-database-optimizer` | WORKER/db | WORKER | Query optimization, schema design | `database`, `sql`, `query` |
| 12 | `engineering-software-architect` | WORKER/arch | WORKER | System design, tech stack decisions | `architecture`, `design` |
| 13 | `engineering-mobile-app-builder` | WORKER/mobile | WORKER | iOS/Android development | `mobile`, `ios`, `android` |
| 14 | `engineering-technical-writer` | WORKER/docs | WORKER | Documentation, API docs | `docs`, `documentation` |
| 15 | `engineering-git-workflow-master` | WORKER/git | WORKER | Git strategies, branching | `git`, `branch`, `merge` |
| 16 | `engineering-ai-data-remediation-engineer` | WORKER/ai-data | WORKER | Data cleaning, AI data prep | `data-cleanup`, `remediation` |
| 17 | `engineering-autonomous-optimization-architect` | WORKER/opt | WORKER | Performance optimization | `optimize`, `performance` |
| 18 | `engineering-embedded-firmware-engineer` | WORKER/embedded | WORKER | Embedded systems, IoT | `embedded`, `iot`, `firmware` |
| 19 | `engineering-incident-response-commander` | WORKER/irc | WORKER | Incident management, P0 response | P0/P1 incidents |
| 20 | `engineering-threat-detection-engineer` | WORKER/threat | WORKER | Threat detection, security monitoring | `threat`, `ids`, `detection` |
| 21 | `engineering-solidity-smart-contract-engineer` | WORKER/web3 | WORKER | Smart contracts, blockchain | `web3`, `solidity`, `contract` |
| 22 | `engineering-feishu-integration-developer` | WORKER/feishu | WORKER | Feishu/Lark integrations | `feishu`, `lark` |
| 23 | `engineering-wechat-mini-program-developer` | WORKER/wechat | WORKER | WeChat mini-programs | `wechat`, `miniprogram` |

## Integration Notes
- 18 agents map to WORKER (code writing)
- 1 maps to REVIEWER (code-reviewer → auto PR review)
- 2 map to BUILDER (devops-automator, sre → CI/CD)
- 1 maps to WORKER/security (security-engineer)
- Engineering zone = blue floor area with label "ENGINEERING"
- Senior Developer acts as WORKER lead for complex tasks

## Telegram Commands
- `/eng_status` — show all engineering agents status
- `/eng_frontend [task]` — assign to frontend developer
- `/eng_backend [task]` — assign to backend architect
- `/eng_security [task]` — security audit request
- `/eng_deploy [env]` — trigger devops automator
- `/eng_incident [severity]` — trigger incident response

## Workflows
1. **Feature Build** → CHIEF → WORKER (senior-dev) → code → REVIEWER (code-reviewer) → approve → BUILDER (devops) → deploy
2. **Security Audit** → CHIEF → WORKER (security-eng) → report → REVIEWER → WORKER fixes
3. **Incident Response** → CHIEF → WORKER (irc) → diagnose → fix → BUILDER (sre) → monitor
4. **Prototype** → CHIEF → WORKER (rapid-prototyper) → MVP → REVIEWER → iterate
