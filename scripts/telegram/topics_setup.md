# Telegram Topics Setup — Manual Steps Required

## 1. Create Group (Manual — Telegram doesn't allow bots to create groups)
1. Open Telegram → New Group → Name: **"OfficeBot Agents"**
2. Add **@Antony_Helper_Bot** as member
3. Group Settings → **Topics** → Enable (turns group into Forum)
4. Promote bot to **Admin** with permissions: Manage Topics, Send Messages, Pin Messages

## 5. Get Group Chat ID
After creating, send `/chatid` in the group, or use:
```
curl "https://api.telegram.org/bot8642936151:AAFvKt0MY3XAlYst6SP6ek5REaul8D_JgUs/getUpdates"
```
Look for `"chat":{"id":-100XXXXXXXXXX}` — that's your GROUP_ID.

## 6. Create Topics
Once group is created and bot is admin, run:
```bash
bash /home/antonbot/.openclaw/workspace/office/scripts/telegram/create_topics.sh GROUP_ID
```

## Topic Structure
| Topic Name | Purpose | Agent |
|-----------|---------|-------|
| 🏠 Главный | Main status, pipeline overview | Chief (main) |
| 📋 Planner | Planning, task breakdown | planner |
| 🔧 Worker | Code changes, commits | worker |
| 🔍 Reviewer | Code review results | reviewer |
| 🏗️ Builder | CI, deploy, WASM | builder |
| 👁️ VReviewer | Visual review, screenshots | vreviewer |
