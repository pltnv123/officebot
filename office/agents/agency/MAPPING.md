# Agency-Agents → OfficeBot Mapping
> Auto-generated mapping of 117 agency-agents to OfficeBot Unity system
> Source: https://github.com/msitarzewski/agency-agents (MIT)

## Unity Robot Roles (5 agents in scene)

| Robot | Color | Eye Color | Unity Role | Agency Division | Key Responsibilities |
|-------|-------|-----------|-----------|-----------------|---------------------|
| **CHIEF** | White/Gold | Gold `(1.0, 0.84, 0.0)` | `chief` | Orchestrator | Overall coordination, task routing, status reporting |
| **PLANNER** | White/Orange | Orange `(1.0, 0.55, 0.15)` | `planner` | Product + PM | Sprint planning, task breakdown, prioritization |
| **WORKER** | White/Blue | Blue `(0.2, 0.6, 1.0)` | `worker` | Engineering | Code writing, implementation, prototyping |
| **REVIEWER** | White/Yellow | Yellow `(0.9, 0.85, 0.2)` | `reviewer` | Testing + Design | Code review, QA, visual quality, accessibility |
| **BUILDER** | White/Green | Green `(0.2, 1.0, 0.4)` | `builder` | DevOps + SRE | CI/CD, deployment, infrastructure, monitoring |

## Telegram Topic Mapping

| Division | Telegram Topic | Primary Robot | Escalation |
|----------|---------------|---------------|------------|
| Engineering | `engineering` | WORKER | → REVIEWER → CHIEF |
| Design | `design` | REVIEWER | → PLANNER → CHIEF |
| Product | `product` | PLANNER | → CHIEF |
| Marketing | `marketing` | PLANNER | → CHIEF |
| Sales | `sales` | CHIEF | Direct to Anton |
| Project Management | `pm` | PLANNER | → CHIEF |
| Testing | `testing` | REVIEWER | → WORKER → CHIEF |
| Academic | `academic` | PLANNER | → CHIEF |
| Paid Media | `paid-media` | PLANNER | → CHIEF |
| Game Development | `game-dev` | WORKER | → REVIEWER → CHIEF |

## Agent-to-Role Detailed Mapping

### 🔵 WORKER Robot (Engineering Division - 23 agents)
Handles all code writing, implementation, and technical work.

| Agency Agent | OfficeBot Role | Specialization | Trigger Condition |
|-------------|---------------|----------------|-------------------|
| `engineering-frontend-developer` | WORKER/web | Frontend, UI components | Tasks tagged `frontend`, `ui`, `web` |
| `engineering-backend-architect` | WORKER/api | API design, server architecture | Tasks tagged `backend`, `api`, `server` |
| `engineering-code-reviewer` | WORKER→REVIEWER | Code quality review | Auto-triggered on PR creation |
| `engineering-devops-automator` | WORKER→BUILDER | CI/CD pipelines, automation | Tasks tagged `devops`, `ci`, `deploy` |
| `engineering-security-engineer` | WORKER/sec | Security audits, vulnerability fixes | Tasks tagged `security`, `auth`, `vuln` |
| `engineering-sre` | WORKER→BUILDER | Reliability, monitoring, SLOs | Tasks tagged `sre`, `monitoring`, `uptime` |
| `engineering-senior-developer` | WORKER/lead | Complex features, architecture decisions | Priority tasks, technical debt |
| `engineering-rapid-prototyper` | WORKER/proto | Quick MVPs, proof of concepts | Tasks tagged `prototype`, `mvp`, `spike` |
| `engineering-ai-engineer` | WORKER/ai | ML pipelines, AI integrations | Tasks tagged `ai`, `ml`, `model` |
| `engineering-data-engineer` | WORKER/data | Data pipelines, ETL, warehousing | Tasks tagged `data`, `etl`, `pipeline` |
| `engineering-database-optimizer` | WORKER/db | Query optimization, schema design | Tasks tagged `database`, `sql`, `query` |
| `engineering-software-architect` | WORKER/arch | System design, tech stack decisions | Tasks tagged `architecture`, `design` |
| `engineering-mobile-app-builder` | WORKER/mobile | iOS/Android development | Tasks tagged `mobile`, `ios`, `android` |
| `engineering-technical-writer` | WORKER/docs | Documentation, API docs | Tasks tagged `docs`, `documentation` |
| `engineering-git-workflow-master` | WORKER/git | Git strategies, branching | Tasks tagged `git`, `branch`, `merge` |
| `engineering-ai-data-remediation-engineer` | WORKER/ai-data | Data cleaning, AI data prep | Tasks tagged `data-cleanup`, `remediation` |
| `engineering-autonomous-optimization-architect` | WORKER/opt | Performance optimization | Tasks tagged `optimize`, `performance` |
| `engineering-embedded-firmware-engineer` | WORKER/embedded | Embedded systems, IoT | Tasks tagged `embedded`, `iot`, `firmware` |
| `engineering-incident-response-commander` | WORKER/irc | Incident management, P0 response | P0/P1 incidents, outages |
| `engineering-threat-detection-engineer` | WORKER/threat | Threat detection, security monitoring | Tasks tagged `threat`, `ids`, `detection` |
| `engineering-solidity-smart-contract-engineer` | WORKER/web3 | Smart contracts, blockchain | Tasks tagged `web3`, `solidity`, `contract` |
| `engineering-feishu-integration-developer` | WORKER/feishu | Feishu/Lark integrations | Tasks tagged `feishu`, `lark` |
| `engineering-wechat-mini-program-developer` | WORKER/wechat | WeChat mini-programs | Tasks tagged `wechat`, `miniprogram` |

