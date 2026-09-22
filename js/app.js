/* ============================================================
   app.js — Core Application Logic
   Settings, Storage, PWA Install, Toast, Shared utilities
   ============================================================ */

'use strict';

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

    TextToSpeech.voicesChanged = () => this.populateVoices();

    this._bind();
    this._loadValues();
  }

  _bind() {
    // Open / close
    document.getElementById('btn-settings')?.addEventListener('click', () => this.open());
    document.getElementById('btn-settings-close')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());

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

// ---- PWA Install Prompt ----
class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.banner = document.getElementById('install-banner');
    this.isMobileDevice = this._isMobileDevice();
    this.dismissed = Boolean(Store.get(STORAGE.DISMISSED_PWA, false));
    this.showTimer = null;
    this._setup();
  }

  _setup() {
    // Android/Chrome
    window.addEventListener('beforeinstallprompt', (e) => {
      if (!this.isMobileDevice) return;
      e.preventDefault();
      this.deferredPrompt = e;
      if (!this.isDismissed()) this._showBanner();
    });

    window.addEventListener('appinstalled', () => {
      this.dismissed = true;
      Store.set(STORAGE.DISMISSED_PWA, true);
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
      Store.set(STORAGE.DISMISSED_PWA, true);
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

  _isMobileDevice() {
    const userAgent = navigator.userAgent || '';
    const isPhoneOrTablet = /Android|iPhone|iPad|iPod|Windows Phone/i.test(userAgent);
    const isIPadDesktopMode = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;
    return isPhoneOrTablet || isIPadDesktopMode;
  }

  isDismissed() {
    return this.dismissed || Boolean(Store.get(STORAGE.DISMISSED_PWA, false));
  }

  async _install() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') Store.set(STORAGE.DISMISSED_PWA, true);
    this.deferredPrompt = null;
    this.dismissed = true;
    Store.set(STORAGE.DISMISSED_PWA, true);
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
  const model  = Store.get(STORAGE.MODEL, 'models/gemini-2.5-flash');
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
  const model  = Store.get(STORAGE.MODEL, 'models/gemini-2.5-flash');
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
window.callGemini = callGemini;
window.callGeminiStream = callGeminiStream;
window.TextToSpeech = TextToSpeech;
window.addTTSButton = (container, getText) => TextToSpeech.addButton(container, getText);

document.addEventListener('DOMContentLoaded', () => {
  Layout.lockViewport();
  TextToSpeech.init();
  window.settingsPanel = new SettingsPanel();
  window.pwaInstaller  = new PWAInstaller();
});
