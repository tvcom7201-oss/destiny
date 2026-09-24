/* ============================================================
   models.js — Gemini Model Manager (Curated 11 Models)
   ============================================================ */

'use strict';

// รายการโมเดลที่กำหนดไว้ 11 โมเดลตามคำขอของผู้ใช้
const ALL_MODELS = [
  { id: 'models/gemini-3.5-flash-lite',        name: '⚡ Gemini 3.5 Flash Lite',        badge: 'แนะนำ',  type: 'flash' },
  { id: 'models/gemini-2.5-flash',              name: '⚡ Gemini 2.5 Flash',             badge: 'เสถียร',  type: 'flash' },
  { id: 'models/gemini-2.5-pro',                name: '🔥 Gemini 2.5 Pro',               badge: 'แม่นยำ', type: 'pro' },
  { id: 'models/gemini-2.5-flash-lite',         name: '⚡ Gemini 2.5 Flash-Lite',        badge: 'เบาเร็ว',type: 'flash' },
  { id: 'models/gemini-3-flash-preview',        name: '🌟 Gemini 3 Flash Preview',       badge: 'Preview',type: 'new' },
  { id: 'models/gemini-3.1-flash-lite-preview', name: '💫 Gemini 3.1 Flash Lite Preview',badge: 'Preview',type: 'new' },
  { id: 'models/gemini-3.1-flash-lite',         name: '⚡ Gemini 3.1 Flash Lite',        badge: 'เบาเร็ว',type: 'flash' },
  { id: 'models/gemini-3.5-flash',              name: '🚀 Gemini 3.5 Flash',             badge: 'รุ่นใหม่',type: 'new' },
  { id: 'models/gemini-3.6-flash',              name: '🚀 Gemini 3.6 Flash',             badge: 'รุ่นใหม่',type: 'new' },
  { id: 'models/gemini-3.7-flash',              name: '🚀 Gemini 3.7 Flash',             badge: 'รุ่นใหม่',type: 'new' },
  { id: 'models/gemini-3.8-flash',              name: '🚀 Gemini 3.8 Flash',             badge: 'ล่าสุด',  type: 'new' },
];

class ModelManager {
  constructor(selectEl) {
    this.selectEl = selectEl;
    this.models = ALL_MODELS;

    // Upgrade the previous built-in default without changing a deliberate newer choice.
    const savedModel = Store.get(STORAGE.MODEL, '');
    if (!savedModel || savedModel === 'models/gemini-2.5-flash') {
      Store.set(STORAGE.MODEL, DEFAULT_MODEL);
    }
    
    // ล้างแคชเก่าที่อาจมีโมเดลขยะหลงเหลืออยู่
    Store.remove('tepsa_models_cache');
    Store.remove('tepsa_models_cache_v2');

    this._initCustomSelect();
    this._loadCurrentSelection();
  }

