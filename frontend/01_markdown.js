

/* ============================================================
   MARKDOWN PARSER (self-contained, no dependencies)
   ============================================================ */
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseMarkdown(md) {
  if (!md) return '';
  let text = String(md).replace(/\r\n/g, '\n');

  // 1. Extract fenced code blocks (protect from inline processing)
  const codeBlocks = [];
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (m, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="md-code-block"><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`);
    return `\u0000CB${idx}\u0000`;
  });

  // 2. Escape HTML everywhere else
  text = escapeHtml(text);

  // 3. Inline code (must be before bold/italic to protect content)
  const inlineCodes = [];
  text = text.replace(/`([^`\n]+)`/g, (m, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code class="md-inline-code">${code}</code>`);
    return `\u0000IC${idx}\u0000`;
  });

  // 4. Headings
  text = text.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
  text = text.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
  text = text.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
  text = text.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // 5. Horizontal rule
  text = text.replace(/^\s*---+\s*$/gm, '<hr class="md-hr">');

  // 6. Blockquote (merge consecutive > lines into one block)
  text = text.replace(/(^>\s?.+(\n>.*)*$)/gm, (match) => {
    const content = match.split('\n').map(l => l.replace(/^>\s?/, '')).join('<br>');
    return `<blockquote class="md-blockquote">${content}</blockquote>`;
  });

  // 7. Bold & italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  text = text.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

  // 8. Links
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // 9. Tables
  const lines = text.split('\n');
  const withTables = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const next = lines[i + 1];
    if (/^\s*\|.+\|\s*$/.test(line) && next && /^\s*\|[\s\-:|]+\|\s*$/.test(next)) {
      const headers = line.trim().split('|').slice(1, -1).map(c => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
        rows.push(lines[i].trim().split('|').slice(1, -1).map(c => c.trim()));
        i++;
      }
      const thead = '<thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
      const tbody = '<tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody>';
      withTables.push(`<div class="md-table-wrap"><table class="md-table">${thead}${tbody}</table></div>`);
      continue;
    }
    withTables.push(line);
    i++;
  }
  text = withTables.join('\n');

  // 10. Lists
  const lines2 = text.split('\n');
  const withLists = [];
  let inUl = false, inOl = false;
  for (const line of lines2) {
    const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ulMatch) {
      if (inOl) { withLists.push('</ol>'); inOl = false; }
      if (!inUl) { withLists.push('<ul class="md-list">'); inUl = true; }
      withLists.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (inUl) { withLists.push('</ul>'); inUl = false; }
      if (!inOl) { withLists.push('<ol class="md-list">'); inOl = true; }
      withLists.push(`<li>${olMatch[1]}</li>`);
    } else {
      if (inUl) { withLists.push('</ul>'); inUl = false; }
      if (inOl) { withLists.push('</ol>'); inOl = false; }
      withLists.push(line);
    }
  }
  if (inUl) withLists.push('</ul>');
  if (inOl) withLists.push('</ol>');
  text = withLists.join('\n');

  // 11. Paragraph wrapping
  const lines3 = text.split('\n');
  const withParas = [];
  let paraBuf = [];
  const flushPara = () => {
    if (!paraBuf.length) return;
    const content = paraBuf.join('<br>').trim();
    if (content) withParas.push(`<p class="md-p">${content}</p>`);
    paraBuf = [];
  };
  const blockLevelRegex = /^<\/?(h[1-6]|ul|ol|li|pre|table|thead|tbody|tr|th|td|div|blockquote|hr)/;
  for (const line of lines3) {
    const trimmed = line.trim();
    if (!trimmed) { flushPara(); continue; }
    if (blockLevelRegex.test(trimmed)) { flushPara(); withParas.push(line); }
    else paraBuf.push(line);
  }
  flushPara();
  text = withParas.join('\n');

  // 12. Restore inline code & code blocks
  text = text.replace(/\u0000IC(\d+)\u0000/g, (m, idx) => inlineCodes[+idx]);
  text = text.replace(/\u0000CB(\d+)\u0000/g, (m, idx) => codeBlocks[+idx]);

  return text;
}

function parseMarkdownWithCursor(text) {
  let html = parseMarkdown(text);
  const cursor = '<span class="typing-cursor">▋</span>';
  if (html.endsWith('</p>')) return html.slice(0, -4) + cursor + '</p>';
  if (html.endsWith('</li>')) return html.slice(0, -5) + cursor + '</li>';
  if (html.endsWith('</td>')) return html.slice(0, -5) + cursor + '</td>';
  if (html.endsWith('</h1>') || html.endsWith('</h2>') || html.endsWith('</h3>') ||
      html.endsWith('</h4>') || html.endsWith('</h5>') || html.endsWith('</h6>')) {
    return html.replace(/<\/h([1-6])>$/, cursor + '</h$1>');
  }
  return html + cursor;
}

