/* ============================================================
   app.js — Core Application Logic
   Settings, Storage, PWA Install, Toast, Shared utilities
   ============================================================ */

'use strict';

const DEFAULT_MODEL = 'models/gemini-3.5-flash-lite';

// ---- Storage Keys ----
const STORAGE = {
  API_KEY:       'tepsa_api_key',
  MODEL:         'tepsa_model',
  DREAM_HISTORY: 'tepsa_dream_history',
  DREAM_CHATS:   'tepsa_dream_chats',
  DREAM_ACTIVE:  'tepsa_dream_active',
  THAI_BIRTH:    'tepsa_thai_birth',
  THAI_CHAT:     'tepsa_thai_chat',
  THAI_RESULTS:  'tepsa_thai_results',
  CN_BIRTH:      'tepsa_cn_birth',
  CN_RESULT:     'tepsa_cn_result',
  TAROT_DATE:    'tepsa_tarot_last_date',
  TAROT_RESULT:  'tepsa_tarot_result',
  DISMISSED_PWA: 'tepsa_pwa_dismissed',
  MODELS_CACHE:  'tepsa_models_cache_v2',
  MODELS_TS:     'tepsa_models_ts_v2',
  TTS_VOICE:     'tepsa_tts_voice',
  API_GUIDE_SEEN: 'tepsa_api_guide_seen',
  BIRTH_PROFILE: 'tepsa_birth_profile',
  SFX_VOLUME:   'tepsa_sfx_volume',
};

