# Claude Chat Search

Full-text search across all your Claude Code conversations.

Claude Code's built-in `/resume` picker searches by conversation name only. This tool searches through the **actual content** of every message in every conversation — so you can find that one session where you discussed a specific topic, API, or decision.

## What it does

- Searches through all `.jsonl` conversation files across all projects
- Shows matching conversations ranked by number of matches
- Displays context snippets around each match
- Provides UUIDs for easy `claude --resume` access
- Zero dependencies — just Node.js built-ins

## Install

Open Claude Code in VS Code and paste this as a single message:

```
Install the chat-search tool. Follow these steps exactly:

1. Clone the repo:
git clone https://github.com/danutmitrut/claude-chat-search.git /tmp/claude-chat-search

2. Copy the search script:
mkdir -p ~/.claude/tools
cp /tmp/claude-chat-search/chat-search.js ~/.claude/tools/chat-search.js

3. Create the command file ~/.claude/commands/chat-search.md with this content:

---
description: Full-text search across all Claude Code conversations
---

Search through the full content of all Claude Code conversations (not just titles/names).

Run:
node ~/.claude/tools/chat-search.js $ARGUMENTS

If no arguments provided, ask the user what they want to search for.

Present results clearly:
- Conversation title, match count, date, message count
- Top 3 relevant snippets per conversation
- UUID for resume (offer claude --resume <uuid> if the user wants to resume one)

4. Clean up: rm -rf /tmp/claude-chat-search

5. Test it: run /chat-search supabase (or any keyword relevant to you)
```

## After install

Restart Claude Code (or `/clear`), then use:

```
/chat-search supabase
/chat-search landing page
/chat-search auth middleware
```

You'll see something like:

```
"supabase" — 23 conversation(s) found

1. [426 matches] Built reservation form with database integration
   25.02.2026 | 7262 msgs | 5f9f961a...
   > [assistant] msg #13: ...configured Supabase real (credentials + table)...
   > [assistant] msg #25: ...lib/supabase.ts created (helper connection)...

2. [64 matches] Explored ccforeveryone.com tools
   22.02.2026 | 2112 msgs | 9f21a9ba...
   > [assistant] msg #207: ...Context7, Playwright, Supabase, GitHub configured...
```

## How it works

Claude Code stores conversations as `.jsonl` files in `~/.claude/projects/`. Each line is a JSON object containing messages. The script reads every file, parses every message, and searches through the text content.

It's read-only — never modifies your conversation files.

## Manual usage

You can also run it directly without the `/chat-search` command:

```bash
node ~/.claude/tools/chat-search.js "your search term"
```

## License

MIT
