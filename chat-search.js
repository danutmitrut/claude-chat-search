#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

// Parse flags
const args = process.argv.slice(2);
let useRegex = false;
let contextSize = 40;
const queryParts = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--regex' || args[i] === '-r') {
    useRegex = true;
  } else if (args[i] === '--context' || args[i] === '-c') {
    contextSize = parseInt(args[++i]) || 40;
  } else {
    queryParts.push(args[i]);
  }
}

const query = queryParts.join(' ');

if (!query) {
  console.log('Usage: node chat-search.js <keyword> [--regex] [--context N]');
  console.log('  --regex, -r      Treat query as regex pattern');
  console.log('  --context N, -c N  Context window size (default: 40 chars)');
  process.exit(1);
}

// Build matcher
let matcher;
if (useRegex) {
  try {
    matcher = new RegExp(query, 'i');
  } catch (e) {
    console.log(`Invalid regex: "${query}" — ${e.message}`);
    process.exit(1);
  }
} else {
  matcher = null; // use simple includes
}

const queryLower = query.toLowerCase();

function textMatches(text) {
  if (matcher) return matcher.test(text);
  return text.toLowerCase().includes(queryLower);
}

function findMatchIndex(text) {
  if (matcher) {
    const m = text.match(matcher);
    return m ? text.toLowerCase().indexOf(m[0].toLowerCase()) : -1;
  }
  return text.toLowerCase().indexOf(queryLower);
}

const projectsDir = path.join(os.homedir(), '.claude', 'projects');

if (!fs.existsSync(projectsDir)) {
  console.log('Could not find Claude projects directory.');
  process.exit(1);
}

const results = [];

// Scan all project directories
const projectDirs = fs.readdirSync(projectsDir).filter(d => {
  return fs.statSync(path.join(projectsDir, d)).isDirectory();
});

for (const projDir of projectDirs) {
  const projPath = path.join(projectsDir, projDir);
  const files = fs.readdirSync(projPath).filter(f => f.endsWith('.jsonl'));

  for (const file of files) {
    const filePath = path.join(projPath, file);
    const uuid = file.replace('.jsonl', '');

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      const matches = [];
      let firstUserMsg = '';
      let msgCount = 0;
      let lastDate = null;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);

          // User messages
          if (entry.message && entry.message.role === 'user') {
            msgCount++;
            const text = extractText(entry.message.content);

            if (!firstUserMsg && text) {
              firstUserMsg = text.slice(0, 80);
            }

            if (textMatches(text)) {
              matches.push({
                role: 'user',
                preview: getMatchContext(text),
                msgNum: msgCount
              });
            }

            // Tool results embedded in user messages
            if (Array.isArray(entry.message.content)) {
              for (const block of entry.message.content) {
                if (block.type === 'tool_result') {
                  const toolText = extractToolText(block);
                  if (toolText && textMatches(toolText)) {
                    matches.push({
                      role: 'tool',
                      preview: getMatchContext(toolText),
                      msgNum: msgCount
                    });
                  }
                }
              }
            }
          }

          // Assistant messages
          if (entry.message && entry.message.role === 'assistant') {
            msgCount++;
            const text = extractText(entry.message.content);

            if (textMatches(text)) {
              matches.push({
                role: 'assistant',
                preview: getMatchContext(text),
                msgNum: msgCount
              });
            }

            // Tool results within assistant content
            if (Array.isArray(entry.message.content)) {
              for (const block of entry.message.content) {
                if (block.type === 'tool_result' || block.type === 'tool_use') {
                  const toolText = extractToolText(block);
                  if (toolText && textMatches(toolText)) {
                    matches.push({
                      role: 'tool',
                      preview: getMatchContext(toolText),
                      msgNum: msgCount
                    });
                  }
                }
              }
            }
          }

          // Tool results as separate entries
          if (entry.type === 'tool_result' || entry.tool_result) {
            const toolText = extractToolText(entry.tool_result || entry);
            if (toolText && textMatches(toolText)) {
              matches.push({
                role: 'tool',
                preview: getMatchContext(toolText),
                msgNum: msgCount
              });
            }
          }

          if (entry.timestamp) {
            lastDate = entry.timestamp;
          }
        } catch (e) {
          // skip malformed lines
        }
      }

      if (matches.length > 0) {
        results.push({
          uuid,
          project: projDir,
          firstUserMsg,
          matchCount: matches.length,
          totalMsgs: msgCount,
          lastDate: lastDate ? new Date(lastDate).toLocaleDateString() : 'unknown',
          topMatches: matches.slice(0, 3)
        });
      }
    } catch (e) {
      // skip unreadable files
    }
  }
}

// Sort by match count descending
results.sort((a, b) => b.matchCount - a.matchCount);

if (results.length === 0) {
  console.log(`No results for "${query}".`);
  process.exit(0);
}

const mode = useRegex ? 'regex' : 'text';
console.log(`\n"${query}" (${mode}) — ${results.length} conversation(s) found\n`);

for (let i = 0; i < results.length; i++) {
  const r = results[i];
  console.log(`${i + 1}. [${r.matchCount} matches] ${r.firstUserMsg || '(untitled)'}`);
  console.log(`   ${r.lastDate} | ${r.totalMsgs} msgs | ${r.uuid.slice(0, 8)}...`);

  for (const m of r.topMatches) {
    console.log(`   > [${m.role}] msg #${m.msgNum}: ...${m.preview}...`);
  }
  console.log('');
}

// Helper functions

function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join(' ');
  }
  return '';
}

function extractToolText(block) {
  if (!block) return '';
  if (typeof block === 'string') return block;
  if (block.content) return extractText(block.content);
  if (block.output) return typeof block.output === 'string' ? block.output : JSON.stringify(block.output);
  if (block.input) return typeof block.input === 'string' ? block.input : JSON.stringify(block.input);
  return '';
}

function getMatchContext(text) {
  const idx = findMatchIndex(text);
  if (idx === -1) return text.slice(0, contextSize * 2);

  const start = Math.max(0, idx - contextSize);
  const end = Math.min(text.length, idx + query.length + contextSize);
  return text.slice(start, end).replace(/\n/g, ' ').trim();
}