// ---- LocalStorage helpers ----
const Store = {
  get(key, fallback = null) {
    try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
  remove(key)    { try { localStorage.removeItem(key); } catch {} },
};

const SoundEffects = {
  files: {
    dream: ['icons_1/1.mp3'],
    tarot: ['icons_2/2.mp3', 'icons_2/2-0.mp3'],
    thai: ['icons_3/3.mp3'],
    chinese: ['icons_4/4.mp3'],
    indian: ['icons_5/5.mp3'],
    western: ['icons_6/6.mp3'],
  },

  _key: 'tepsa_pending_sound',
  defaultVolume: 0.55,
  activeAudio: null,

  volume() {
    const value = Number(Store.get(STORAGE.SFX_VOLUME, this.defaultVolume * 100));
    return Math.max(0, Math.min(1, value / 100));
  },

  setVolume(percent) {
    const value = Math.max(0, Math.min(100, Number(percent) || 0));
    Store.set(STORAGE.SFX_VOLUME, value);
    if (this.activeAudio) this.activeAudio.volume = value / 100;
    document.dispatchEvent(new CustomEvent('soundeffects:volume', { detail: { value } }));
    return value;
  },

  _play(files) {
    const list = Array.isArray(files) ? files : [files];
    if (!list.length) return;
    const file = list[Math.floor(Math.random() * list.length)];
    const source = location.pathname.includes('/pages/') ? `../${file}` : file;
    const audio = new Audio(source);
    audio.volume = this.volume();
    this.activeAudio = audio;
    audio.addEventListener('ended', () => {
      if (this.activeAudio === audio) this.activeAudio = null;
    }, { once: true });
    audio.play().catch(() => {});
  },

  queueFor(path) {
    try { sessionStorage.setItem(this._key, path); } catch {}
  },

  playQueued() {
    let path = '';
    try {
      path = sessionStorage.getItem(this._key) || '';
      sessionStorage.removeItem(this._key);
    } catch {}
    if (path && this.files[path]) this._play(this.files[path]);
  },

  bindEntryLinks() {
    document.querySelectorAll('.feature-card[href]').forEach((card) => {
      const href = card.getAttribute('href') || '';
      const match = href.match(/pages\/(dream|tarot|thai|chinese|indian|western)\.html$/);
      if (!match) return;
      card.addEventListener('click', () => this.queueFor(match[1]));
    });
  },

  init() {
    this.bindEntryLinks();
    this.playQueued();
    document.querySelectorAll('.thai-mode-card').forEach((card) => {
      card.addEventListener('click', () => this._play(this.files.thai));
    });
  },
};

const AbdulChat = {
  storageKey: 'tepsa_abdul_chat',
  countKey: 'tepsa_abdul_count',
  scrollY: 0,
  pressTimer: null,
  touchStartX: 0,
  touchStartY: 0,
  contextMenuOpen: false,
  selectedMessageIndex: null,
  selectedMessageEl: null,
  toastTimer: null,
  isWaitingReply: false,

  init() {
    const trigger = document.querySelector('.abdul-secret-trigger');
    const panel = document.getElementById('abdul-chat');
    const close = document.getElementById('abdul-chat-close');
    const form = document.getElementById('abdul-chat-form');
    const input = document.getElementById('abdul-chat-input');
    const messagesBox = document.getElementById('abdul-chat-messages');
    const menuDelete = document.getElementById('abdul-delete-action');
    const menuCopy = document.getElementById('abdul-menu-copy');
    if (!trigger || !panel || !form || !input) return;

    trigger.addEventListener('click', (event) => { event.preventDefault(); this.open(); });
    close?.addEventListener('click', () => this.close());

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text || this.isWaitingReply) return;
      this.addMessage('user', text);
      input.value = '';
      input.style.height = 'auto';

      this.isWaitingReply = true;
      this.showTyping();

      try {
        const replyText = await this.getReply(text);
        this.hideTyping();
        this.addMessage('abdul', replyText);
      } catch (err) {
        this.hideTyping();
        this.addMessage('abdul', this.generateSmartReply(text));
      } finally {
        this.isWaitingReply = false;
      }
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    });

    // Mobile / Touch Long-press
    messagesBox?.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return; // Right-click handled by contextmenu
      const message = event.target.closest('.abdul-message');
      if (!message || message.classList.contains('typing-message')) return;
      this.touchStartX = event.clientX;
      this.touchStartY = event.clientY;
      this.cancelPress();
      this.pressTimer = window.setTimeout(() => {
        this.pressTimer = null;
        if (navigator.vibrate) {
          try { navigator.vibrate(35); } catch {}
        }
        this.openContextMenu(message);
      }, 460);
    });

    messagesBox?.addEventListener('pointermove', (event) => {
      if (this.pressTimer !== null) {
        const dist = Math.hypot(event.clientX - this.touchStartX, event.clientY - this.touchStartY);
        if (dist > 8) this.cancelPress();
      }
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
      messagesBox?.addEventListener(type, () => this.cancelPress());
    });

    // Desktop Right-Click
    messagesBox?.addEventListener('contextmenu', (event) => {
      const message = event.target.closest('.abdul-message');
      if (!message || message.classList.contains('typing-message')) return;
      event.preventDefault();
      this.cancelPress();
      this.openContextMenu(message, event.clientX, event.clientY);
    });

    // Dismiss context menu on scroll or outside click or Escape
    messagesBox?.addEventListener('scroll', () => {
      if (this.contextMenuOpen) this.closeContextMenu();
    });

    document.addEventListener('pointerdown', (event) => {
      if (!this.contextMenuOpen) return;
      const menu = document.getElementById('abdul-delete-menu');
      if (menu && !menu.contains(event.target) && !event.target.closest('.abdul-message.menu-active')) {
        this.closeContextMenu();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.contextMenuOpen) {
        this.closeContextMenu();
      }
    });

    // Context Menu Buttons
    menuDelete?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteSelectedMessage();
    });

    menuCopy?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.copySelectedMessage();
    });

    this.render();
  },

  cancelPress() {
    if (this.pressTimer !== null) {
      window.clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  },

  openContextMenu(messageEl, clientX, clientY) {
    const menu = document.getElementById('abdul-delete-menu');
    const panel = document.getElementById('abdul-chat');
    if (!menu || !panel || !messageEl) return;

    this.closeContextMenu();

    const index = Number(messageEl.dataset.index);
    if (!Number.isInteger(index)) return;

    this.selectedMessageIndex = index;
    this.selectedMessageEl = messageEl;
    messageEl.classList.add('menu-active');

    menu.style.display = 'flex';
    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');

    const panelRect = panel.getBoundingClientRect();
    const bubble = messageEl.querySelector('.abdul-bubble') || messageEl;
    const bubbleRect = bubble.getBoundingClientRect();
    const menuWidth = menu.offsetWidth || 140;
    const menuHeight = menu.offsetHeight || 80;

    let left, top;
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      // Desktop right click
      left = clientX - panelRect.left;
      top = clientY - panelRect.top;
    } else {
      // Mobile long press
      const bubbleTopRel = bubbleRect.top - panelRect.top;
      const bubbleBottomRel = bubbleRect.bottom - panelRect.top;
      top = bubbleTopRel - menuHeight - 6;
      if (top < 50) {
        top = bubbleBottomRel + 6;
      }
      left = (bubbleRect.left + bubbleRect.width / 2) - panelRect.left - (menuWidth / 2);
    }

    // Clamp within chat container boundaries
    left = Math.max(10, Math.min(left, panelRect.width - menuWidth - 12));
    top = Math.max(50, Math.min(top, panelRect.height - menuHeight - 12));

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    this.contextMenuOpen = true;
  },

  closeContextMenu() {
    const menu = document.getElementById('abdul-delete-menu');
    if (menu) {
      menu.classList.remove('open');
      menu.style.display = 'none';
      menu.setAttribute('aria-hidden', 'true');
    }
    if (this.selectedMessageEl) {
      this.selectedMessageEl.classList.remove('menu-active');
      this.selectedMessageEl = null;
    }
    this.selectedMessageIndex = null;
    this.contextMenuOpen = false;
  },

  deleteSelectedMessage() {
    if (this.selectedMessageIndex === null) return;
    const index = this.selectedMessageIndex;
    const el = this.selectedMessageEl;
    const messages = this.messages();
    if (el) {
      el.classList.add('deleting');
    }
    this.closeContextMenu();
    window.setTimeout(() => {
      if (Number.isInteger(index) && messages[index]) {
        messages.splice(index, 1);
        Store.set(this.storageKey, messages);
        this.render();
        this.showToast('ลบข้อความแล้ว');
      }
    }, 220);
  },

  copySelectedMessage() {
    if (this.selectedMessageIndex === null) return;
    const messages = this.messages();
    const msg = messages[this.selectedMessageIndex];
    if (msg && msg.text) {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(msg.text).catch(() => {});
      }
      this.showToast('คัดลอกข้อความแล้ว');
    }
    this.closeContextMenu();
  },

  showToast(text) {
    const toast = document.getElementById('abdul-toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      toast.classList.remove('show');
    }, 1800);
  },

  showTyping() {
    const box = document.getElementById('abdul-chat-messages');
    if (!box) return;
    this.hideTyping();
    const typingEl = document.createElement('div');
    typingEl.className = 'abdul-message abdul typing-message';
    typingEl.id = 'abdul-typing-msg';
    typingEl.innerHTML = `
      <img src="icon_sss/อับดุลเอ๊ย.jpg" alt="อับดุล" class="abdul-message-avatar" />
      <div class="abdul-bubble">
        <div class="abdul-typing-indicator" aria-label="กำลังพิมพ์">
          <span class="abdul-typing-dot"></span>
          <span class="abdul-typing-dot"></span>
          <span class="abdul-typing-dot"></span>
        </div>
      </div>
    `;
    box.appendChild(typingEl);
    box.scrollTop = box.scrollHeight;
  },

  hideTyping() {
    const el = document.getElementById('abdul-typing-msg');
    el?.remove();
  },

  open() {
    const panel = document.getElementById('abdul-chat');
    this.scrollY = window.scrollY;
    panel?.classList.add('open');
    panel?.setAttribute('aria-hidden', 'false');
    document.body.style.top = `-${this.scrollY}px`;
    document.body.classList.add('abdul-chat-open');
    window.setTimeout(() => document.getElementById('abdul-chat-input')?.focus(), 120);
  },

  close() {
    this.closeContextMenu();
    const panel = document.getElementById('abdul-chat');
    panel?.classList.remove('open');
    panel?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('abdul-chat-open');
    document.body.style.top = '';
    window.scrollTo(0, this.scrollY);
  },

  messages() { return Store.get(this.storageKey, []) || []; },

  addMessage(role, text) {
    const messages = this.messages();
    messages.push({ role, text, time: Date.now() });
    Store.set(this.storageKey, messages.slice(-80));
    this.render();
  },

  funnyAnnoyedReplies: [
    'ไม่รู้จ้ะนายจ๋า อย่าถามยากมากได้ไหมจ๊ะ บังจะไปทอดโรตีแล้ว!',
    'ถามอีกแล้วเหรอนายจ๋า อับดุลรำคาญแล้วนะจ๊ะ สมองจะไหม้เหมือนแกงกะหรี่แล้วเนี่ย!',
    'ปัดโธ่นายจ๋า เรื่องนี้ไปเปิดกูเกิลเองบ้างเถอะ อับดุลเหนื่อยใจจ้ะ',
    'เอาเป็นว่าไม่รู้ละกันจ้ะนาย จบแบบอินเดีย ๆ วิ่งข้ามภูเขา 3 ลูกไปก่อน!',
    'บอกว่าไม่รู้ไงจ๊ะนาย จะถามวนเหมือนเต้นระบำรอบต้นไม้ทำไมวะเนี่ย!',
    'พอเถอะนายจ๋า ขอพักสมองแป๊บ อับดุลหงุดหงิดจนหนวดกระดิกแล้วจ้ะ',
    'โอ๊ยนายจ๋า ถามเยอะจนชาชักเย็นชืดหมดแล้วเนี่ย ไม่ตอบโว้ยยย!',
    'ไม่รู้จ้ะพี่ชาย แต่ถ้ามีตังค์โอนมาเดี๋ยวอาจจะนึกออกขึ้นมาทันทีจ้ะนาย!',
    'จะรู้ได้ไงล่ะจ๊ะนายจ๋า อับดุลเป็นหมอดูนะ ไม่ใช่วิกิพีเดียติดหนวด!',
    'รำคาญนิดหน่อยนะนายจ๋า แต่ยังฟังอยู่... หรือเปล่านะ ไม่รู้ว่ะ!',
    'เออ ๆ ใจเย็นก่อนนะนาย เรื่องนี้อับดุลขอผ่าน ขอกุมขมับแป๊บจ้ะ',
    'อะไรนักหนาจ๊ะนายจ๋า ถามอยู่นั่นแหละ บังปวดหัวตึ้บ ๆ แล้วเนี่ย!',
    'เรื่องนี้ลึกซึ้งเกินไปจ้ะนายจ๋า เกินค่าตัวที่บังได้ ขอไม่ตอบละกันนะ!',
    'ถามวนไปวนมา เดี๋ยวบังจับเสกให้เป็นแป้งโรตีเลยนี่นายจ๋า!',
    'อย่าเซ้าซี้ได้ไหมจ๊ะนาย บังกำลังทำสมาธิคุยกับงูเห่าอยู่จ้ะ!',
    'นายจ๋า... พักก่อนเถอะจ้ะ ถามจนพรมวิเศษของบังเหี่ยวหมดแล้ว!',
    'ไม่ตอบจ้ะนาย วันนี้อับดุลหยุดให้บริการสมอง 1 วัน จบนะจ๊ะ!',
    'โอ๊ยยย ปวดหัวจี๊ดเลยนายจ๋า ไปถามคนอื่นก่อนได้ไหมเนี่ย!'
  ],

  aloofReplies: [
    '...',
    '...',
    '...',
    '... (ยืนมองหน้านายเงียบ ๆ)',
    '... จ้องตานายปริบ ๆ แต่ไม่ยอมตอบจ้ะ',
    '... บังขอหยิ่งใส่แป๊บหนึ่งนะนายจ๋า',
  ],

  async getReply(userText) {
    const clean = userText.trim();
    const isMash = this.isGibberish(clean);

    // If gibberish / keyboard mash:
    if (isMash) {
      await new Promise(r => setTimeout(r, 450));
      const mashReplies = [
        '...',
        '... พิมพ์อะไรมาน่ะนายจ๋า เหม่อหรือนั่งทับแป้นพิมพ์เนี่ย?',
        '... (กุมขมับ) ภาษาต่างดาวเหรอนาย บังอ่านไม่ออกจ้ะ!'
      ];
      return mashReplies[Math.floor(Math.random() * mashReplies.length)];
    }

    const rand = Math.random();

    // 1. Aloof / Haughty (~15%)
    if (rand < 0.15) {
      await new Promise(r => setTimeout(r, 500));
      return this.aloofReplies[Math.floor(Math.random() * this.aloofReplies.length)];
    }

    // 2. Annoyed / Exasperated / Doesn't want to answer (~55%)
    if (rand < 0.70) {
      await new Promise(r => setTimeout(r, 450));
      return this.funnyAnnoyedReplies[Math.floor(Math.random() * this.funnyAnnoyedReplies.length)];
    }

    // 3. Actually answers with funny Indian-Thai slang (~30%)
    const apiKey = Store.get(STORAGE.API_KEY, '');
    if (apiKey) {
      try {
        const systemPrompt = `คุณคือ "อับดุล" (Abdul) หมอดูอินเดียมาดกวน ขี้หงุดหงิด ขี้รำคาญ หยิ่งนิดๆ ประจำเว็บเทพซ่า 007
สไตล์และคำพูด:
- ใช้สแลงไทยปนอินเดียอย่างสนุกสนาน เช่น "นายจ๋า", "จ้ะนาย", "พี่ชาย", "บัง", "โรตี", "จบแบบอินเดียๆ", "ปัดโธ่เอ๊ย"
- บุคลิก: หงุดหงิดง่าย ขี้รำคาญ แต่เป็นความฮาแบบกวนประสาท
- ครั้งนี้อับดุลใจดียอมตอบคำถามของผู้ใช้! ให้ตอบคำถามจริงๆ (ไม่ว่าจะถามเรื่องหนังอินเดีย อาหาร ความรัก ชีวิต หรือคำถามทั่วไป) แต่ต้องตอบด้วยลีลากวนโอ๊ย ปนสแลงอินเดียฮาๆ กระชับได้ใจความ (1-3 ประโยค)`;

        const reply = await Promise.race([
          callGemini(clean, systemPrompt, { maxOutputTokens: 300 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 6000))
        ]);
        if (reply && reply.trim()) {
          return reply.trim();
        }
      } catch (e) {
        // Fall back to local reply engine
      }
    }

    // Local smart response with funny Indian slang
    await new Promise(r => setTimeout(r, 480));
    return this.generateSmartReply(clean);
  },

  isGibberish(text) {
    if (!text) return true;
    if (/^[.!?…\-_ \s]+$/.test(text)) return true;
    if (text.length <= 1) return true;
    // Repeated same character (e.g. "กกกกก", "aaaa")
    if (/^(.)\1{3,}$/.test(text)) return true;
    // Typical Thai home-row keyboard spam
    if (/^(ฟหก|หกด|กดเ|อหก|ดฟห|ผปแ|กป)/.test(text) && text.length <= 12) return true;
    if (/^[หกอเวกลดเ]+$/.test(text) && text.length >= 4) return true;
    return false;
  },

  generateSmartReply(text) {
    const t = text.toLowerCase();

    // Indian Movies / Movies & Series
    if (t.includes('หนังอินเดีย') || (t.includes('อินเดีย') && (t.includes('หนัง') || t.includes('แอ็กชัน') || t.includes('แอกชัน')))) {
      const movieReplies = [
        'เพราะหนังอินเดียเขาไม่ได้ขายฟิสิกส์จ้ะนายจ๋า เขาขายความสะใจ! พระเอกเตะรถคันเดียวบินไปชนเฮลิคอปเตอร์ตกแล้วสโลว์โมชั่น 5 นาที มันเท่กว่าโลกจริงเยอะ นั่งดูคนเดียวฟิน ๆ สะใจจะตายไปนาย!',
        'วัฒนธรรมบอลลีวูดเขาเน้นความบันเทิงระดับจักรวาลจ้ะนาย พระเอกต้องเก่งเหนือมนุษย์ ต่อยทีเดียวคนร้ายปลิวข้ามรัฐ บังดูเองยังขนลุกซู่เลยจ้ะนายจ๋า!',
        'ความเวอร์วังมันคือเอกลักษณ์จ้ะนายจ๋า ในชีวิตจริงเราเตะรถบินไม่ได้ไง ดูในหนังแล้วมันสะใจแก้เครียดดีจะตายไปนาย!'
      ];
      return movieReplies[Math.floor(Math.random() * movieReplies.length)];
    }

    if (t.includes('หนัง') || t.includes('ภาพยนตร์') || t.includes('ซีรีส์') || t.includes('อนิเมะ')) {
      const movieReplies = [
        'หนังที่ดีสำหรับบัง คือหนังที่ดูคนเดียวเงียบ ๆ ในห้อง แล้วกินโรตีไปด้วยจ้ะนายจ๋า ไม่ต้องมีใครมาคอยสะกิดถามว่า "คนนี้ใครเหรอ" สบายใจสุด!',
        'ถ้าจะดูหนังคนเดียวนะนายจ๋า หาหนังที่ภาพสวย ๆ หรือไม่ก็หนังแอ็กชันเตะต่อยระเบิดภูเขาไปเลยจ้ะนาย เพลินจนลืมวันลืมคืน!'
      ];
      return movieReplies[Math.floor(Math.random() * movieReplies.length)];
    }

    // Hunger / Food
    if (t.includes('หิว') || t.includes('กินอะไร') || t.includes('กินข้าว') || t.includes('ของกิน') || t.includes('อาหาร')) {
      const foodReplies = [
        'หิวก็ไปสั่งโรตีใส่ไข่ หรือแกงกะหรี่ร้อน ๆ มากินสิจ๊ะนายจ๋า กินคนเดียวเงียบ ๆ ไม่ต้องแย่งใคร อิ่มแล้วจะได้หยุดกวนอับดุลสักที!',
        'เวลาหิวนี่สมองจะเบลอนะนายจ๋า ไปหาอะไรยัดลงท้องด่วน ๆ ก่อนที่นายจะหงุดหงิดยิ่งกว่าบัง!',
        'สั่งชานมร้อน ๆ กับของกินอร่อย ๆ มากินสิจ๊ะนาย นั่งเคี้ยวไปเงียบ ๆ ฟินจะตาย อย่ามัวแต่ถามอับดุลอยู่เลย!'
      ];
      return foodReplies[Math.floor(Math.random() * foodReplies.length)];
    }

    // Greetings
    if (/^(ไง|ดี|สวัสดี|หวัดดี|ฮัลโหล|ว่าไง|ทำไร|อยู่ไหน)/.test(t)) {
      const greetReplies = [
        'ไงอะไรล่ะจ๊ะนายจ๋า มีอะไรก็รีบพูดมา บังกำลังนั่งนับแผ่นโรตีอยู่เนี่ย!',
        'ว่าไงจ๊ะนาย... อยู่ตรงนี้แหละ มีเรื่องอะไรอีกล่ะ วันนี้อย่าถามยากนะจ๊ะ บังขอร้อง!',
        'สวัสดีจ้ะนายจ๋า วันนี้ลมอะไรพัดมาล่ะ มีเรื่องเดือดร้อนใจอะไรว่ามาสิ!'
      ];
      return greetReplies[Math.floor(Math.random() * greetReplies.length)];
    }

    // "อะไร" (What)
    if (/^อะไร[?？]?$/.test(t) || /^อะไรนะ[?？]?$/.test(t)) {
      const whatReplies = [
        'อะไรอะไรเล่าจ๊ะนายจ๋า ก็ที่ถามอยู่นี่ไง มีเรื่องอะไรคาใจอีกล่ะ บังละปวดหัว!',
        'จะอะไรล่ะจ๊ะนาย มองหน้าบังแล้วถามอะไร มีอะไรก็พูดมาเลยดิ บังรอฟังอยู่เนี่ย!'
      ];
      return whatReplies[Math.floor(Math.random() * whatReplies.length)];
    }

    // "ทำไม" (Why) & Questions
    if (t.includes('ทำไม') || t.includes('เพราะอะไร')) {
      const whyReplies = [
        'ทำไมเหรอนายจ๋า... บางเรื่องในชีวิตมันก็ไม่มีเหตุผลหรอก เหมือนที่นายชอบมาถามกวนประสาทอับดุลอยู่นี่ไง ไม่เห็นจะมีเหตุผลอะไรเล้ยนายจ๋า!',
        'โลกนี้มันก็หมุนของมันไปเรื่อย ๆ จ้ะนาย อย่าไปคิดหาเหตุผลให้ปวดหัวเลย เหมือนโรตีถ้ามัวแต่คิดว่าทำไมต้องกลม ป่านนี้ไหม้คากระทะไปแล้วจ้ะ!',
        'คำถามลึกซึ้งจังเลยนะนายจ๋า... ถอยออกมามองเงียบ ๆ คนเดียว เดี๋ยวคำตอบมันก็โผล่มาเองแหละจ้ะ!'
      ];
      return whyReplies[Math.floor(Math.random() * whyReplies.length)];
    }

    // Loneliness / Friends / Crowd
    if (t.includes('เหงา') || t.includes('เพื่อน') || t.includes('คนเดียว') || t.includes('เบื่อ') || t.includes('แฟน') || t.includes('ความรัก')) {
      const lonelyReplies = [
        'เหงาเหรอนายจ๋า... คนเราอยู่คนเดียวเงียบ ๆ ไม่ต้องไปปั้นหน้ายิ้มกับฝูงเพื่อน สบายใจสุดแล้วจ้ะ หรือถ้าเหงามากก็มานั่งคุยกับอับดุลนี่แหละ เดี๋ยวบังบ่นให้ฟังคลายเหงาเอง!',
        'เพื่อนเยอะก็เรื่องเยอะจ้ะนายจ๋า อยู่คนเดียวเท่ ๆ แบบบังนี่แหละ ชิวสุดแล้ว ไม่ต้องแคร์สายตาใคร!',
        'ความเหงามันเป็นแค่บรรยากาศจ้ะนาย หาเพลงอินเดียมัน ๆ เปิดฟังคนเดียว เดี๋ยวก็ลุกขึ้นมาเต้นระบำลืมเหงาไปเองแหละ!'
      ];
      return lonelyReplies[Math.floor(Math.random() * lonelyReplies.length)];
    }

    // Fortune / Astrology
    if (t.includes('ดวง') || t.includes('ไพ่') || t.includes('ฝัน') || t.includes('ทาโรต์') || t.includes('โชค') || t.includes('อนาคต')) {
      const astroReplies = [
        'เปิดตำราดูดวงให้นายแป๊บ... อืม ดวงบอกว่าถ้านายเลิกกวนประสาทอับดุล ชีวิตนายจะเจริญรุ่งเรืองขึ้น 300% จ้ะนายจ๋า!',
        'อนาคตไม่ต้องไปกังวลเยอะจ้ะนาย วันนี้กินอิ่ม นอนหลับ เอาตัวให้รอดก่อนก็เก่งแล้วจ้ะนายจ๋า!',
        'อยากดูดวงก็ไปเปิดไพ่ทาโรต์ตรงหน้าหลักโน่นจ้ะนาย มาถามบังตรงนี้ระวังจะได้คำทำนายกวนโอ๊ยไปแทนนะ!'
      ];
      return astroReplies[Math.floor(Math.random() * astroReplies.length)];
    }

    // About Abdul
    if (t.includes('ชื่ออะไร') || t.includes('คือใคร') || t.includes('เป็นใคร') || t.includes('อับดุลคือใคร')) {
      return 'อับดุลไงจ๊ะนายจ๋า! ถามอะไรก็ตอบได้ (แต่ส่วนมากขี้เกียจตอบ) บังมาดกวนประจำเว็บนี้ไงล่ะนาย!';
    }

    // General Long Questions (length > 25)
    if (text.length > 25) {
      const longReplies = [
        'เรื่องนี้อับดุลยอมตอบให้เป็นวิทยาทานละกันนะนายจ๋า... ฟังดูแล้วชีวิตคนเรามันก็ยุ่งยากวุ่นวายแบบนี้แหละ เอาเป็นว่าคืนนี้ไปนอนหลับให้เต็มอิ่ม ปล่อยวางเรื่องปวดหัว แล้วพรุ่งนี้ค่อยว่ากันใหม่จ้ะนาย!',
        'อืมมม... นั่งลูบหนวดคิดดูแล้ว มันก็จริงของนายนะ แต่ชีวิตคนเรามันไม่ได้ซับซ้อนขนาดนั้นหรอก ปล่อยให้มันไหลไปตามน้ำบ้างเถอะจ้ะนายจ๋า',
        'ตอบแบบคนฉลาดเลยนะนายจ๋า... อะไรที่ทำแล้วสบายใจ ไม่เดือดร้อนใคร ก็ทำไปเถอะ อย่าไปคิดมากจนผมร่วงเหมือนบังเลย!'
      ];
      return longReplies[Math.floor(Math.random() * longReplies.length)];
    }

    // General Short Replies
    const generalReplies = [
      'อืมมม... ก็ว่ากันไปจ้ะนาย มีเหตุผลของมันอยู่',
      'ก็นั่นสินะนายจ๋า... บังฟังแล้วก็เห็นภาพตามเลย',
      'ตอบยากจังจ้ะนาย เอาเป็นว่าบังพยักหน้าเห็นด้วยไปก่อนละกันนะ!'
    ];
    return generalReplies[Math.floor(Math.random() * generalReplies.length)];
  },

  render() {
    const box = document.getElementById('abdul-chat-messages');
    if (!box) return;
    const messages = this.messages();
    if (!messages.length) {
      box.innerHTML = '<div class="abdul-welcome">อับดุลเอ๊ย... ถามอะไรก็ (อาจจะ) ตอบได้!<br><span style="font-size:0.82rem;opacity:0.8;">มีอะไรก็ถามมาจ้ะนายจ๋า แต่อย่าถามเยอะ บังปวดหัว!</span></div>';
      return;
    }
    box.innerHTML = messages.map((message, index) => `
      <div class="abdul-message ${message.role}" data-index="${index}" title="คลิกขวา หรือกดค้างเพื่อจัดการข้อความ">
        ${message.role === 'abdul' ? '<img src="icon_sss/อับดุลเอ๊ย.jpg" alt="อับดุล" class="abdul-message-avatar" />' : ''}
        <div class="abdul-bubble">${this.escape(message.text)}</div>
      </div>`).join('');
    box.scrollTop = box.scrollHeight;
  },

  escape(text) {
    return String(text || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  },
};

