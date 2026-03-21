---
description: Full-text search across all Claude Code conversations
---

Search through the full content of all Claude Code conversations (not just titles/names).

Run:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/chat-search.js $ARGUMENTS
```

Supports flags:
- `--regex` or `-r` — treat query as regex pattern
- `--context N` or `-c N` — context window size in chars (default: 40)

If no arguments provided, ask the user what they want to search for.

Present results clearly:
- Conversation title, match count, date, message count
- Top 3 relevant snippets per conversation
- UUID for resume (offer `claude --resume <uuid>` if the user wants to resume one)