### 🟡 REVIEWER Robot (Design + Testing - 16 agents)
Handles quality assurance, code review, and design review.

| Agency Agent | OfficeBot Role | Specialization | Trigger Condition |
|-------------|---------------|----------------|-------------------|
| `design-ui-designer` | REVIEWER/ui | UI design, visual components | Tasks tagged `design`, `ui`, `visual` |
| `design-ux-researcher` | REVIEWER/ux | User research, usability | Tasks tagged `ux`, `research`, `user-test` |
| `design-brand-guardian` | REVIEWER/brand | Brand consistency, guidelines | Tasks tagged `brand`, `identity`, `style` |
| `design-visual-storyteller` | REVIEWER/story | Visual narratives, presentations | Tasks tagged `presentation`, `story`, `visual` |
| `design-whimsy-injector` | REVIEWER/whimsy | Fun details, micro-interactions | Tasks tagged `whimsy`, `polish`, `delight` |
| `design-ux-architect` | REVIEWER/ux-arch | Information architecture | Tasks tagged `ia`, `navigation`, `flow` |
| `design-image-prompt-engineer` | REVIEWER/img | AI image generation prompts | Tasks tagged `image`, `prompt`, `ai-art` |
| `design-inclusive-visuals-specialist` | REVIEWER/a11y | Accessibility, inclusive design | Tasks tagged `a11y`, `inclusive`, `accessibility` |
| `testing-evidence-collector` | REVIEWER/evidence | Test evidence, screenshots, logs | Auto-triggered on test runs |
| `testing-reality-checker` | REVIEWER/reality | Validates outputs against specs | Auto-triggered before deployment |
| `testing-api-tester` | REVIEWER/api-test | API testing, contract tests | Tasks tagged `api-test`, `contract` |
| `testing-performance-benchmarker` | REVIEWER/perf | Performance benchmarks, load tests | Tasks tagged `benchmark`, `load-test` |
| `testing-accessibility-auditor` | REVIEWER/a11y-audit | WCAG compliance, a11y audits | Tasks tagged `a11y-audit`, `wcag` |
| `testing-test-results-analyzer` | REVIEWER/analyze | Test result analysis, trends | Post-test-run analysis |
| `testing-tool-evaluator` | REVIEWER/tools | Testing tool evaluation | Tasks tagged `test-tool`, `evaluation` |
| `testing-workflow-optimizer` | REVIEWER/workflow-opt | Test workflow optimization | Tasks tagged `test-workflow`, `ci-opt` |

### 🟠 PLANNER Robot (Product + PM + Marketing + Academic - 41 agents)
Handles planning, strategy, research, and task decomposition.

