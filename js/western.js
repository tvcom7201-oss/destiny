'use strict';

const ASTRO_SYSTEMS = {
  indian: {
    key: 'tepsa_indian_result',
    title: 'ดูดวงอินเดีย',
    icon: '🪷',
    description: 'โหราศาสตร์เวท จักรราศี นวางค์ และช่วงเวลาสำคัญของชีวิต',
    promptTitle: 'โหราศาสตร์อินเดียแบบเวท',
    topics: ['ภาพรวมชีวิต', 'การงานและการเงิน', 'ความรักและคู่ครอง', 'สุขภาพและจังหวะชีวิต', 'แนวทางเสริมดวง'],
    instructions: 'คุณคือหมอดูผู้ชาย ใช้สรรพนามผู้ชายและลงท้ายด้วยครับเท่านั้น ห้ามใช้ค่ะหรือคะ ใช้หลักโหราศาสตร์อินเดียแบบเวทอย่างมีเหตุผล อธิบายภาพรวม ลัคนา ราศีจันทร์ ดาวเด่น เรือนสำคัญ และช่วงเวลาที่ควรใส่ใจ โดยระบุว่านี่เป็นการอ่านเพื่อความบันเทิง ไม่ใช่การวินิจฉัยหรือการรับรองอนาคต'
  },
  western: {
    key: 'tepsa_western_result',
    title: 'ดูดวงยุโรป',
    icon: '♈',
    description: 'ดวงดาวตะวันตก ลัคนา บุคลิก ความสัมพันธ์ และจังหวะชีวิต',
    promptTitle: 'โหราศาสตร์ตะวันตก',
    topics: ['ภาพรวมบุคลิก', 'การงานและเป้าหมาย', 'ความรักและความสัมพันธ์', 'การเงินและโอกาส', 'คำแนะนำช่วงนี้'],
    instructions: 'คุณคือหมอดูผู้ชาย ใช้สรรพนามผู้ชายและลงท้ายด้วยครับเท่านั้น ห้ามใช้ค่ะหรือคะ ใช้หลักโหราศาสตร์ตะวันตก อธิบายราศีอาทิตย์ ราศีจันทร์ ลัคนา ดาวเคราะห์และมุมสัมพันธ์เท่าที่ข้อมูลอนุมานได้อย่างระมัดระวัง ห้ามกล่าวอ้างเป็นข้อเท็จจริงทางการแพทย์ การเงิน หรือกฎหมาย'
  }
};

class AstroReadingPage {
  constructor(system) {
    this.config = ASTRO_SYSTEMS[system];
    this.form = document.getElementById('astro-form');
    this.result = document.getElementById('astro-result');
    this.runButton = document.getElementById('astro-run');
    this.topic = document.getElementById('astro-topic');
    this.note = document.getElementById('astro-note');
    this.loading = false;
    this.bind();
    this.restore();
  }

  bind() {
    this.form?.addEventListener('submit', (event) => {
      event.preventDefault();
      this.run();
    });
    document.getElementById('astro-again')?.addEventListener('click', () => this.run());
    document.getElementById('astro-copy')?.addEventListener('click', () => this.copyResult());
  }

  collect() {
    const date = document.getElementById('astro-date')?.value;
    const time = document.getElementById('astro-time')?.value || '12:00';
    const place = document.getElementById('astro-place')?.value.trim();
    const gender = document.getElementById('astro-gender')?.value || 'ไม่ระบุ';
    if (!date || !place) {
      showToast('กรุณากรอกวันเกิดและสถานที่เกิด', 'error');
      return null;
    }
    return { date, time, place, gender, topic: this.topic?.value || this.config.topics[0], note: this.note?.value.trim() || '' };
  }

  prompt(data) {
    return `โปรดอ่านดวงด้วย${this.config.promptTitle}\nข้อมูลผู้ใช้:\n- วันเกิด: ${data.date}\n- เวลาเกิด: ${data.time}\n- สถานที่เกิด: ${data.place}\n- เพศ: ${data.gender}\n- หัวข้อที่สนใจ: ${data.topic}\n- หมายเหตุ: ${data.note || 'ไม่มี'}\n\nจัดคำตอบเป็นหัวข้อสั้น ๆ อ่านง่าย ได้แก่ ภาพรวม, จุดเด่น, สิ่งที่ควรระวัง, แนวทางปฏิบัติ และสรุปคำแนะนำ ห้ามสร้างข้อมูลตำแหน่งดาวแบบเจาะจงหากไม่มีข้อมูลคำนวณเพียงพอ`;
  }

