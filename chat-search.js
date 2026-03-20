#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const query = process.argv.slice(2).join(' ').toLowerCase();

if (!query) {
  console.log('Usage: node chat-search.js <keyword>');
  process.exit(1);
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

          if (entry.message && entry.message.role === 'user') {
            msgCount++;
            const text = extractText(entry.message.content);

            if (!firstUserMsg && text) {
              firstUserMsg = text.slice(0, 80);
            }

            if (text.toLowerCase().includes(query)) {
              matches.push({
                role: 'user',
                preview: getMatchContext(text, query),
                msgNum: msgCount
              });
            }
          }

          if (entry.message && entry.message.role === 'assistant') {
            msgCount++;
            const text = extractText(entry.message.content);

            if (text.toLowerCase().includes(query)) {
              matches.push({
                role: 'assistant',
                preview: getMatchContext(text, query),
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

console.log(`\n"${query}" — ${results.length} conversation(s) found\n`);

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

function getMatchContext(text, query) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query);
  if (idx === -1) return text.slice(0, 100);

  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 40);
  return text.slice(start, end).replace(/\n/g, ' ').trim();
}
