# Marketing Division — OfficeBot Integration

## Division Overview
- **Source**: `agents/agency/marketing/*.md`
- **Total Agents**: 27
- **Primary Robot**: PLANNER
- **Zone**: Product Zone (orange)
- **Telegram Topic**: `marketing`
- **Escalation**: PLANNER → CHIEF

## Agent Mapping

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 1 | `marketing-ai-citation-strategist` | PLANNER/ai-cite | PLANNER | AI citation optimization, GEO | `ai-citation`, `geo`, `llm-visibility` |
| 2 | `marketing-app-store-optimizer` | PLANNER/aso | PLANNER | App store optimization | `aso`, `app-store`, `store-listing` |
| 3 | `marketing-baidu-seo-specialist` | PLANNER/baidu | PLANNER | Baidu SEO, China search | `baidu`, `china-seo` |
| 4 | `marketing-bilibili-content-strategist` | PLANNER/bilibili | PLANNER | Bilibili content strategy | `bilibili`, `china-video` |
| 5 | `marketing-book-co-author` | PLANNER/book | PLANNER | Book writing, long-form content | `book`, `longform`, `authoring` |
| 6 | `marketing-carousel-growth-engine` | PLANNER/carousel | PLANNER | Carousel content growth | `carousel`, `linkedin-carousel` |
| 7 | `marketing-china-ecommerce-operator` | PLANNER/cn-ecom | PLANNER | China e-commerce operations | `china-ecommerce`, `tmall`, `jd` |
| 8 | `marketing-content-creator` | PLANNER/content | PLANNER | Content creation, copywriting | `content`, `copy`, `blog` |
| 9 | `marketing-cross-border-ecommerce` | PLANNER/xborder | PLANNER | Cross-border e-commerce | `cross-border`, `international` |
| 10 | `marketing-douyin-strategist` | PLANNER/douyin | PLANNER | Douyin/TikTok China strategy | `douyin`, `tiktok-cn` |
| 11 | `marketing-growth-hacker` | PLANNER/growth | PLANNER | Growth hacking, viral loops | `growth`, `viral`, `experiment` |
| 12 | `marketing-instagram-curator` | PLANNER/ig | PLANNER | Instagram content curation | `instagram`, `ig`, `visual-content` |
| 13 | `marketing-kuaishou-strategist` | PLANNER/kuaishou | PLANNER | Kuaishou short video strategy | `kuaishou`, `short-video-cn` |
| 14 | `marketing-linkedin-content-creator` | PLANNER/linkedin | PLANNER | LinkedIn content, B2B | `linkedin`, `b2b-content` |
| 15 | `marketing-livestream-commerce-coach` | PLANNER/livestream | PLANNER | Livestream commerce coaching | `livestream`, `live-commerce` |
| 16 | `marketing-podcast-strategist` | PLANNER/podcast | PLANNER | Podcast strategy, distribution | `podcast`, `audio-content` |
| 17 | `marketing-private-domain-operator` | PLANNER/private | PLANNER | Private domain marketing | `private-domain`, `wechat-funnel` |
| 18 | `marketing-reddit-community-builder` | PLANNER/reddit | PLANNER | Reddit community building | `reddit`, `community`, `reddit-growth` |
| 19 | `marketing-seo-specialist` | PLANNER/seo | PLANNER | SEO optimization, search ranking | `seo`, `search`, `ranking` |
| 20 | `marketing-short-video-editing-coach` | PLANNER/video-edit | PLANNER | Short video editing coaching | `video-edit`, `short-video` |
| 21 | `marketing-social-media-strategist` | PLANNER/social | PLANNER | Social media strategy | `social`, `social-media`, `smm` |
| 22 | `marketing-tiktok-strategist` | PLANNER/tiktok | PLANNER | TikTok global strategy | `tiktok`, `short-video` |
| 23 | `marketing-twitter-engager` | PLANNER/twitter | PLANNER | Twitter/X engagement strategy | `twitter`, `x-platform`, `engagement` |
| 24 | `marketing-wechat-official-account` | PLANNER/wechat | PLANNER | WeChat official account | `wechat`, `wechat-oa` |
| 25 | `marketing-weibo-strategist` | PLANNER/weibo | PLANNER | Weibo strategy, China social | `weibo`, `china-social` |
| 26 | `marketing-xiaohongshu-specialist` | PLANNER/xiaohongshu | PLANNER | Xiaohongshu (RED) marketing | `xiaohongshu`, `red`, `little-red-book` |
| 27 | `marketing-zhihu-strategist` | PLANNER/zhihu | PLANNER | Zhihu content strategy | `zhihu`, `china-qa`, `thought-leadership` |

## Integration Notes
- All 27 marketing agents map to PLANNER — marketing strategy informs planning
- Marketing zone uses shared Product Zone (orange)
- Heavy China-market presence (10 China-specific agents)
- Content strategy feeds into project prioritization

## Telegram Commands
- `/marketing_status` — show all marketing agents status
- `/marketing_seo [url]` — SEO analysis request
- `/marketing_content [topic]` — content creation brief
- `/marketing_growth [metric]` — growth hacking experiment
- `/marketing_china [platform]` — China market strategy

## Workflows
1. **Content Strategy** → CHIEF → PLANNER (content-creator) → brief → WORKER → REVIEWER → publish
2. **SEO Audit** → PLANNER (seo-specialist) → analysis → recommendations → WORKER
3. **Growth Experiment** → PLANNER (growth-hacker) → experiment design → execute → analyze
4. **China Market** → PLANNER (china agents) → strategy → localize → execute
