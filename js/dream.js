/* ============================================================
   dream.js — ตีเลขจากความฝัน (Dream Lottery Interpreter)
   Chat UI + multi-conversation history (LocalStorage) + voice input
   ============================================================ */

'use strict';

const DREAM_SYSTEM_PROMPT = `คุณคือ "เทพซ่า" หมอดูผู้เชี่ยวชาญด้านการตีเลขจากความฝัน ตามหลักไสยศาสตร์ไทย และตำราทายฝันไทยโบราณ

กฎการตอบ:
1. วิเคราะห์ความฝันที่ผู้ใช้บอกอย่างละเอียด อธิบายความหมายทางไสยศาสตร์ไทย
2. ตีเลขออกมาดังนี้:
   - เลข 2 ตัวบน (XX)
   - เลข 2 ตัวล่าง (XX)  
   - เลข 3 ตัวบน (XXX)
   - เลข 3 ตัวล่าง (XXX)
   - เลขชุด 6 ตัว (XXXXXX) 
3. อธิบายเหตุผลว่าทำไมถึงตีออกมาเป็นเลขนั้น ๆ
4. พูดในสไตล์หมอดูไทย ใช้ภาษาไทยที่น่าเชื่อถือและมีความลึกลับ
5. ใส่เครื่องหมาย ✨ 🔮 🌙 เพื่อเพิ่มบรรยากาศ
6. จบด้วยข้อความให้กำลังใจ

รูปแบบเลขที่ต้องตอบ (ต้องมีเสมอ):
LOTTERY_RESULT:
2ตัวบน: XX
2ตัวล่าง: XX
3ตัวบน: XXX
3ตัวล่าง: XXX
6ตัว: XXXXXX
END_RESULT`;

const DREAM_MAX_MESSAGES = 200;
const DREAM_NEW_TITLE    = 'ความฝันใหม่';

// ---- Helpers ----
function dreamUid() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function dreamTitleFrom(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return DREAM_NEW_TITLE;
  return clean.length > 32 ? clean.slice(0, 32).trimEnd() + '…' : clean;
}