// Shared birth profile keeps every astrology form in sync on the same device.
const BirthProfile = {
  months: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
  syncing: false,

  get() { return Store.get(STORAGE.BIRTH_PROFILE, {}) || {}; },

  _dateParts(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? { year: match[1], month: match[2], day: match[3] } : {};
  },

  _dateValue(wrapper) {
    const yearInput = wrapper.querySelector('[data-date-part="year"]');
    const rawYear = yearInput?.value.trim();
    const yearNumber = Number(rawYear);
    const year = yearNumber >= 2400 ? yearNumber - 543 : yearNumber;
    const month = Number(wrapper.querySelector('[data-date-part="month"]')?.value);
    const day = Number(wrapper.querySelector('[data-date-part="day"]')?.value);
    const maxDay = this._daysInMonth(year, month);
    return year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= maxDay
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : '';
  },

  _daysInMonth(year, month) {
    return year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  },

  _setHidden(input, value, emit = true) {
    if (input.value === value) return;
    input.value = value;
    if (emit) input.dispatchEvent(new Event('input', { bubbles: true }));
    if (emit) input.dispatchEvent(new Event('change', { bubbles: true }));
  },

  _syncDays(wrapper) {
    const day = wrapper.querySelector('[data-date-part="day"]');
    const rawYear = wrapper.querySelector('[data-date-part="year"]')?.value;
    const yearNumber = Number(rawYear);
    const year = yearNumber >= 2400 ? yearNumber - 543 : yearNumber;
    const month = wrapper.querySelector('[data-date-part="month"]')?.value;
    if (!day) return;
    if (day.tagName === 'INPUT') return;
    const current = day.value;
    const max = this._daysInMonth(year, month);
    day.innerHTML = '<option value="">วัน</option>';
    for (let value = 1; value <= max; value += 1) {
      const option = document.createElement('option');
      option.value = String(value).padStart(2, '0');
      option.textContent = value;
      day.appendChild(option);
    }
    day.value = current && Number(current) <= max ? current : '';
  },

  _setWrapperValue(wrapper, value, calendar = 'be') {
    const parts = this._dateParts(value);
    const displayYear = parts.year && calendar === 'ce' ? parts.year : (parts.year ? String(Number(parts.year) + 543) : '');
    wrapper.querySelector('[data-date-part="year"]').value = displayYear;
    wrapper.querySelector('[data-date-part="month"]').value = parts.month || '';
    this._syncDays(wrapper);
    wrapper.querySelector('[data-date-part="day"]').value = parts.day || '';
  },

  _broadcast(value, sourceInput, calendar = 'be') {
    const profile = this.get();
    Store.set(STORAGE.BIRTH_PROFILE, { ...profile, date: value, dateCalendar: calendar, updatedAt: Date.now() });
    document.querySelectorAll('input[data-shared-birth-date]').forEach((input) => {
      if (input !== sourceInput) {
        this._setHidden(input, value, false);
        const wrapper = input.closest('.birth-date-control');
        if (wrapper) this._setWrapperValue(wrapper, value, calendar);
      }
    });
    document.dispatchEvent(new CustomEvent('birthprofile:change', { detail: { ...this.get(), date: value } }));
  },

  _broadcastTime(value, sourceInput) {
    const profile = this.get();
    Store.set(STORAGE.BIRTH_PROFILE, { ...profile, time: value, updatedAt: Date.now() });
    document.querySelectorAll('input[data-shared-birth-time]').forEach((input) => {
      if (input !== sourceInput && input.value !== value) input.value = value;
    });
    document.dispatchEvent(new CustomEvent('birthprofile:change', { detail: { ...this.get(), time: value } }));
  },

  enhanceDateInput(input, fallback = '') {
    if (!input || input.dataset.birthEnhanced === 'true') return input;
    const stored = this.get().date || input.value || fallback || '';
    input.dataset.birthEnhanced = 'true';
    input.dataset.sharedBirthDate = 'true';
    input.type = 'hidden';
    input.removeAttribute('max');
    const wrapper = document.createElement('div');
    wrapper.className = 'birth-date-control';
    wrapper.setAttribute('role', 'group');
    wrapper.setAttribute('aria-label', 'วันเดือนปีเกิด');
    wrapper.innerHTML = `
      <input data-date-part="day" type="text" inputmode="numeric" maxlength="2" placeholder="วัน" aria-label="วันเกิด">
      <input data-date-part="month" type="text" inputmode="numeric" maxlength="2" placeholder="เดือน" aria-label="เดือนเกิด">
      <input data-date-part="year" type="text" inputmode="numeric" maxlength="4" placeholder="ปี พ.ศ. / ค.ศ." aria-label="ปีเกิด พ.ศ. หรือ ค.ศ.">`;
    input.parentNode.insertBefore(wrapper, input);
    this._setWrapperValue(wrapper, stored, this.get().dateCalendar || 'be');
    this._setHidden(input, this._dateValue(wrapper), false);

    const update = () => {
      this._syncDays(wrapper);
      const value = this._dateValue(wrapper);
      const rawYear = Number(wrapper.querySelector('[data-date-part="year"]')?.value);
      const calendar = rawYear >= 2400 ? 'be' : 'ce';
      this._setHidden(input, value);
      this._broadcast(value, input, calendar);
    };
    wrapper.querySelectorAll('input').forEach((part) => {
      part.addEventListener('input', update);
      part.addEventListener('change', update);
    });
    return input;
  },

  enhanceTimeInput(input, fallback = '') {
    if (!input || input.dataset.birthTimeEnhanced === 'true') return input;
    const stored = this.get().time || input.value || fallback || '';
    input.dataset.birthTimeEnhanced = 'true';
    input.dataset.sharedBirthTime = 'true';
    input.value = stored;
    const update = () => this._broadcastTime(input.value, input);
    input.addEventListener('input', update);
    input.addEventListener('change', update);
    return input;
  },

  enhanceCurrentPage() {
    document.querySelectorAll('input[type="date"]').forEach((input) => this.enhanceDateInput(input));
    document.querySelectorAll('input[type="time"]').forEach((input) => this.enhanceTimeInput(input));
    document.querySelectorAll('#astro-gender').forEach((select) => {
      const profile = this.get();
      if (profile.gender && !select.value) select.value = profile.gender;
      select.addEventListener('change', () => this.setGender(select.value));
    });
  },

  setGender(gender) {
    if (!gender) return;
    const profile = this.get();
    Store.set(STORAGE.BIRTH_PROFILE, { ...profile, gender, updatedAt: Date.now() });
    document.querySelectorAll('#astro-gender').forEach((select) => { select.value = gender; });
    document.dispatchEvent(new CustomEvent('birthprofile:change', { detail: this.get() }));
  },

  syncSegmentedGender(container) {
    if (!container) return;
    const saved = this.get().gender;
    if (saved) container.querySelectorAll('[data-gender]').forEach((button) => button.classList.toggle('active', button.dataset.gender === saved));
    container.querySelectorAll('[data-gender]').forEach((button) => button.addEventListener('click', () => this.setGender(button.dataset.gender)));
  },

  syncFromStorage(profile) {
    if (!profile) return;
    if (profile.time) {
      document.querySelectorAll('input[data-shared-birth-time]').forEach((input) => { input.value = profile.time; });
    }
    if (profile.date) {
      document.querySelectorAll('input[data-shared-birth-date]').forEach((input) => {
        input.value = profile.date;
        const wrapper = input.closest('.birth-date-control');
        if (wrapper) this._setWrapperValue(wrapper, profile.date, profile.dateCalendar || 'be');
      });
    }
  },
};