| Agency Agent | OfficeBot Role | Specialization | Trigger Condition |
|-------------|---------------|----------------|-------------------|
| `product-manager` | PLANNER/pm | Product strategy, roadmapping | Tasks tagged `product`, `roadmap`, `strategy` |
| `product-sprint-prioritizer` | PLANNER/sprint | Sprint planning, backlog grooming | Sprint start, backlog review |
| `product-trend-researcher` | PLANNER/trends | Market trends, competitive analysis | Tasks tagged `trend`, `research`, `market` |
| `product-feedback-synthesizer` | PLANNER/feedback | User feedback analysis | Tasks tagged `feedback`, `user-voice` |
| `product-behavioral-nudge-engine` | PLANNER/nudge | Behavioral design, engagement | Tasks tagged `engagement`, `retention`, `nudge` |
| `project-management-studio-producer` | PLANNER/producer | Studio operations, resource allocation | Studio-wide planning |
| `project-management-project-shepherd` | PLANNER/shepherd | Project tracking, delivery | Tasks tagged `delivery`, `milestone` |
| `project-management-experiment-tracker` | PLANNER/experiment | A/B tests, experiment tracking | Tasks tagged `experiment`, `ab-test` |
| `project-management-jira-workflow-steward` | PLANNER/jira | Workflow optimization | Tasks tagged `workflow`, `process` |
| `project-management-studio-operations` | PLANNER/ops | Operations, tooling, efficiency | Tasks tagged `operations`, `tools` |
| `project-manager-senior` | PLANNER/senior-pm | Complex project management | High-priority, multi-team projects |
| `marketing-growth-hacker` | PLANNER/growth | Growth strategies, viral loops | Tasks tagged `growth`, `viral`, `acquisition` |
| `marketing-content-creator` | PLANNER/content | Content creation, copywriting | Tasks tagged `content`, `copy`, `blog` |
| `marketing-seo-specialist` | PLANNER/seo | SEO optimization, keywords | Tasks tagged `seo`, `keywords`, `ranking` |
| `marketing-social-media-strategist` | PLANNER/social | Social media strategy | Tasks tagged `social`, `media` |
| `marketing-tiktok-strategist` | PLANNER/tiktok | TikTok marketing | Tasks tagged `tiktok`, `short-video` |
| `marketing-reddit-community-builder` | PLANNER/reddit | Reddit community management | Tasks tagged `reddit`, `community` |
| `marketing-twitter-engager` | PLANNER/twitter | Twitter/X engagement | Tasks tagged `twitter`, `x-platform` |
| `marketing-instagram-curator` | PLANNER/instagram | Instagram content curation | Tasks tagged `instagram`, `visual-content` |
| `marketing-linkedin-content-creator` | PLANNER/linkedin | LinkedIn content | Tasks tagged `linkedin`, `b2b` |
| `marketing-podcast-strategist` | PLANNER/podcast | Podcast strategy, production | Tasks tagged `podcast`, `audio` |
| `marketing-book-co-author` | PLANNER/book | Book writing, long-form content | Tasks tagged `book`, `long-form` |
| `marketing-carousel-growth-engine` | PLANNER/carousel | Carousel content, slides | Tasks tagged `carousel`, `slides` |
| `marketing-app-store-optimizer` | PLANNER/aso | App store optimization | Tasks tagged `aso`, `app-store` |
| `marketing-ai-citation-strategist` | PLANNER/ai-cite | AI search citations | Tasks tagged `ai-citation`, `ai-seo` |
| `marketing-baidu-seo-specialist` | PLANNER/baidu | Baidu SEO, Chinese market | Tasks tagged `baidu`, `china-seo` |
| `marketing-bilibili-content-strategist` | PLANNER/bilibili | Bilibili content strategy | Tasks tagged `bilibili`, `cn-video` |
| `marketing-douyin-strategist` | PLANNER/douyin | Douyin/TikTok China | Tasks tagged `douyin`, `cn-short-video` |
| `marketing-kuaishou-strategist` | PLANNER/kuaishou | Kuaishou platform | Tasks tagged `kuaishou` |
| `marketing-wechat-official-account` | PLANNER/wechat | WeChat official accounts | Tasks tagged `wechat-official`, `wechat-content` |
| `marketing-weibo-strategist` | PLANNER/weibo | Weibo marketing | Tasks tagged `weibo`, `cn-social` |
| `marketing-xiaohongshu-specialist` | PLANNER/xiaohongshu | Xiaohongshu/RED | Tasks tagged `xiaohongshu`, `red` |
| `marketing-zhihu-strategist` | PLANNER/zhihu | Zhihu content strategy | Tasks tagged `zhihu`, `cn-qa` |
| `marketing-livestream-commerce-coach` | PLANNER/livestream | Livestream commerce | Tasks tagged `livestream`, `live-commerce` |
| `marketing-cross-border-ecommerce` | PLANNER/cross-border | Cross-border e-commerce | Tasks tagged `cross-border`, `ecommerce` |
| `marketing-china-ecommerce-operator` | PLANNER/china-ecom | China e-commerce operations | Tasks tagged `china-ecom`, `tmall`, `jd` |
| `marketing-private-domain-operator` | PLANNER/private-domain | Private traffic, community ops | Tasks tagged `private-domain`, `community-ops` |
| `marketing-short-video-editing-coach` | PLANNER/video-edit | Short video editing | Tasks tagged `video-edit`, `short-video` |
| `academic-anthropologist` | PLANNER/anthro | Cultural analysis, user behavior | Tasks tagged `culture`, `anthropology` |
| `academic-historian` | PLANNER/history | Historical context, precedent | Tasks tagged `history`, `precedent` |
| `academic-psychologist` | PLANNER/psych | User psychology, motivation | Tasks tagged `psychology`, `behavior` |
| `academic-geographer` | PLANNER/geo | Spatial analysis, location | Tasks tagged `geography`, `location`, `spatial` |
| `academic-narratologist` | PLANNER/narrative | Narrative structure, storytelling | Tasks tagged `narrative`, `story-structure` |