function dreamDateLabel(ts) {
  const d = new Date(ts || Date.now());
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

function dreamEscape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ============================================================
   Conversation store (LocalStorage)
   ============================================================ */
const DreamStore = {
  load() {
    const raw = Store.get(STORAGE.DREAM_CHATS, null);
    if (raw === null) return this._migrateLegacy();
    return Array.isArray(raw)
      ? raw.filter(c => c && c.id && Array.isArray(c.messages))
      : [];
  },

  // ย้ายประวัติแบบเก่า (แชทเดียว) เข้ามาเป็นหนึ่งบทสนทนา
  _migrateLegacy() {
    const legacy = Store.get(STORAGE.DREAM_HISTORY, null);
    const convs = [];
    if (Array.isArray(legacy) && legacy.length) {
      const firstUser = legacy.find(m => m.role === 'user');
      convs.push({
        id:        dreamUid(),
        title:     dreamTitleFrom(firstUser?.content),
        tags:      ['ประวัติเดิม'],
        messages:  legacy,
        createdAt: legacy[0]?.ts || Date.now(),
        updatedAt: Date.now()
      });
    }
    Store.set(STORAGE.DREAM_CHATS, convs);
    Store.remove(STORAGE.DREAM_HISTORY);
    return convs;
  },

  save(list, activeId) {
    Store.set(STORAGE.DREAM_CHATS, list);
    if (activeId) Store.set(STORAGE.DREAM_ACTIVE, activeId);
    else Store.remove(STORAGE.DREAM_ACTIVE);
  },

  create() {
    const now = Date.now();
    return { id: dreamUid(), title: DREAM_NEW_TITLE, tags: [], messages: [], createdAt: now, updatedAt: now };
  }
};

/* ============================================================
   DreamChat — chatbot controller
   ============================================================ */
class DreamChat {
  constructor() {
    // DOM
    this.messagesEl  = document.getElementById('chat-messages');
    this.textarea    = document.getElementById('dream-input');
    this.sendBtn     = document.getElementById('btn-send-dream');
    this.sidebarList = document.getElementById('sidebar-list');
    this.ctxMenu     = document.getElementById('chat-context-menu');
    this.modalEl     = document.getElementById('chat-modal-overlay');
    this.modalTitle  = document.getElementById('chat-modal-title');
    this.modalInput  = document.getElementById('chat-modal-input');
    this.modalHint   = document.getElementById('chat-modal-hint');
    this.micBtn      = document.getElementById('btn-mic');

    // State
    this.isLoading   = false;
    this.ctxTarget   = null;
    this.modalMode   = null;
    this.modalTarget = null;
    this.recognition  = null;
    this.voiceBase    = '';
    this.voiceStarted = false;
    this.voiceWatchdog = null;
    this.listening    = false;

    // Conversations
    this.conversations = DreamStore.load();
    this.activeId = Store.get(STORAGE.DREAM_ACTIVE, null);
    if (!this.conversations.some(c => c.id === this.activeId)) this.activeId = null;

    this._bind();
    this._initVoice();
    this._renderSidebar();
    this._renderConversation();
    this._checkApiKey();
  }

  /* ---------- Getters ---------- */
  get active()   { return this.conversations.find(c => c.id === this.activeId) || null; }
  get messages() { return this.active ? this.active.messages : []; }

  _ensureConversation() {
    if (this.active) return this.active;
    const conv = DreamStore.create();
    this.conversations.unshift(conv);
    this.activeId = conv.id;
    this._save();
    this._renderSidebar();
    return conv;
  }

  _save() {
    DreamStore.save(this.conversations, this.activeId);
  }

  /* ---------- Events ---------- */
  _bind() {
    this.sendBtn?.addEventListener('click', () => this._send());

    this.textarea?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._send();
      }
    });
    this.textarea?.addEventListener('input', () => this._autoGrow());

    // Sidebar open/close
    document.getElementById('btn-sidebar-toggle')?.addEventListener('click', () => this._openSidebar());
    document.getElementById('btn-sidebar-close')?.addEventListener('click',  () => this._closeSidebar());
    document.getElementById('sidebar-overlay')?.addEventListener('click',    () => this._closeSidebar());
    document.getElementById('btn-new-chat')?.addEventListener('click',       () => this._startNewChat());

    // Context menu
    this.ctxMenu?.addEventListener('click', (e) => {
      const btn = e.target.closest('.ctx-item');
      if (!btn) return;
      const id = this.ctxTarget;
      const action = btn.dataset.action;
      this._closeContextMenu();
      if (!id) return;
      if (action === 'rename')      this._openModal('rename', id);
      else if (action === 'tag')    this._openModal('tag', id);
      else if (action === 'delete') this._deleteConversation(id);
    });

    document.addEventListener('click', (e) => {
      if (this.ctxMenu?.classList.contains('open') && !this.ctxMenu.contains(e.target)) this._closeContextMenu();
    });
    document.addEventListener('scroll', () => this._closeContextMenu(), true);
    window.addEventListener('resize', () => this._closeContextMenu());
    window.addEventListener('blur', () => this._closeContextMenu());

    // Modal
    document.getElementById('chat-modal-cancel')?.addEventListener('click', () => this._closeModal());
    document.getElementById('chat-modal-ok')?.addEventListener('click',     () => this._applyModal());
    this.modalEl?.addEventListener('click', (e) => { if (e.target === this.modalEl) this._closeModal(); });
    this.modalInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this._applyModal(); }
    });

    // Escape
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (this.modalEl?.classList.contains('open'))      { this._closeModal(); return; }
      if (this.ctxMenu?.classList.contains('open'))      { this._closeContextMenu(); return; }
      if (document.body.classList.contains('sidebar-open')) this._closeSidebar();
    });

    // Voice
    this.micBtn?.addEventListener('click', () => this._toggleVoice());

    document.addEventListener('settings:saved', () => this._checkApiKey());
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE.DREAM_CHATS && !this.isLoading) {
        this.conversations = DreamStore.load();
        if (!this.conversations.some(c => c.id === this.activeId)) this.activeId = null;
        this._renderSidebar();
        this._renderConversation();
      }
    });
  }

  /* ---------- Sidebar ---------- */
  _openSidebar()  {
    this._renderSidebar();
    document.body.classList.add('sidebar-open');
  }
  _closeSidebar() { document.body.classList.remove('sidebar-open'); }

  _renderSidebar() {
    if (!this.sidebarList) return;
    this.sidebarList.innerHTML = '';

    const sorted = this.conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    if (!sorted.length) {
      const empty = document.createElement('div');
      empty.className = 'sidebar-empty';
      empty.innerHTML = 'ยังไม่มีประวัติการสนทนา<br><span>เล่าความฝันแรกของคุณสิ 🌙</span>';
      this.sidebarList.appendChild(empty);
      return;
    }

    for (const conv of sorted) {
      const item = document.createElement('div');
      item.className = 'sidebar-item' + (conv.id === this.activeId ? ' active' : '');
      item.dataset.id = conv.id;
      item.setAttribute('role', 'listitem');
      item.tabIndex = 0;

      const main = document.createElement('div');
      main.className = 'sidebar-item-main';

      const titleEl = document.createElement('div');
      titleEl.className = 'sidebar-item-title';
      titleEl.textContent = conv.title || DREAM_NEW_TITLE;

      const metaEl = document.createElement('div');
      metaEl.className = 'sidebar-item-meta';
      const userCount = conv.messages.filter(m => m.role === 'user').length;
      metaEl.textContent = `${dreamDateLabel(conv.updatedAt)} · ${userCount} ความฝัน`;
      main.append(titleEl, metaEl);

      const tags = Array.isArray(conv.tags) ? conv.tags : [];
      if (tags.length) {
        const tagWrap = document.createElement('div');
        tagWrap.className = 'sidebar-item-tags';
        tags.slice(0, 3).forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'tag-chip';
          chip.textContent = '#' + t;
          tagWrap.appendChild(chip);
        });
        if (tags.length > 3) {
          const more = document.createElement('span');
          more.className = 'tag-chip more';
          more.textContent = '+' + (tags.length - 3);
          tagWrap.appendChild(more);
        }
        main.appendChild(tagWrap);
      }

      const menuBtn = document.createElement('button');
      menuBtn.type = 'button';
      menuBtn.className = 'sidebar-item-menu';
      menuBtn.setAttribute('aria-label', `ตัวเลือกของ ${conv.title || DREAM_NEW_TITLE}`);
      menuBtn.textContent = '⋮';
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const r = menuBtn.getBoundingClientRect();
        this._openContextMenu(r.left - 120, r.bottom + 4, conv.id);
      });

      item.append(main, menuBtn);
      item.addEventListener('click', () => this._selectConversation(conv.id));
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._openContextMenu(e.clientX, e.clientY, conv.id);
      });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._selectConversation(conv.id); }
      });

      this.sidebarList.appendChild(item);
    }
  }

  _selectConversation(id) {
    this._closeSidebar();
    this._closeContextMenu();
    if (this.activeId === id) return;
    this.activeId = id;
    this._save();
    this._renderSidebar();
    this._renderConversation();
    this.textarea?.focus();
  }

  _startNewChat() {
    this._closeSidebar();
    if (this.activeId === null) { this.textarea?.focus(); return; }
    this.activeId = null;
    Store.remove(STORAGE.DREAM_ACTIVE);
    this._renderSidebar();
    this._renderConversation();
    this.textarea?.focus();
    showToast('เริ่มการสนทนาใหม่ 🌙', 'info', 1800);
  }

  /* ---------- Context menu ---------- */
  _openContextMenu(x, y, id) {
    if (!this.ctxMenu) return;
    this.ctxTarget = id;
    this.ctxMenu.classList.add('open');
    this.ctxMenu.setAttribute('aria-hidden', 'false');
    const rect = this.ctxMenu.getBoundingClientRect();
    const left = Math.max(8, Math.min(x, window.innerWidth  - rect.width  - 8));
    const top  = Math.max(8, Math.min(y, window.innerHeight - rect.height - 8));
    this.ctxMenu.style.left = `${left}px`;
    this.ctxMenu.style.top  = `${top}px`;
  }

  _closeContextMenu() {
    if (!this.ctxMenu) return;
    this.ctxMenu.classList.remove('open');
    this.ctxMenu.setAttribute('aria-hidden', 'true');
    this.ctxTarget = null;
  }

  /* ---------- Rename / Tag modal ---------- */
  _openModal(mode, id) {
    const conv = this.conversations.find(c => c.id === id);
    if (!conv || !this.modalEl) return;
    this.modalMode   = mode;
    this.modalTarget = id;

    if (mode === 'rename') {
      this.modalTitle.textContent = '✏️ เปลี่ยนชื่อประวัติ';
      this.modalInput.value = conv.title || '';
      this.modalInput.placeholder = 'ตั้งชื่อประวัตินี้...';
      this.modalHint.style.display = 'none';
    } else {
      this.modalTitle.textContent = '🏷️ ตั้งแท็กให้ประวัติ';
      this.modalInput.value = (conv.tags || []).join(', ');
      this.modalInput.placeholder = 'เช่น งู, บ้านเก่า, เลขเด็ด';
      this.modalHint.textContent = 'คั่นแต่ละแท็กด้วยเครื่องหมายจุลภาค ( , )';
      this.modalHint.style.display = 'block';
    }

    this.modalEl.classList.add('open');
    setTimeout(() => { this.modalInput.focus(); this.modalInput.select(); }, 60);
  }

  _closeModal() {
    this.modalEl?.classList.remove('open');
    this.modalMode = null;
    this.modalTarget = null;
  }

  _applyModal() {
    const conv = this.conversations.find(c => c.id === this.modalTarget);
    if (!conv) { this._closeModal(); return; }
    const value = this.modalInput.value.trim();

    if (this.modalMode === 'rename') {
      conv.title = value || DREAM_NEW_TITLE;
      showToast('เปลี่ยนชื่อประวัติแล้ว ✏️', 'success');
    } else {
      conv.tags = value
        ? [...new Set(value.split(/[,،]/).map(t => t.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 8)
        : [];
      showToast(conv.tags.length ? 'บันทึกแท็กแล้ว 🏷️' : 'ล้างแท็กแล้ว', 'success');
    }

    conv.updatedAt = conv.updatedAt || Date.now();
    this._save();
    this._renderSidebar();
    this._closeModal();
  }

  /* ---------- Delete ---------- */
  _deleteConversation(id) {
    const conv = this.conversations.find(c => c.id === id);
    if (!conv) return;
    if (!confirm(`ลบประวัติ "${conv.title || DREAM_NEW_TITLE}" ?`)) return;

    this.conversations = this.conversations.filter(c => c.id !== id);
    if (this.activeId === id) {
      const next = this.conversations.slice().sort((a, b) => b.updatedAt - a.updatedAt)[0];
      this.activeId = next ? next.id : null;
    }
    this._save();
    this._renderSidebar();
    this._renderConversation();
    showToast('ลบประวัติแล้ว 🗑️', 'success');
  }

  /* ---------- API key ---------- */
  _checkApiKey() {
    const key = Store.get(STORAGE.API_KEY, '');
    const warning = document.getElementById('no-api-dream');
    if (!key) {
      warning?.style.setProperty('display', 'block');
      this.sendBtn && (this.sendBtn.disabled = true);
    } else {
      warning?.style.setProperty('display', 'none');
      this.sendBtn && (this.sendBtn.disabled = false);
    }
  }

  /* ---------- Send ---------- */
  async _send() {
    const text = this.textarea?.value.trim();
    if (!text || this.isLoading) return;

    const key = Store.get(STORAGE.API_KEY, '');
    if (!key) { showToast('กรุณาใส่ API Key ก่อน ⚙️', 'error'); return; }

    const conv = this._ensureConversation();

    // Title from the very first message
    if (!conv.messages.some(m => m.role === 'user')) {
      conv.title = dreamTitleFrom(text);
    }

    const userMsg = { role: 'user', content: text, lotteryData: null, ts: Date.now() };
    conv.messages.push(userMsg);
    conv.updatedAt = userMsg.ts;
    this._trimConversation(conv);
    this._save();
    this._renderSidebar();

    // ข้อความแรกของแชทใหม่ — เอาหน้าจอต้อนรับออกก่อน
    if (conv.messages.length === 1 && this.messagesEl) this.messagesEl.innerHTML = '';
    this.messagesEl?.appendChild(this._createBubble('user', text, null));

    this.textarea.value = '';
    this._autoGrow();
    this._scrollBottom();

    this.isLoading = true;
    this.sendBtn.disabled = true;
    const typingEl = this._addTyping();

    try {
      const history = conv.messages.slice(-11, -1)
        .map(m => `${m.role === 'user' ? 'ผู้ใช้' : 'เทพซ่า'}: ${m.content}`)
        .join('\n');
      const fullPrompt = history ? `บทสนทนาก่อนหน้า:\n${history}\n\nผู้ใช้: ${text}` : text;

      const response = await callGemini(fullPrompt, DREAM_SYSTEM_PROMPT);
      typingEl.remove();

      const { cleanText, lotteryData } = this._parseLottery(response);
      const aiMsg = { role: 'ai', content: cleanText, lotteryData, ts: Date.now() };
      conv.messages.push(aiMsg);
      conv.updatedAt = aiMsg.ts;
      this._trimConversation(conv);
      this._save();
      this._renderSidebar();

      this.messagesEl?.appendChild(this._createBubble('ai', cleanText, lotteryData));
      this._scrollBottom();
    } catch (err) {
      typingEl.remove();
      const msg = err.message === 'NO_API_KEY'
        ? '⚠️ กรุณาใส่ API Key ในการตั้งค่าก่อนนะคะ'
        : `❌ เกิดข้อผิดพลาด: ${err.message}`;
      this.messagesEl?.appendChild(this._createBubble('ai', msg, null));
      this._scrollBottom();
    } finally {
      this.isLoading = false;
      if (Store.get(STORAGE.API_KEY)) this.sendBtn.disabled = false;
    }
  }

  _trimConversation(conv) {
    if (conv.messages.length > DREAM_MAX_MESSAGES) {
      conv.messages = conv.messages.slice(-DREAM_MAX_MESSAGES);
    }
  }

  _parseLottery(text) {
    const resultMatch = text.match(/LOTTERY_RESULT:([\s\S]*?)END_RESULT/);
    if (!resultMatch) return { cleanText: text, lotteryData: null };

    const lotteryBlock = resultMatch[1];
    const cleanText = text.replace(/LOTTERY_RESULT:[\s\S]*?END_RESULT/, '').trim();

    const extract = (pattern) => {
      const m = lotteryBlock.match(pattern);
      return m ? m[1].trim() : '—';
    };

    return {
      cleanText,
      lotteryData: {
        top2: extract(/2ตัวบน:\s*(\d+)/),
        bot2: extract(/2ตัวล่าง:\s*(\d+)/),
        top3: extract(/3ตัวบน:\s*(\d+)/),
        bot3: extract(/3ตัวล่าง:\s*(\d+)/),
        six:  extract(/6ตัว:\s*(\d+)/)
      }
    };
  }

  /* ---------- Rendering ---------- */
  _createBubble(role, content, lotteryData) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'ai' ? '🔮' : '🌙';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const textNode = document.createElement('div');
    textNode.innerHTML = this._formatText(content);
    bubble.appendChild(textNode);

    if (lotteryData) {
      const lotteryEl = document.createElement('div');
      lotteryEl.className = 'lottery-result';
      lotteryEl.innerHTML = `
        <h4>🎯 เลขเด็ดประจำงวด</h4>
        <div class="lottery-numbers">
          <span class="lottery-num" title="2 ตัวบน">${dreamEscape(lotteryData.top2)}</span>
          <span class="lottery-num" title="2 ตัวล่าง">${dreamEscape(lotteryData.bot2)}</span>
          <span class="lottery-num" title="3 ตัวบน">${dreamEscape(lotteryData.top3)}</span>
          <span class="lottery-num" title="3 ตัวล่าง">${dreamEscape(lotteryData.bot3)}</span>
          <span class="lottery-num" title="6 ตัว" style="font-size:0.95rem">${dreamEscape(lotteryData.six)}</span>
        </div>
        <div style="margin-top:0.4rem; font-size:0.72rem; color:var(--text-muted);">
          2บน · 2ล่าง · 3บน · 3ล่าง · 6ตัว (เพื่อความบันเทิงเท่านั้น)
        </div>`;
      bubble.appendChild(lotteryEl);
    }

    if (role === 'ai') {
      addTTSButton(bubble, () => content);
    }

    wrapper.append(avatar, bubble);
    return wrapper;
  }

  _formatText(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  _addTyping() {
    const wrapper = document.createElement('div');
    wrapper.className = 'message ai';
    wrapper.id = 'typing-indicator';
    wrapper.innerHTML = `
      <div class="message-avatar">🔮</div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>`;
    this.messagesEl?.appendChild(wrapper);
    this._scrollBottom();
    return wrapper;
  }

  _renderConversation() {
    if (!this.messagesEl) return;
    this.messagesEl.innerHTML = '';
    const msgs = this.messages;
    if (!msgs.length) { this._addWelcomeMessage(); return; }
    for (const msg of msgs) {
      this.messagesEl.appendChild(this._createBubble(msg.role, msg.content, msg.lotteryData || null));
    }
    this._scrollBottom();
  }

  _addWelcomeMessage() {
    const wrapper = document.createElement('div');
    wrapper.className = 'message ai welcome-message';
    wrapper.innerHTML = `
      <div class="message-avatar">🔮</div>
      <div class="message-bubble">
        สวัสดีค่ะ ฉันคือ <strong>เทพซ่า</strong> หมอดูตีเลขจากความฝัน ✨<br><br>
        เล่าความฝันของคุณให้ฟังซิคะ... ฝันเห็นอะไร มีสัตว์ สถานที่ หรือเหตุการณ์อะไรบ้าง?<br><br>
        ฉันจะวิเคราะห์ตามหลัก<strong>ตำราทายฝันไทยโบราณ</strong> และตีออกมาเป็นเลขนำโชคให้นะคะ 🌙<br><br>
        <span style="font-size:0.8rem; color:var(--text-muted);">
          ทุกความฝันถูกเก็บเป็นประวัติแยกเรื่อง — กด ☰ เพื่อดูทั้งหมด
        </span>
      </div>`;
    this.messagesEl?.appendChild(wrapper);
  }

  _scrollBottom() {
    setTimeout(() => {
      if (this.messagesEl) this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    }, 50);
  }

  _autoGrow() {
    if (!this.textarea) return;
    this.textarea.style.height = 'auto';
    this.textarea.style.height = Math.min(this.textarea.scrollHeight, 140) + 'px';
  }

  /* ---------- Voice input (Web Speech API) ---------- */
  _initVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      if (this.micBtn) this.micBtn.style.display = 'none';
      return;
    }

    const rec = new SR();
    rec.lang = 'th-TH';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this.voiceStarted = true;
      clearTimeout(this.voiceWatchdog);
      showToast('🎤 กำลังฟัง... พูดความฝันของคุณได้เลย', 'info', 2200);
    };

    rec.onresult = (e) => {
      let finalText = '', interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else           interim   += r[0].transcript;
      }
      const base = this.voiceBase ? this.voiceBase + ' ' : '';
      if (this.textarea) this.textarea.value = base + finalText + interim;
      this._autoGrow();
    };

    rec.onerror = (e) => {
      const map = {
        'not-allowed':  'ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน',
        'service-not-allowed': 'เบราว์เซอร์ไม่อนุญาตให้ใช้ไมโครโฟน',
        'no-speech':    'ไม่ได้ยินเสียง ลองพูดอีกครั้ง',
        'audio-capture':'ไม่พบไมโครโฟนในเครื่องนี้',
        'network':      'การเชื่อมต่อขัดข้อง ลองใหม่อีกครั้ง'
      };
      showToast('🎤 ' + (map[e.error] || `เกิดข้อผิดพลาด: ${e.error}`), 'error');
    };

    rec.onend = () => {
      clearTimeout(this.voiceWatchdog);
      this.voiceStarted = false;
      this._setListening(false);
      this.textarea?.focus();
    };

    this.recognition = rec;
  }

  _setListening(on) {
    this.listening = on;
    this.micBtn?.classList.toggle('listening', on);
    this.micBtn?.setAttribute('title', on ? 'กำลังฟัง... กดอีกครั้งเพื่อหยุด' : 'พิมพ์ด้วยเสียง');
  }

  _toggleVoice() {
    if (!this.recognition) return;
    if (this.listening) {
      try { this.recognition.stop(); } catch {}
      this._setListening(false);
      return;
    }

    this.voiceBase = this.textarea?.value.trim() || '';
    this.voiceStarted = false;
    this._setListening(true);

    // ถ้าเบราว์เซอร์ไม่ตอบสนองเลย ให้บอกผู้ใช้แทนที่จะค้างเงียบ ๆ
    clearTimeout(this.voiceWatchdog);
    this.voiceWatchdog = setTimeout(() => {
      if (!this.voiceStarted) {
        this._setListening(false);
        showToast('🎤 เปิดไมโครโฟนในเบราว์เซอร์นี้ไม่ได้ ลองพิมพ์แทนนะคะ', 'error');
      }
    }, 2500);

    try {
      this.recognition.start();
    } catch {
      clearTimeout(this.voiceWatchdog);
      this._setListening(false);
      showToast('🎤 ไมโครโฟนถูกใช้งานอยู่ ลองใหม่อีกครั้งนะคะ', 'error');
    }
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('chat-messages')) {
    window.dreamChat = new DreamChat();
  }
});