  _initCustomSelect() {
    if (!this.selectEl) return;

    // ซ่อน native select ไว้เบื้องหลัง
    this.selectEl.style.display = 'none';

    // ค้นหาหรือสร้าง container สำหรับ Custom Select
    const parent = this.selectEl.parentElement;
    let container = parent.querySelector('.custom-select-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'custom-select-container';
      container.innerHTML = `
        <div class="custom-select-trigger" id="custom-model-trigger" tabindex="0" role="button" aria-haspopup="listbox" aria-expanded="false">
          <div class="custom-select-label-wrap">
            <span class="custom-select-label">⚡ Gemini 3.5 Flash Lite</span>
          </div>
          <span class="custom-select-arrow">▾</span>
        </div>
        <div class="custom-select-dropdown" id="custom-model-dropdown" role="listbox" style="display:none;"></div>
      `;
      parent.appendChild(container);
    }

    this.container = container;
    this.trigger   = container.querySelector('.custom-select-trigger');
    this.labelWrap = container.querySelector('.custom-select-label-wrap');
    this.dropdown  = container.querySelector('.custom-select-dropdown');

    // คลิกปุ่มเพื่อเปิด/ปิด
    this.trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = this.dropdown.style.display !== 'none';
      this._toggleDropdown(!isOpen);
    });

    // คลิกข้างนอกเพื่อปิด
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this._toggleDropdown(false);
      }
    });

    // ปิดด้วยปุ่ม Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._toggleDropdown(false);
      }
    });

    // สร้างตัวเลือกทั้งหมดทันที
    this._renderItems();
  }

  _toggleDropdown(show) {
    if (!this.dropdown) return;
    this.dropdown.style.display = show ? 'block' : 'none';
    this.trigger?.classList.toggle('active', show);
    this.trigger?.setAttribute('aria-expanded', show ? 'true' : 'false');
  }

  _loadCurrentSelection() {
    const saved = Store.get(STORAGE.MODEL, '') || this.selectEl.dataset.saved || DEFAULT_MODEL;
    this.selectModel(saved);
  }

  _renderItems() {
    if (!this.selectEl || !this.dropdown) return;

    const saved = Store.get(STORAGE.MODEL, '') || this.selectEl.dataset.saved || DEFAULT_MODEL;
    let current = this.selectEl.value || saved;

    if (!ALL_MODELS.some(m => m.id === current)) {
      current = ALL_MODELS[0].id;
    }

    // 1. อัปเดต Native Select
    this.selectEl.innerHTML = '';
    for (const m of ALL_MODELS) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === current) opt.selected = true;
      this.selectEl.appendChild(opt);
    }
    this.selectEl.value = current;

    // 2. สร้าง Custom Dropdown Items ทั้ง 11 ตัว
    this.dropdown.innerHTML = '';
    for (const m of ALL_MODELS) {
      const item = document.createElement('div');
      const isSelected = m.id === current;
      item.className = `custom-select-item ${isSelected ? 'selected' : ''}`;
      item.dataset.value = m.id;

      let badgeClass = 'badge-new';
      if (m.type === 'flash') badgeClass = 'badge-flash';
      else if (m.type === 'pro') badgeClass = 'badge-pro';

      item.innerHTML = `
        <div class="item-main">
          <span>${m.name}</span>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span class="item-badge ${badgeClass}">${m.badge}</span>
          <span class="item-check">${isSelected ? '✓' : ''}</span>
        </div>
      `;

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectModel(m.id);
      });

      this.dropdown.appendChild(item);
    }

    this.updateTriggerLabel(current);
  }

  selectModel(modelId) {
    if (!ALL_MODELS.some(m => m.id === modelId)) {
      modelId = ALL_MODELS[0].id;
    }

    this.selectEl.value = modelId;
    this.selectEl.dispatchEvent(new Event('change', { bubbles: true }));

    // อัปเดตไฮไลต์ในเมนู
    if (this.dropdown) {
      this.dropdown.querySelectorAll('.custom-select-item').forEach(el => {
        const isSel = el.dataset.value === modelId;
        el.classList.toggle('selected', isSel);
        const check = el.querySelector('.item-check');
        if (check) check.textContent = isSel ? '✓' : '';
      });
    }

    this.updateTriggerLabel(modelId);
    this._toggleDropdown(false);
  }

  updateTriggerLabel(modelId) {
    if (!this.labelWrap) return;
    const model = ALL_MODELS.find(m => m.id === modelId) || ALL_MODELS[0];
    this.labelWrap.innerHTML = `<span class="custom-select-label">${model.name}</span>`;
  }

  async fetchModels(apiKey, showStatus = true) {
    if (!apiKey) return;
    const panel = window.settingsPanel;
    if (showStatus && panel) panel.setModelStatus('⏳ กำลังตรวจสอบ API Key...', 'loading');

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=10`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      // ยืนยันว่าคีย์ใช้ได้ และแสดงผลรายการ 11 โมเดลที่กำหนดไว้
      this._renderItems();
      if (showStatus && panel) panel.setModelStatus(`✓ API Key พร้อมใช้ (${ALL_MODELS.length} โมเดล)`, 'success');
    } catch (err) {
      console.warn('[Models] test failed:', err.message);
      this._renderItems();
      if (showStatus && panel) panel.setModelStatus('⚠ ตรวจสอบ API Key (ใช้รายการโมเดลมาตรฐาน)', 'error');
    }
  }
}

// เริ่มต้นทำงานทันทีที่ DOM พร้อม
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('setting-model');
  if (sel) {
    window.modelManager = new ModelManager(sel);
    const key = Store.get(STORAGE.API_KEY, '');
    if (key) window.modelManager.fetchModels(key, false);
  }
});