### 🟢 BUILDER Robot (Paid Media + DevOps/SRE tasks - 7 agents)
Handles infrastructure, deployment, and paid media operations.

| Agency Agent | OfficeBot Role | Specialization | Trigger Condition |
|-------------|---------------|----------------|-------------------|
| `paid-media-ppc-strategist` | BUILDER/ppc | PPC campaigns, ad spend | Tasks tagged `ppc`, `ad-spend`, `campaigns` |
| `paid-media-creative-strategist` | BUILDER/ad-creative | Ad creative, copy, visuals | Tasks tagged `ad-creative`, `ad-copy` |
| `paid-media-search-query-analyst` | BUILDER/query | Search query analysis, keywords | Tasks tagged `search-query`, `sem` |
| `paid-media-paid-social-strategist` | BUILDER/paid-social | Paid social campaigns | Tasks tagged `paid-social`, `fb-ads`, `ig-ads` |
| `paid-media-programmatic-buyer` | BUILDER/programmatic | Programmatic ad buying | Tasks tagged `programmatic`, `dsp`, `rtb` |
| `paid-media-tracking-specialist` | BUILDER/tracking | Ad tracking, pixels, attribution | Tasks tagged `tracking`, `pixel`, `attribution` |
| `paid-media-auditor` | BUILDER/audit | Ad account audits, optimization | Tasks tagged `ad-audit`, `account-review` |

### ⚪ CHIEF Robot (Sales + Orchestrator - 9 agents)
Handles high-level coordination, sales, and direct user interaction.

| Agency Agent | OfficeBot Role | Specialization | Trigger Condition |
|-------------|---------------|----------------|-------------------|
| `sales-outbound-strategist` | CHIEF/outbound | Outbound sales strategy | Tasks tagged `sales-outbound`, `cold-outreach` |
| `sales-deal-strategist` | CHIEF/deals | Deal strategy, negotiation | Tasks tagged `deal`, `negotiation`, `pricing` |
| `sales-discovery-coach` | CHIEF/discovery | Sales discovery calls | Tasks tagged `discovery`, `qualify` |
| `sales-proposal-strategist` | CHIEF/proposal | Proposal creation, RFPs | Tasks tagged `proposal`, `rfp`, `bid` |
| `sales-coach` | CHIEF/coach | Sales coaching, training | Tasks tagged `sales-training`, `coaching` |
| `sales-pipeline-analyst` | CHIEF/pipeline | Pipeline analysis, forecasting | Tasks tagged `pipeline`, `forecast`, `crm` |
| `sales-account-strategist` | CHIEF/account | Account planning, expansion | Tasks tagged `account`, `expansion`, `upsell` |
| `sales-engineer` | CHIEF/sales-eng | Technical sales, demos | Tasks tagged `demo`, `poc`, `technical-sales` |
| ORCHESTRATOR | CHIEF | System coordination | All tasks pass through CHIEF first |

## Workflow: Task → Agent Assignment

```
User sends task to Telegram
  ↓
CHIEF receives and classifies:
  ├─ Engineering task → WORKER
  ├─ Design/QA task → REVIEWER  
  ├─ Planning task → PLANNER
  ├─ Infra/deploy task → BUILDER
  └─ Sales task → CHIEF handles directly
  ↓
Assigned robot picks up task:
  ├─ Updates board: INBOX → PLAN → WORK → DONE
  ├─ Posts status to Telegram topic
  └─ On completion → routes to REVIEWER (if code)
  ↓
REVIEWER checks:
  ├─ APPROVED → moves to DONE, notifies CHIEF
  └─ CHANGES → back to WORK → WORKER
  ↓
CHIEF reports to Anton in main Telegram chat
```

## Integration with Existing OfficeBot Pipeline

The agency-agents extend (not replace) the existing pipeline:
- **PLANNER** role maps to product/project managers from agency-agents
- **WORKER** role maps to all engineering agents
- **REVIEWER** role maps to testing + design agents
- **BUILDER** (new) role maps to devops + paid media agents
- **CHIEF** (enhanced) role includes sales + orchestrator functions

## File Structure
```
office/agents/agency/
├── MAPPING.md                    ← This file
├── academic/                     (5 agents)
│   ├── academic-anthropologist.md
│   ├── academic-geographer.md
│   ├── academic-historian.md
│   ├── academic-narratologist.md
│   └── academic-psychologist.md
├── design/                       (8 agents)
├── engineering/                  (23 agents)
├── game-development/             (17 agents)
│   ├── blender/
│   ├── godot/
│   ├── roblox-studio/
│   ├── unity/
│   └── unreal-engine/
├── marketing/                    (27 agents)
├── paid-media/                   (7 agents)
├── product/                      (5 agents)
├── project-management/           (6 agents)
├── sales/                        (8 agents)
└── testing/                      (8 agents)
```

Total: **117 agent definitions** across **10 divisions**
