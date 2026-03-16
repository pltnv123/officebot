# Agency-Agents → OfficeBot Mapping (112 agents)
> Complete 1:1 mapping of all agency-agents to OfficeBot Unity system
> Source: https://github.com/msitarzewski/agency-agents (MIT)
> Last updated: 2026-03-16

## Unity Robot Roles (5 agents in scene)

| Robot | Color | Eye Color | Unity Role | Agency Division | Key Responsibilities |
|-------|-------|-----------|-----------|-----------------|---------------------|
| **CHIEF** | White/Gold | Gold `(1.0, 0.84, 0.0)` | `chief` | Orchestrator + Sales | Overall coordination, task routing, sales, status reporting |
| **PLANNER** | White/Orange | Orange `(1.0, 0.55, 0.15)` | `planner` | Product + PM + Marketing + Academic + Paid Media | Sprint planning, task breakdown, strategy, research |
| **WORKER** | White/Blue | Blue `(0.2, 0.6, 1.0)` | `worker` | Engineering + Game Development | Code writing, implementation, prototyping, all technical |
| **REVIEWER** | White/Yellow | Yellow `(0.9, 0.85, 0.2)` | `reviewer` | Design + Testing | Code review, QA, visual quality, accessibility |
| **BUILDER** | White/Green | Green `(0.2, 1.0, 0.4)` | `builder` | DevOps + SRE (from Engineering) | CI/CD, deployment, infrastructure, monitoring |

## Division → Zone → Robot Mapping

| Division | Zone | Floor Color | Primary Robot | Telegram Topic | Escalation |
|----------|------|-------------|---------------|---------------|------------|
| Engineering | ENGINEERING | Blue | WORKER | `engineering` | → REVIEWER → CHIEF |
| Design | DESIGN | Purple | REVIEWER | `design` | → PLANNER → CHIEF |
| Product | PRODUCT | Orange | PLANNER | `product` | → CHIEF |
| Marketing | MARKETING | Red-Orange | PLANNER | `marketing` | → CHIEF |
| Sales | SALES | Gold | CHIEF | `sales` | Direct to Anton |
| Project Management | PM | Brown-Orange | PLANNER | `pm` | → CHIEF |
| Testing | TESTING | Green | REVIEWER | `testing` | → WORKER → CHIEF |
| Paid Media | PRODUCT (shared) | Orange | PLANNER | `paid-media` | → CHIEF |
| Game Dev | GAME DEV | Purple | WORKER | `game-dev` | → REVIEWER → CHIEF |

## Complete Agent Directory (117 agents)

### 🔵 WORKER Robot — Engineering (23 agents)

