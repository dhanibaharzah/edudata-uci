/* ============================================================
   PUTER AI CALL
   ============================================================ */
async function callPuterAI(messages, { model = 'gpt-5.4-nano', onChunk } = {}) {
  const response = await puter.ai.chat(messages, { model, stream: true });
  let fullText = '';
  for await (const part of response) {
    if (part?.type === 'error') throw new Error(part.message || 'AI error');
    const text = part?.text || '';
    if (text) { fullText += text; if (onChunk) onChunk(fullText); }
  }
  return fullText || 'Maaf, tidak ada respons.';
}

/* ============================================================
   CHAT UI
   ============================================================ */
function createChatUI(containerId, { placeholder, onSend, systemNote = null, welcomeText = null }) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="chat-container">
      <div class="chat-messages" id="${containerId}-messages">
        ${systemNote ? `<div class="chat-msg system-note">${systemNote}</div>` : ''}
        ${welcomeText ? `<div class="chat-msg assistant">${parseMarkdown(welcomeText)}</div>` : ''}
      </div>
      <div class="chat-input-wrap">
        <textarea id="${containerId}-input" placeholder="${placeholder}" rows="1"></textarea>
        <button class="btn btn-primary" id="${containerId}-send">Kirim</button>
      </div>
      <div class="powered-footer">Didukung oleh <a href="https://developer.puter.com" target="_blank">Puter.js</a></div>
    </div>`;
  const input = document.getElementById(`${containerId}-input`);
  const sendBtn = document.getElementById(`${containerId}-send`);
  const messagesEl = document.getElementById(`${containerId}-messages`);
  let busy = false;

  function appendUserMsg(text) {
    const div = document.createElement('div');
    div.className = 'chat-msg user';
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }
  function appendAssistantMsg() {
    const div = document.createElement('div');
    div.className = 'chat-msg assistant';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }
  function setBusy(b) {
    busy = b;
    sendBtn.disabled = b;
    sendBtn.textContent = b ? 'Menganalisis…' : 'Kirim';
    input.disabled = b;
  }
  async function sendMessage(displayText, apiText = null) {
    if (busy) return;
    appendUserMsg(displayText);
    const asstEl = appendAssistantMsg();
    asstEl.innerHTML = '<span class="typing-cursor">▋</span>';
    setBusy(true);
    try {
      const finalText = await onSend(apiText || displayText, (partial) => {
        asstEl.innerHTML = parseMarkdownWithCursor(partial);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      });
      asstEl.innerHTML = parseMarkdown(finalText || '');
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } catch (err) {
      asstEl.innerHTML = `<div class="chat-error">⚠️ Gagal memproses: ${escapeHtml(err?.message || 'kesalahan tidak dikenal')}. Pastikan Anda sudah login ke Puter dan coba lagi.</div>`;
    } finally {
      setBusy(false);
      input.focus();
    }
  }
  async function send() {
    const text = input.value.trim();
    if (!text || busy) return;
    input.value = '';
    await sendMessage(text);
  }
  sendBtn.addEventListener('click', send);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
  return { sendMessage, messagesEl };
}
