# Claude Chat Search

Full-text search across all your Claude Code conversations.

Claude Code's built-in `/resume` picker searches by conversation name only. This plugin searches through the **actual content** of every message, tool call, and tool result in every conversation — so you can find that one session where you discussed a specific topic, API, or decision.

## What it does

- Searches through all `.jsonl` conversation files across all projects
- Searches user messages, assistant messages, **and tool results** (MCP outputs, web searches, etc.)
- Supports plain text search and **regex patterns**
- Configurable context window for match snippets
- Shows matching conversations ranked by number of matches
- Provides UUIDs for easy `claude --resume` access
- Zero dependencies — just Node.js built-ins

## Install

### As a Claude Code plugin (recommended)

```bash
claude plugin install --source https://github.com/danutmitrut/claude-chat-search.git
```

Then restart Claude Code. The `/chat-search` command will be available.

### Manual install via Claude Code

Open Claude Code in VS Code and paste this as a single message:

```
Install the chat-search tool. Follow these steps exactly:

1. Clone the repo:
git clone https://github.com/danutmitrut/claude-chat-search.git /tmp/claude-chat-search

2. Copy the search script:
mkdir -p ~/.claude/tools
cp /tmp/claude-chat-search/scripts/chat-search.js ~/.claude/tools/chat-search.js

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

## Usage

After install, restart Claude Code (or `/clear`), then use:

```
/chat-search supabase
/chat-search landing page
/chat-search auth middleware
```

### Regex search

Use `--regex` (or `-r`) to search with regex patterns:

```
/chat-search supabase.*auth --regex
/chat-search error.*404 -r
```

### Custom context window

Use `--context N` (or `-c N`) to control how many characters are shown around each match (default: 40):

```
/chat-search deploy --context 80
/chat-search migration -c 100
```

### Combined

```
/chat-search supabase.*rls --regex --context 80
```

## Example output

```
"supabase.*auth" (regex) — 12 conversation(s) found

1. [224 matches] Built reservation form with database integration
   2/25/2026 | 7262 msgs | 5f9f961a...
   > [assistant] msg #13: ...configured Supabase real (credentials + table)...
   > [tool] msg #103: ...POST "https://xyz.supabase.co/rest/v1/rpc" -H "apikey:...
   > [tool] msg #105: ...POST "https://api.supabase.com/v1/projects/xyz/database...

2. [64 matches] Explored ccforeveryone.com tools
   2/22/2026 | 2112 msgs | 9f21a9ba...
   > [assistant] msg #207: ...Context7, Playwright, Supabase, GitHub configured...
```

Note: `[tool]` results are included in search — this catches MCP outputs, web searches, command results, and other tool interactions that the built-in search misses entirely.

## How it works

Claude Code stores conversations as `.jsonl` files in `~/.claude/projects/`. Each line is a JSON object containing messages. The script reads every file, parses every message (including tool use and tool results), and searches through the text content.

It's read-only — never modifies your conversation files.

### Technical note for contributors

Tool results in Claude Code's `.jsonl` files are stored as `tool_result` blocks inside **user messages**, not assistant messages. This is non-obvious and not documented — it was discovered by inspecting the actual files. The `content` field of a `tool_result` can be either a plain string (e.g. bash output) or an array of sub-blocks with `type: "text"` (e.g. MCP responses from Gmail, Supabase, etc.). The parser handles both cases.

## License

MIT