| # | Agent | Specialization | Tags | Integration |
|---|-------|---------------|------|-------------|
| 1 | `engineering-frontend-developer` | Frontend, React/Vue/Angular, UI components | `frontend`, `ui`, `web` | INTEGRATION.md |
| 2 | `engineering-backend-architect` | API design, server architecture | `backend`, `api`, `server` | INTEGRATION.md |
| 3 | `engineering-code-reviewer` | Code quality review | Auto on PR | → REVIEWER |
| 4 | `engineering-devops-automator` | CI/CD pipelines, automation | `devops`, `ci`, `deploy` | → BUILDER |
| 5 | `engineering-security-engineer` | Security audits, vulnerability fixes | `security`, `auth`, `vuln` | INTEGRATION.md |
| 6 | `engineering-sre` | Reliability, monitoring, SLOs | `sre`, `monitoring`, `uptime` | → BUILDER |
| 7 | `engineering-senior-developer` | Complex features, architecture decisions | Priority, tech debt | INTEGRATION.md |
| 8 | `engineering-rapid-prototyper` | Quick MVPs, proof of concepts | `prototype`, `mvp`, `spike` | INTEGRATION.md |
| 9 | `engineering-ai-engineer` | ML pipelines, AI integrations | `ai`, `ml`, `model` | INTEGRATION.md |
| 10 | `engineering-data-engineer` | Data pipelines, ETL, warehousing | `data`, `etl`, `pipeline` | INTEGRATION.md |
| 11 | `engineering-database-optimizer` | Query optimization, schema design | `database`, `sql`, `query` | INTEGRATION.md |
| 12 | `engineering-software-architect` | System design, tech stack decisions | `architecture`, `design` | INTEGRATION.md |
| 13 | `engineering-mobile-app-builder` | iOS/Android development | `mobile`, `ios`, `android` | INTEGRATION.md |
| 14 | `engineering-technical-writer` | Documentation, API docs | `docs`, `documentation` | INTEGRATION.md |
| 15 | `engineering-git-workflow-master` | Git strategies, branching | `git`, `branch`, `merge` | INTEGRATION.md |
| 16 | `engineering-ai-data-remediation-engineer` | Data cleaning, AI data prep | `data-cleanup`, `remediation` | INTEGRATION.md |
| 17 | `engineering-autonomous-optimization-architect` | Performance optimization | `optimize`, `performance` | INTEGRATION.md |
| 18 | `engineering-embedded-firmware-engineer` | Embedded systems, IoT | `embedded`, `iot`, `firmware` | INTEGRATION.md |
| 19 | `engineering-incident-response-commander` | Incident management, P0 response | P0/P1 incidents | INTEGRATION.md |
| 20 | `engineering-threat-detection-engineer` | Threat detection, security monitoring | `threat`, `ids`, `detection` | INTEGRATION.md |
| 21 | `engineering-solidity-smart-contract-engineer` | Smart contracts, blockchain | `web3`, `solidity`, `contract` | INTEGRATION.md |
| 22 | `engineering-feishu-integration-developer` | Feishu/Lark integrations | `feishu`, `lark` | INTEGRATION.md |
| 23 | `engineering-wechat-mini-program-developer` | WeChat mini-programs | `wechat`, `miniprogram` | INTEGRATION.md |

### 🔵 WORKER Robot — Game Development (20 agents)

| # | Agent | Specialization | Tags | Integration |
|---|-------|---------------|------|-------------|
| 24 | `game-audio-engineer` | Game audio, sound design, middleware | `audio`, `sound` | INTEGRATION.md |
| 25 | `game-designer` | Game mechanics, systems design | `gamedesign`, `mechanics` | INTEGRATION.md |
| 26 | `level-designer` | Level design, world building | `level`, `map`, `world` | INTEGRATION.md |
| 27 | `narrative-designer` | Game narrative, dialog systems | `gamenarrative`, `dialog` | INTEGRATION.md |
| 28 | `technical-artist` | Shaders, VFX, rendering pipelines | `techart`, `shader`, `vfx` | INTEGRATION.md |
| 29 | `blender-addon-engineer` | Blender addons, 3D tools | `blender`, `3d`, `addon` | INTEGRATION.md |
| 30 | `godot-gameplay-scripter` | Godot GDScript, gameplay | `godot`, `gdscript` | INTEGRATION.md |
| 31 | `godot-multiplayer-engineer` | Godot networking, multiplayer | `godot-multiplayer` | INTEGRATION.md |
| 32 | `godot-shader-developer` | Godot shaders, visual effects | `godot-shader` | INTEGRATION.md |
| 33 | `roblox-avatar-creator` | Roblox avatar systems | `roblox-avatar` | INTEGRATION.md |
| 34 | `roblox-experience-designer` | Roblox experience design | `roblox-experience` | INTEGRATION.md |
| 35 | `roblox-systems-scripter` | Roblox Luau scripting | `roblox`, `luau` | INTEGRATION.md |
| 36 | `unity-architect` | Unity architecture, project structure | `unity-arch` | INTEGRATION.md |
| 37 | `unity-editor-tool-developer` | Unity editor extensions, tools | `unity-tool` | INTEGRATION.md |
| 38 | `unity-multiplayer-engineer` | Unity Netcode, multiplayer | `unity-netcode` | INTEGRATION.md |
| 39 | `unity-shader-graph-artist` | Unity Shader Graph, visual effects | `unity-shader` | INTEGRATION.md |
| 40 | `unreal-multiplayer-architect` | Unreal networking, multiplayer | `unreal-netcode` | INTEGRATION.md |
| 41 | `unreal-systems-engineer` | Unreal C++, gameplay systems | `unreal`, `ue-cpp` | INTEGRATION.md |
| 42 | `unreal-technical-artist` | Unreal materials, Niagara VFX | `ue-material`, `niagara` | INTEGRATION.md |
| 43 | `unreal-world-builder` | Unreal world building, landscapes | `ue-world`, `landscape` | INTEGRATION.md |