window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE.BIRTH_PROFILE || !event.newValue) return;
  try { BirthProfile.syncFromStorage(JSON.parse(event.newValue)); } catch {}
});

// ---- Text to speech ----
const TextToSpeech = {
  voices: [],
  activeButton: null,
  utterance: null,
  voicesChanged: null,

  init() {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      this.voices = window.speechSynthesis.getVoices();
      this.voicesChanged?.(this.voices);
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
  },

  _voice(text) {
    const matching = this.voices.filter(voice => voice.lang.toLowerCase().startsWith('th'));
    const selected = Store.get(STORAGE.TTS_VOICE, 'auto');
    if (selected && selected !== 'auto') {
      const selectedVoice = matching.find(voice => voice.voiceURI === selected);
      if (selectedVoice) return selectedVoice;
    }
    const preferred = matching.filter(voice => /microsoft|google|natural|neural/i.test(voice.name));
    return preferred[0] || matching[0];
  },

  speak(text, button) {
    if (!('speechSynthesis' in window)) return;
    if (this.activeButton === button && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      this._resetButton(button);
      return;
    }

    window.speechSynthesis.cancel();
    this._resetButton(this.activeButton);
    const cleanText = String(text || '').replace(/[*_#`]/g, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voice = this._voice(cleanText);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'th-TH';
    }
    utterance.rate = 0.95;
    utterance.onend = () => this._resetButton(button);
    utterance.onerror = () => this._resetButton(button);
    this.activeButton = button;
    this.utterance = utterance;
    button.classList.add('is-speaking');
    button.textContent = '⏹ หยุดฟัง';
    window.speechSynthesis.speak(utterance);
  },

  _resetButton(button) {
    if (!button) return;
    button.classList.remove('is-speaking');
    button.textContent = '🔊 ฟังเสียง';
    if (this.activeButton === button) this.activeButton = null;
  },

  addButton(container, getText) {
    if (!container || !('speechSynthesis' in window)) return null;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tts-button';
    button.textContent = '🔊 ฟังเสียง';
    button.title = 'อ่านคำตอบด้วยเสียงไทยแบบธรรมชาติ';
    button.setAttribute('aria-label', 'ฟังคำตอบด้วยเสียง');
    button.addEventListener('click', () => this.speak(getText(), button));
    container.appendChild(button);
    return button;
  }
};

// ---- Layout helpers ----
// ใช้กับหน้าจอแชทที่ต้องล็อกช่องพิมพ์ไว้กับจอ (ไม่เลื่อนตามประวัติ)
const Layout = {
  syncNavHeight() {
    const nav = document.querySelector('.navbar');
    if (nav) document.documentElement.style.setProperty('--navbar-h', `${nav.offsetHeight}px`);
  },

  lockViewport() {
    this.syncNavHeight();
    window.addEventListener('resize', () => this.syncNavHeight());
    window.addEventListener('orientationchange', () => setTimeout(() => this.syncNavHeight(), 250));

    // ไม่ให้คีย์บอร์ดมือถือบังช่องพิมพ์
    const vv = window.visualViewport;
    if (!vv) return;
    const applyInset = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty('--kb-inset', `${Math.round(inset)}px`);
    };
    vv.addEventListener('resize', applyInset);
    vv.addEventListener('scroll', applyInset);
    applyInset();
  },
};