  async run() {
    if (this.loading) return;
    if (!Store.get(STORAGE.API_KEY, '')) {
      showToast('กรุณาใส่ API Key ก่อนใช้งาน', 'error');
      window.settingsPanel?.open();
      return;
    }
    const data = this.collect();
    if (!data) return;
    this.loading = true;
    this.runButton.disabled = true;
    this.runButton.textContent = `${this.config.icon} กำลังเปิดดวง...`;
    this.result.innerHTML = '<div class="astro-card astro-loading">กำลังวิเคราะห์ข้อมูลดวงของคุณ...</div>';
    try {
      const text = await callGemini(this.prompt(data), this.config.instructions, { maxOutputTokens: 3072 });
      const saved = { text, data, ts: Date.now() };
      Store.set(this.config.key, saved);
      this.render(saved);
    } catch (error) {
      this.result.innerHTML = `<div class="astro-error">เกิดข้อผิดพลาด: ${escapeAstroText(error.message)}</div>`;
    } finally {
      this.loading = false;
      this.runButton.disabled = false;
      this.runButton.textContent = `${this.config.icon} วิเคราะห์ดวง`;
    }
  }

  render(saved) {
    const safeText = formatAstroReading(saved.text);
    this.result.innerHTML = `
      <article class="astro-result">
        <div class="astro-result-head"><div class="astro-result-badge">${this.config.icon} ผล${this.config.title}</div></div>
        <div class="astro-reading">${safeText}</div>
        <div class="astro-result-actions">
          <button class="astro-mini-btn" id="astro-copy" type="button">📋 คัดลอก</button>
          <button class="astro-mini-btn" id="astro-again" type="button">🔄 วิเคราะห์ใหม่</button>
        </div>
      </article>`;
    addTTSButton(this.result.querySelector('.astro-reading'), () => saved.text);
    this.result.querySelector('#astro-copy')?.addEventListener('click', () => this.copyResult());
    this.result.querySelector('#astro-again')?.addEventListener('click', () => this.run());
  }

  restore() {
    const saved = Store.get(this.config.key, null);
    if (!saved?.text) return;
    const data = saved.data || {};
    for (const [id, value] of [['astro-date', data.date], ['astro-time', data.time], ['astro-place', data.place], ['astro-gender', data.gender], ['astro-topic', data.topic], ['astro-note', data.note]]) {
      const element = document.getElementById(id);
      if (element && value) element.value = value;
    }
    this.render(saved);
  }

  copyResult() {
    const saved = Store.get(this.config.key, null);
    if (!saved?.text) return;
    navigator.clipboard?.writeText(saved.text)
      .then(() => showToast('คัดลอกคำทำนายแล้ว', 'success'))
      .catch(() => showToast('คัดลอกไม่สำเร็จ', 'error'));
  }
}

function escapeAstroText(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatAstroReading(value) {
  const lines = String(value ?? '').split(/\r?\n/);
  const html = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) { html.push('</ul>'); listOpen = false; }
  };
  const addParagraph = (text) => {
    const safe = escapeAstroText(text.trim());
    if (safe) html.push(`<p>${safe}</p>`);
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { closeList(); continue; }
    if (/^###\s+/.test(trimmed)) {
      closeList();
      html.push(`<h4>${escapeAstroText(trimmed.replace(/^###\s+/, ''))}</h4>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (!listOpen) { html.push('<ul>'); listOpen = true; }
      html.push(`<li>${escapeAstroText(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
    } else {
      closeList();
      addParagraph(trimmed);
    }
  }
  closeList();
  return html.join('');
}

document.addEventListener('DOMContentLoaded', () => {
  const system = document.body.dataset.astroSystem;
  if (system && ASTRO_SYSTEMS[system]) window.astroReadingPage = new AstroReadingPage(system);
});