### 🟡 REVIEWER Robot — Design (8 agents)

| # | Agent | Specialization | Tags | Integration |
|---|-------|---------------|------|-------------|
| 44 | `design-ui-designer` | UI design, visual components, design systems | `design`, `ui`, `visual` | INTEGRATION.md |
| 45 | `design-ux-researcher` | User research, usability testing | `ux`, `research`, `user-test` | INTEGRATION.md |
| 46 | `design-brand-guardian` | Brand consistency, style guidelines | `brand`, `identity`, `style` | INTEGRATION.md |
| 47 | `design-visual-storyteller` | Visual narratives, presentations | `presentation`, `story` | INTEGRATION.md |
| 48 | `design-whimsy-injector` | Fun details, micro-interactions, polish | `whimsy`, `polish`, `delight` | INTEGRATION.md |
| 49 | `design-ux-architect` | Information architecture, navigation | `ia`, `navigation`, `flow` | INTEGRATION.md |
| 50 | `design-image-prompt-engineer` | AI image generation prompts | `image`, `prompt`, `ai-art` | INTEGRATION.md |
| 51 | `design-inclusive-visuals-specialist` | Accessibility, inclusive design | `a11y`, `inclusive` | INTEGRATION.md |

### 🟡 REVIEWER Robot — Testing (8 agents)

| # | Agent | Specialization | Tags | Integration |
|---|-------|---------------|------|-------------|
| 52 | `testing-accessibility-auditor` | WCAG compliance, a11y audits | `a11y-audit`, `wcag` | INTEGRATION.md |
| 53 | `testing-api-tester` | API testing, contract tests | `api-test`, `contract` | INTEGRATION.md |
| 54 | `testing-evidence-collector` | Test evidence, screenshots, logs | Auto on test runs | INTEGRATION.md |
| 55 | `testing-performance-benchmarker` | Performance benchmarks, load tests | `benchmark`, `load-test` | INTEGRATION.md |
| 56 | `testing-reality-checker` | Validates outputs against specs | Auto before deploy | INTEGRATION.md |
| 57 | `testing-test-results-analyzer` | Test result analysis, trends | Post-test-run | INTEGRATION.md |
| 58 | `testing-tool-evaluator` | Testing tool evaluation | `test-tool`, `evaluation` | INTEGRATION.md |
| 59 | `testing-workflow-optimizer` | Test workflow optimization | `test-workflow`, `ci-optimize` | INTEGRATION.md |

### 🟠 PLANNER Robot — Product (5 agents)

| # | Agent | Specialization | Tags | Integration |
|---|-------|---------------|------|-------------|
| 60 | `product-behavioral-nudge-engine` | Behavioral nudges, habit design | `nudge`, `behavioral` | INTEGRATION.md |
| 61 | `product-feedback-synthesizer` | User feedback synthesis | `feedback`, `synthesis` | INTEGRATION.md |
| 62 | `product-manager` | Product management, roadmapping | `product`, `roadmap` | INTEGRATION.md |
| 63 | `product-sprint-prioritizer` | Sprint prioritization, backlog | `sprint`, `prioritize` | INTEGRATION.md |
| 64 | `product-trend-researcher` | Market trends, competitive analysis | `trend`, `market` | INTEGRATION.md |

### 🟠 PLANNER Robot — Project Management (6 agents)

| # | Agent | Specialization | Tags | Integration |
|---|-------|---------------|------|-------------|
| 65 | `project-management-experiment-tracker` | Experiment tracking, A/B test results | `experiment`, `ab-test` | INTEGRATION.md |
| 66 | `project-management-jira-workflow-steward` | Jira workflow optimization | `jira`, `workflow` | INTEGRATION.md |
| 67 | `project-management-project-shepherd` | Project guidance, stakeholder mgmt | `project`, `stakeholder` | INTEGRATION.md |
| 68 | `project-management-studio-operations` | Studio operations, resource allocation | `studio-ops`, `resources` | INTEGRATION.md |
| 69 | `project-management-studio-producer` | Executive creative/technical orchestration | `producer`, `strategy` | INTEGRATION.md |
| 70 | `project-manager-senior` | Senior PM, complex project delivery | `senior-pm`, `delivery` | INTEGRATION.md |