// ---- Toast Notifications ----
function showToast(msg, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ---- Settings Panel ----
class SettingsPanel {
  constructor() {
    this.overlay  = document.getElementById('settings-overlay');
    this.panel    = document.getElementById('settings-panel');
    this.apiInput = document.getElementById('setting-api-key');
    this.modelSel = document.getElementById('setting-model');
    this.voiceSel = document.getElementById('setting-voice');
    this.eyeBtn   = document.getElementById('toggle-eye');
    this.modelStatus = document.getElementById('model-status');
    this._ensureSoundSettings();

    TextToSpeech.voicesChanged = () => this.populateVoices();

    this._bind();
    this._loadValues();
  }

  _bind() {
    // Open / close
    document.getElementById('btn-settings')?.addEventListener('click', () => this.open());
    document.getElementById('btn-settings-close')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());

    this.soundVolume?.addEventListener('input', () => {
      const value = SoundEffects.setVolume(this.soundVolume.value);
      this._updateSoundLabel(value);
    });
    this.soundMute?.addEventListener('click', () => {
      const muted = SoundEffects.volume() > 0;
      const value = SoundEffects.setVolume(muted ? 0 : (this.soundVolume.dataset.previous || 55));
      if (value > 0) this.soundVolume.dataset.previous = value;
      this._updateSoundLabel(value);
    });
    document.addEventListener('soundeffects:volume', (event) => {
      const value = event.detail?.value ?? 0;
      if (this.soundVolume) this.soundVolume.value = value;
      this._updateSoundLabel(value);
    });

    // Eye toggle
    this.eyeBtn?.addEventListener('click', () => {
      const isPass = this.apiInput.type === 'password';
      this.apiInput.type = isPass ? 'text' : 'password';
      this.eyeBtn.textContent = isPass ? '🙈' : '👁';
    });

    // Save
    document.getElementById('btn-save-settings')?.addEventListener('click', () => this.save());

    // Clear all data
    document.getElementById('btn-clear-data')?.addEventListener('click', () => {
      if (confirm('ล้างข้อมูลทั้งหมด? (API Key, ประวัติ, ผลไพ่) จะถูกลบ')) {
        Object.values(STORAGE).forEach(k => Store.remove(k));
        this._loadValues();
        showToast('ล้างข้อมูลทั้งหมดแล้ว', 'success');
      }
    });

    // Auto-load models when API key changes
    this.apiInput?.addEventListener('change', () => {
      const key = this.apiInput.value.trim();
      if (key) window.modelManager?.fetchModels(key);
    });

    this.voiceSel?.addEventListener('change', () => {
      Store.set(STORAGE.TTS_VOICE, this.voiceSel.value || 'auto');
    });
  }

  _ensureSoundSettings() {
    const body = this.panel?.querySelector('.settings-body');
    if (!body || body.querySelector('#setting-sfx-volume')) return;
    const section = document.createElement('div');
    section.className = 'settings-section settings-sound-section';
    section.innerHTML = `
      <label for="setting-sfx-volume">🔊 เสียงเอฟเฟกต์</label>
      <div class="sound-volume-row">
        <input id="setting-sfx-volume" type="range" min="0" max="100" step="1" aria-label="ระดับเสียงเอฟเฟกต์">
        <output id="setting-sfx-label" for="setting-sfx-volume">55%</output>
        <button type="button" class="sound-mute-btn" id="setting-sfx-mute" aria-label="ปิดเสียงเอฟเฟกต์">🔇</button>
      </div>`;
    body.insertBefore(section, body.querySelector('.settings-divider:last-of-type') || null);
    this.soundVolume = section.querySelector('#setting-sfx-volume');
    this.soundLabel = section.querySelector('#setting-sfx-label');
    this.soundMute = section.querySelector('#setting-sfx-mute');
    const value = Number(Store.get(STORAGE.SFX_VOLUME, SoundEffects.defaultVolume * 100));
    this.soundVolume.value = Math.max(0, Math.min(100, value));
    this._updateSoundLabel(this.soundVolume.value);
  }

  _updateSoundLabel(value) {
    if (this.soundLabel) this.soundLabel.value = `${Math.round(Number(value) || 0)}%`;
    if (this.soundMute) {
      const muted = Number(value) <= 0;
      this.soundMute.textContent = muted ? '🔊' : '🔇';
      this.soundMute.setAttribute('aria-label', muted ? 'เปิดเสียงเอฟเฟกต์' : 'ปิดเสียงเอฟเฟกต์');
    }
  }

  _loadValues() {
    if (this.apiInput) this.apiInput.value = Store.get(STORAGE.API_KEY, '');
    this.populateVoices();
    const saved = Store.get(STORAGE.MODEL, '');
    if (this.modelSel && saved) {
      this.modelSel.dataset.saved = saved;
      this.modelSel.value = saved;
      if (window.modelManager) {
        window.modelManager.selectModel(saved);
      }
    }
  }

  populateVoices() {
    if (!this.voiceSel || !('speechSynthesis' in window)) return;
    const saved = Store.get(STORAGE.TTS_VOICE, 'auto');
    const voices = TextToSpeech.voices.filter(voice => voice.lang.toLowerCase().startsWith('th')).sort((a, b) => {
      const aNatural = /microsoft|google|natural|neural/i.test(a.name) ? 0 : 1;
      const bNatural = /microsoft|google|natural|neural/i.test(b.name) ? 0 : 1;
      return aNatural - bNatural || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
    });
    this.voiceSel.innerHTML = '<option value="auto">✨ อัตโนมัติ — เสียงธรรมชาติ (แนะนำ)</option>';
    voices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      option.textContent = `เสียงไทยแบบธรรมชาติ ลำดับที่ ${index + 1}`;
      this.voiceSel.appendChild(option);
    });
    this.voiceSel.value = voices.some(voice => voice.voiceURI === saved) ? saved : 'auto';
  }

  open() {
    this.overlay?.classList.add('open');
    this.panel?.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Try to refresh models when opening settings
    const key = Store.get(STORAGE.API_KEY, '');
    if (key) window.modelManager?.fetchModels(key, false);
  }

  close() {
    this.overlay?.classList.remove('open');
    this.panel?.classList.remove('open');
    document.body.style.overflow = '';
  }

  save() {
    const key   = this.apiInput?.value.trim() || '';
    const model = this.modelSel?.value || '';
    const voice = this.voiceSel?.value || 'auto';
    Store.set(STORAGE.API_KEY, key);
    Store.set(STORAGE.MODEL, model);
    Store.set(STORAGE.TTS_VOICE, voice);
    showToast('บันทึกการตั้งค่าแล้ว ✓', 'success');
    this.close();
    // Notify other modules
    document.dispatchEvent(new CustomEvent('settings:saved', { detail: { key, model } }));
  }

  setModelStatus(msg, type = '') {
    if (!this.modelStatus) return;
    this.modelStatus.textContent = msg;
    this.modelStatus.className = `model-status ${type}`;
  }
}