### 🟠 PLANNER Robot — Marketing (27 agents)

| # | Agent | Specialization | Tags | Integration |
|---|-------|---------------|------|-------------|
| 71 | `marketing-ai-citation-strategist` | AI citation optimization, GEO | `ai-citation`, `geo` | INTEGRATION.md |
| 72 | `marketing-app-store-optimizer` | App store optimization | `aso`, `app-store` | INTEGRATION.md |
| 73 | `marketing-baidu-seo-specialist` | Baidu SEO, China search | `baidu`, `china-seo` | INTEGRATION.md |
| 74 | `marketing-bilibili-content-strategist` | Bilibili content strategy | `bilibili`, `china-video` | INTEGRATION.md |
| 75 | `marketing-book-co-author` | Book writing, long-form content | `book`, `longform` | INTEGRATION.md |
| 76 | `marketing-carousel-growth-engine` | Carousel content growth | `carousel`, `linkedin-carousel` | INTEGRATION.md |
| 77 | `marketing-china-ecommerce-operator` | China e-commerce operations | `china-ecommerce`, `tmall` | INTEGRATION.md |
| 78 | `marketing-content-creator` | Content creation, copywriting | `content`, `copy`, `blog` | INTEGRATION.md |
| 79 | `marketing-cross-border-ecommerce` | Cross-border e-commerce | `cross-border`, `international` | INTEGRATION.md |
| 80 | `marketing-douyin-strategist` | Douyin/TikTok China strategy | `douyin`, `tiktok-cn` | INTEGRATION.md |
| 81 | `marketing-growth-hacker` | Growth hacking, viral loops | `growth`, `viral` | INTEGRATION.md |
| 82 | `marketing-instagram-curator` | Instagram content curation | `instagram`, `ig` | INTEGRATION.md |
| 83 | `marketing-kuaishou-strategist` | Kuaishou short video strategy | `kuaishou`, `short-video-cn` | INTEGRATION.md |
| 84 | `marketing-linkedin-content-creator` | LinkedIn content, B2B | `linkedin`, `b2b-content` | INTEGRATION.md |
| 85 | `marketing-livestream-commerce-coach` | Livestream commerce coaching | `livestream`, `live-commerce` | INTEGRATION.md |
| 86 | `marketing-podcast-strategist` | Podcast strategy, distribution | `podcast`, `audio-content` | INTEGRATION.md |
| 87 | `marketing-private-domain-operator` | Private domain marketing | `private-domain` | INTEGRATION.md |
| 88 | `marketing-reddit-community-builder` | Reddit community building | `reddit`, `community` | INTEGRATION.md |
| 89 | `marketing-seo-specialist` | SEO optimization, search ranking | `seo`, `search` | INTEGRATION.md |
| 90 | `marketing-short-video-editing-coach` | Short video editing coaching | `video-edit`, `short-video` | INTEGRATION.md |
| 91 | `marketing-social-media-strategist` | Social media strategy | `social`, `social-media` | INTEGRATION.md |
| 92 | `marketing-tiktok-strategist` | TikTok global strategy | `tiktok`, `short-video` | INTEGRATION.md |
| 93 | `marketing-twitter-engager` | Twitter/X engagement strategy | `twitter`, `x-platform` | INTEGRATION.md |
| 94 | `marketing-wechat-official-account` | WeChat official account | `wechat`, `wechat-oa` | INTEGRATION.md |
| 95 | `marketing-weibo-strategist` | Weibo strategy, China social | `weibo`, `china-social` | INTEGRATION.md |
| 96 | `marketing-xiaohongshu-specialist` | Xiaohongshu (RED) marketing | `xiaohongshu`, `red` | INTEGRATION.md |
| 97 | `marketing-zhihu-strategist` | Zhihu content strategy | `zhihu`, `china-qa` | INTEGRATION.md |

### 🟠 PLANNER Robot — Paid Media (7 agents)