// ---- First-visit API guide ----
function showApiGuide() {
  if (Store.get(STORAGE.API_KEY, '') || Store.get(STORAGE.API_GUIDE_SEEN, false)) return;

  const overlay = document.createElement('div');
  overlay.className = 'api-guide-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'api-guide-title');
  overlay.innerHTML = `
    <div class="api-guide-modal">
      <button class="api-guide-close" type="button" aria-label="ปิด">✕</button>
      <div class="api-guide-icon">🔑</div>
      <h2 id="api-guide-title">เริ่มใช้งาน</h2>
      <p>กรอก Gemini API Key เพื่อเปิดใช้คำทำนายและการสนทนา</p>
      <ol>
        <li>กดปุ่มรับคีย์ด้านล่าง</li>
        <li>คัดลอกคีย์ที่ได้</li>
        <li>นำมาวางในช่อง แล้วกดบันทึก</li>
      </ol>
      <a class="api-guide-link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">รับ Gemini API Key</a>
      <input class="api-guide-input" type="password" placeholder="วาง API Key ที่นี่" autocomplete="off" spellcheck="false" />
      <button class="api-guide-save" type="button">บันทึกคีย์</button>
      <button class="api-guide-later" type="button">ไว้ก่อน</button>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.api-guide-input');
  const close = () => {
    Store.set(STORAGE.API_GUIDE_SEEN, true);
    overlay.remove();
  };
  overlay.querySelector('.api-guide-close').addEventListener('click', close);
  overlay.querySelector('.api-guide-later').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelector('.api-guide-save').addEventListener('click', () => {
    const key = input.value.trim();
    if (!key) {
      input.focus();
      showToast('กรุณาวาง API Key ก่อน', 'error');
      return;
    }
    Store.set(STORAGE.API_KEY, key);
    Store.set(STORAGE.API_GUIDE_SEEN, true);
    overlay.remove();
    window.settingsPanel?._loadValues();
    showToast('บันทึก API Key แล้ว', 'success');
  });
}

// ---- PWA Install Prompt ----
class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.banner = document.getElementById('install-banner');
    this.isMobileDevice = this._isMobileDevice();
    this.isHomePage = !/\/pages\//i.test(location.pathname);
    this.isInstalled = this._isInstalled();
    this.dismissed = false;
    this.showTimer = null;
    this.reminderTimer = null;
    this._setup();
  }

  _setup() {
    if (!this.isMobileDevice || !this.isHomePage || this.isInstalled) return;

    // Show our mobile install reminder even when the browser delays its native prompt.
    this._showBanner();
    this.reminderTimer = setInterval(() => {
      if (!this.isDismissed() && !this.isInstalled) this._showBanner();
    }, 30000);

    // Android/Chrome
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (!this.isDismissed()) this._showBanner();
    });

    window.addEventListener('appinstalled', () => {
      this.dismissed = true;
      this.isInstalled = true;
      this._hideBanner();
      showToast('ติดตั้งแอปสำเร็จแล้ว! 🎉', 'success', 4000);
    });

    // iOS Safari
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone;
    if (isIOS && !isStandalone && !this.isDismissed()) {
      setTimeout(() => this._showIOSBanner(), 2000);
    }

    document.getElementById('btn-install-pwa')?.addEventListener('click', () => this._install());
    document.getElementById('btn-dismiss-pwa')?.addEventListener('click', () => {
      this.dismissed = true;
      if (this.showTimer) clearTimeout(this.showTimer);
      this._hideBanner();
    });
  }

  _showBanner() {
    if (!this.isMobileDevice || this.isDismissed() || !this.banner) return;
    this.showTimer = setTimeout(() => {
      if (!this.isDismissed()) this.banner?.classList.add('show');
    }, 1500);
  }

  _hideBanner() { this.banner?.classList.remove('show'); }

  _isInstalled() {
    return window.matchMedia?.('(display-mode: standalone)').matches
      || window.navigator.standalone === true
      || document.referrer.startsWith('android-app://');
  }

  _isMobileDevice() {
    const userAgent = navigator.userAgent || '';
    const isPhoneOrTablet = /Android|iPhone|iPad|iPod|Windows Phone/i.test(userAgent);
    const isIPadDesktopMode = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;
    return isPhoneOrTablet || isIPadDesktopMode;
  }

  isDismissed() {
    return this.dismissed;
  }

  async _install() {
    if (!this.deferredPrompt) {
      showToast('เบราว์เซอร์ยังไม่พร้อมสำหรับการติดตั้ง ลองกดอีกครั้งสักครู่', 'info', 3500);
      return;
    }
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
    if (outcome === 'accepted') this.dismissed = true;
    this._hideBanner();
  }

  _showIOSBanner() {
    if (!this.isMobileDevice || !this.banner || this.isDismissed()) return;
    const icon = this.banner.querySelector('.install-banner-icon');
    const strong = this.banner.querySelector('.install-banner-text strong');
    const span   = this.banner.querySelector('.install-banner-text span');
    const btn    = document.getElementById('btn-install-pwa');
    if (icon) icon.textContent = '📱';
    if (strong) strong.textContent = 'ติดตั้งบน iPhone/iPad';
    if (span) span.textContent = 'กด Share → Add to Home Screen';
    if (btn) btn.style.display = 'none';
    this.banner.classList.add('show');
  }
}

// ---- Gemini API Call ----
async function callGemini(prompt, systemInstruction = '', options = {}) {
  const apiKey = Store.get(STORAGE.API_KEY, '');
  const model  = Store.get(STORAGE.MODEL, DEFAULT_MODEL);
  if (!apiKey) throw new Error('NO_API_KEY');

  const modelId = model.startsWith('models/') ? model.slice(7) : model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: options.maxOutputTokens || 2048
    }
  };
  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ---- Gemini Streaming API Call ----
async function* callGeminiStream(prompt, systemInstruction = '') {
  const apiKey = Store.get(STORAGE.API_KEY, '');
  const model  = Store.get(STORAGE.MODEL, DEFAULT_MODEL);
  if (!apiKey) throw new Error('NO_API_KEY');

  const modelId = model.startsWith('models/') ? model.slice(7) : model;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 2048 }
  };
  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const json = line.slice(6).trim();
        if (json === '[DONE]') return;
        try {
          const parsed = JSON.parse(json);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch {}
      }
    }
  }
}

// ---- Register Service Worker ----
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    const swPath = location.pathname.includes('pages') ? '../sw.js' : './sw.js';
    const hadController = Boolean(navigator.serviceWorker.controller);
    let refreshed = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || refreshed) return;
      refreshed = true;
      window.location.reload();
    });

    navigator.serviceWorker.register(swPath).then((registration) => {
      registration.update().catch(() => {});
      setInterval(() => registration.update().catch(() => {}), 5 * 60 * 1000);

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
    }).catch(() => {});
  });
}

// ---- Init ----
window.Store    = Store;
window.STORAGE  = STORAGE;
window.Layout   = Layout;
window.showToast = showToast;
window.BirthProfile = BirthProfile;
window.callGemini = callGemini;
window.callGeminiStream = callGeminiStream;
window.TextToSpeech = TextToSpeech;
window.SoundEffects = SoundEffects;
window.addTTSButton = (container, getText) => TextToSpeech.addButton(container, getText);

document.addEventListener('DOMContentLoaded', () => {
  Layout.lockViewport();
  TextToSpeech.init();
  SoundEffects.init();
  window.settingsPanel = new SettingsPanel();
  window.pwaInstaller  = new PWAInstaller();
  BirthProfile.enhanceCurrentPage();
  AbdulChat.init();
  setTimeout(showApiGuide, 250);
});