| # | Agent | Specialization | Tags | Integration |
|---|-------|---------------|------|-------------|
| 103 | `paid-media-auditor` | Paid media account auditing | `pm-audit`, `account-review` | INTEGRATION.md |
| 104 | `paid-media-creative-strategist` | Ad creative strategy | `pm-creative`, `ad-creative` | INTEGRATION.md |
| 105 | `paid-media-paid-social-strategist` | Paid social campaigns | `pm-social`, `paid-social` | INTEGRATION.md |
| 106 | `paid-media-ppc-strategist` | PPC campaign optimization | `ppc`, `google-ads` | INTEGRATION.md |
| 107 | `paid-media-programmatic-buyer` | Programmatic ad buying | `programmatic`, `dsp` | INTEGRATION.md |
| 108 | `paid-media-search-query-analyst` | Search query analysis | `search-query`, `keyword` | INTEGRATION.md |
| 109 | `paid-media-tracking-specialist` | Tracking, attribution, pixels | `tracking`, `attribution` | INTEGRATION.md |

### ⚪ CHIEF Robot — Sales (8 agents)

| # | Agent | Specialization | Tags | Integration |
|---|-------|---------------|------|-------------|
| 110 | `sales-account-strategist` | Account strategy, key accounts | `account`, `key-account` | INTEGRATION.md |
| 111 | `sales-coach` | Sales coaching, skill development | `sales-coach`, `training` | INTEGRATION.md |
| 112 | `sales-deal-strategist` | Deal strategy, negotiation | `deal`, `negotiation` | INTEGRATION.md |
| 113 | `sales-discovery-coach` | Discovery call coaching | `discovery`, `qualification` | INTEGRATION.md |
| 114 | `sales-engineer` | Technical sales, demos | `demo`, `technical-sales` | INTEGRATION.md |
| 115 | `sales-outbound-strategist` | Outbound sales strategy | `outbound`, `prospecting` | INTEGRATION.md |
| 116 | `sales-pipeline-analyst` | Pipeline analysis, forecasting | `pipeline`, `forecast` | INTEGRATION.md |
| 117 | `sales-proposal-strategist` | Proposal writing, RFP responses | `proposal`, `rfp`, `bid` | INTEGRATION.md |

## Robot Statistics

| Robot | Agents | Divisions Covered | Percentage |
|-------|--------|-------------------|------------|
| ⚪ CHIEF | 8 (+ orchestration) | Sales | 6.8% |
| 🟠 PLANNER | 51 | Product, PM, Marketing, Paid Media | 45.5% |
| 🔵 WORKER | 43 | Engineering, Game Development | 36.8% |
| 🟡 REVIEWER | 16 | Design, Testing | 13.7% |
| 🟢 BUILDER | 0 (shared from Engineering) | DevOps/SRE via WORKER | 0% (embedded) |
| **TOTAL** | **112** | **9 divisions** | **100%** |

## Telegram Command Reference

### Status Commands
- `/agent_status <name>` — Status of specific agent
- `/agent_status --all` — All 117 agents
- `/division_list` — All divisions with agent counts
- `/division_list --verbose` — With individual agent details

### Division Commands
- `/engineering_status` — Engineering division status
- `/design_status` — Design division status
- `/testing_status` — Testing division status
- `/product_status` — Product division status
- `/marketing_status` — Marketing division status
- `/sales_status` — Sales division status
- `/pm_status` — Project Management status
- `/academic_status` — Academic division status
- `/paidmedia_status` — Paid Media division status
- `/gamedev_status` — Game Development status

### Task Assignment
- `/assign <agent> <task>` — Assign task to specific agent
- `/assign_to_agent.sh engineering-frontend-developer "Fix mobile layout"`

### Visual Review
- Screenshot: `node scripts/screenshot.js`
- Healthcheck: `bash scripts/ops/office_healthcheck.sh`
- CI status: `cd office && gh run list --limit 3`

## Academic (restored — UX psychology only)

| # | Agent | OfficeBot Role | Robot | Zone | Telegram |
|---|-------|---------------|-------|------|----------|
| 113 | academic-psychologist | REVIEWER/psych | REVIEWER | DESIGN / Purple | reviewer |
