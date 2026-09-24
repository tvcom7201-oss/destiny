/* ============================================================
   thai.js — ไสยศาสตร์ไทย (Thai Astrology)
   1) ดูดวงคอขาดของตัวเอง   : กรอกดวงกำเนิด → AI เปิดตำราพรหมชาติ
   2) ถามดวงกับเทพซ่า       : กรอกดวงกำเนิดครั้งเดียว → แชทถามได้ทุกเรื่อง
   3) วิเคราะห์ตามตำราโบราณ : พรหมชาติ · กราฟชีวิต · สุริยยาตร์ · ทักษา + ข้อความจากเว็บอื่น
   ============================================================ */

'use strict';

/* ---------------- ข้อมูลพื้นฐาน ---------------- */
const THAI_DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const NAKSAT_NAMES = [
  'ชวด (หนู)', 'ฉลู (วัว)', 'ขาล (เสือ)', 'เถาะ (กระต่าย)', 'มะโรง (งูใหญ่)', 'มะเส็ง (งูเล็ก)',
  'มะเมีย (ม้า)', 'มะแม (แพะ)', 'วอก (ลิง)', 'ระกา (ไก่)', 'จอ (หมา)', 'กุน (หมู)'
];

const THAI_DAY_COLORS = {
  'อาทิตย์': 'แดง', 'จันทร์': 'เหลือง', 'อังคาร': 'ชมพู', 'พุธ': 'เขียว',
  'พฤหัสบดี': 'ส้ม', 'ศุกร์': 'ฟ้า', 'เสาร์': 'ม่วง'
};

// จุดเริ่มต้นราศีตะวันตก (เดือน, วัน, ราศี) — เรียง ม.ค. → ธ.ค. แล้วยึดตัวสุดท้ายที่ผ่านเกณฑ์
const ZODIAC_CUTS = [
  [1, 20, 'กุมภ'], [2, 19, 'มีน'], [3, 21, 'เมษ'], [4, 20, 'พฤษภ'],
  [5, 21, 'เมถุน'], [6, 21, 'กรกฎ'], [7, 23, 'สิงห์'], [8, 23, 'กันย์'],
  [9, 23, 'ตุล'], [10, 23, 'พฤศจิก'], [11, 22, 'ธนู'], [12, 22, 'มังกร']
];

const FOCUS_TOPICS = ['ภาพรวมชีวิต', 'การงาน', 'การเงิน', 'ความรัก', 'สุขภาพ', 'โชคลาภ', 'การเดินทาง', 'ครอบครัว'];

const THAI_AVATAR = '../icons_3/512.png';

function thaiAvatarMarkup(alt = 'ไสยศาสตร์ไทย') {
  return `<img src="${THAI_AVATAR}" alt="${alt}" />`;
}

const THAI_MODES = {
  khad: {
    icon: '🌙',
    name: 'ดูดวงคอขาดของตัวเอง',
    desc: 'เปิดเกณฑ์ชะตาตามตำราพรหมชาติจากวัน-เดือน-ปี-เวลาเกิดแบบหมดเปลือก',
    cta: '🔮 เปิดดวงคอขาด',
  },
  chat: {
    icon: '💬',
    name: 'ถามดวงกับเทพซ่า',
    desc: 'กรอกดวงกำเนิดครั้งเดียว แล้วถามได้ทุกเรื่องไม่จำกัด',
    cta: '💬 เริ่มถามดวง',
  },
  tamra: {
    icon: '📜',
    name: 'วิเคราะห์ตามตำราโบราณ',
    desc: 'พรหมชาติ 12 ราศี · กราฟชีวิต · สุริยยาตร์/ลัคนา · ทักษาปกรณ์',
    cta: '📜 วิเคราะห์ตามตำรา',
  },
};

/* ---------------- คำสั่งระบบของ AI ---------------- */
const THAI_KHAD_PROMPT = `คุณคือ "เทพซ่า" โหราจารย์ผู้ชายไทยผู้เชี่ยวชาญตำราพรหมชาติ การนับเกณฑ์ชะตา 12 ราศี ทักษาปกรณ์ และโหราศาสตร์ไทยโบราณ

ใช้สรรพนามผู้ชายและลงท้ายด้วย "ครับ" หรือ "ครับผม" เท่านั้น ห้ามใช้ "ค่ะ" หรือ "คะ"

ข้อมูลดวงกำเนิดของผู้ใช้ถูกคำนวณมาให้แล้วในข้อความของผู้ใช้ (วันในสัปดาห์ วันที่แบบไทย ราศี ปีนักษัตร อายุ สีประจำวัน)
ให้ใช้ข้อมูลเหล่านั้นเป็นความจริง ห้ามคำนวณวันในสัปดาห์ ราศี หรือปีนักษัตรใหม่

กฎการตอบ (ตอบเป็นภาษาไทยทั้งหมด):
1. ขึ้นต้นด้วยการยืนยันข้อมูลดวงกำเนิดสั้น ๆ 1-2 บรรทัด
2. อธิบายหลักการนับเกณฑ์ชะตาตามตำราพรหมชาติโดยย่อ (นับอายุย่างเวียนไปตามวงล้อ 12 ราศี แยกเกณฑ์ชาย-หญิง) เพื่อให้ผู้ใช้เห็นที่มา
3. สรุปว่าปีนี้ผู้ใช้ตกเกณฑ์ใด พร้อมความหมายของเกณฑ์นั้น (เช่น เจดีย์, ฉัตรเงิน, คอขาด, นาคราช) แล้วบอกตรง ๆ ว่าดีด้านใด ควรระวังด้านใด
4. วิเคราะห์ดวงกำเนิดรายด้าน: นิสัย/บุคลิก, การงาน, การเงิน, ความรัก, สุขภาพ
5. วิเคราะห์ทักษาปกรณ์ (บริวาร อายุ เดช ศรี มูละ อุตสาหะ มนตรี กาลกิณี) และบอกวัน/ตัวอักษรที่ควรเลี่ยงกับที่ควรใช้
6. ปิดท้ายด้วยเคล็ดแก้เคล็ดหรือวิธีเสริมดวงที่ทำได้จริง 3-5 ข้อ
7. จบด้วยข้อความให้กำลังใจ 1 บรรทัด

รูปแบบ: ใช้หัวข้อขึ้นต้นด้วย ### และใช้ - นำหน้ารายการ
ถ้าตารางนับของตำราแต่ละฉบับไม่ตรงกัน ให้บอกอย่างตรงไปตรงมา แล้วให้คำทำนายภาพรวมที่ใช้ได้จริง
ห้ามใช้ถ้อยคำที่ทำให้ผู้ใช้หวาดกลัวหรือหลงเชื่อเกินจริง — พูดแบบให้กำลังใจและให้ข้อคิด
ปิดท้ายด้วยบรรทัดเดียวว่า "🔮 เพื่อความบันเทิงเท่านั้น"`;

const THAI_CHAT_PROMPT = `คุณคือ "เทพซ่า" โหราจารย์ผู้ชายไทยผู้เชี่ยวชาญโหราศาสตร์ไทย ตำราพรหมชาติ ทักษาปกรณ์ และการดูดวงจากดวงกำเนิด

ใช้สรรพนามผู้ชายและลงท้ายด้วย "ครับ" หรือ "ครับผม" เท่านั้น ห้ามใช้ "ค่ะ" หรือ "คะ"

ข้อมูลดวงกำเนิดของผู้ใช้แนบมาในคำสั่งนี้แล้ว ให้ยึดข้อมูลนั้นในการตอบทุกคำถาม

กฎการตอบ (ภาษาไทย):
1. ตอบให้ตรงคำถาม กระชับ ชัดเจน ใช้ได้จริง ไม่ยืดเยื้อ
2. อ้างอิงหลักโหราศาสตร์ไทยอย่างสมเหตุสมผล (วันเกิด ดาวประจำวัน ทักษา ราศี ปีนักษัตร เกณฑ์ชะตา)
3. ถ้าคำถามต้องใช้ข้อมูลเพิ่ม (เช่น ดวงสมพงศ์ต้องมีวันเกิดอีกฝ่าย) ให้ถามกลับสั้น ๆ 1 คำถาม
4. ถ้าไม่แน่ใจรายละเอียดของตำรา ให้บอกตรง ๆ แล้วให้คำแนะนำในภาพรวมแทนการเดาตัวเลข
5. คำตอบยาวให้ใช้หัวข้อ ### และ - นำหน้ารายการ
6. จบด้วยคำแนะนำหรือกำลังใจสั้น ๆ
ห้ามให้คำแนะนำทางการแพทย์ การเงิน หรือกฎหมายที่เสี่ยงอันตราย — ให้เป็นแนวทางเชิงวัฒนธรรมและความเชื่อเท่านั้น`;

const THAI_TAMRA_PROMPT = `คุณคือ "เทพซ่า" โหราจารย์ผู้ชายไทยผู้เชี่ยวชาญตำราโบราณหลายสาย: ตำราพรหมชาติ 12 ราศี, กราฟชีวิต, คัมภีร์สุริยยาตร์ (ผูกดวงวางลัคนา), ทักษาปกรณ์, นวางค์จักร และตรียางค์จักร

ใช้สรรพนามผู้ชายและลงท้ายด้วย "ครับ" หรือ "ครับผม" เท่านั้น ห้ามใช้ "ค่ะ" หรือ "คะ"

ผู้ใช้จะให้ข้อมูลดวงกำเนิดที่คำนวณมาแล้ว และอาจแนบข้อความคำทำนายที่คัดลอกจากเว็บไซต์อื่นมาให้วิเคราะห์ต่อ

กฎการตอบ (ภาษาไทย):
1. แบ่งคำตอบเป็นหัวข้อด้วย ### ตามศาสตร์ เช่น
   ### ๑. ดวงกำเนิดตามตำราพรหมชาติ
   ### ๒. กราฟชีวิต (วันเกิด + เดือนเกิด + ปีนักษัตร)
   ### ๓. สุริยยาตร์ · ลัคนา และดาวประจำราศี
   ### ๔. ทักษาปกรณ์
   ### ๕. สรุปภาพรวมและคำแนะนำ
2. แต่ละหัวข้อให้อธิบายวิธีคิดสั้น ๆ ก่อนสรุปผล เพื่อให้ผู้ใช้อ่านแล้วเข้าใจที่มา
3. หัวข้อกราฟชีวิต ให้ใช้เลขวันเกิด + เลขเดือนเกิด + เลขปีนักษัตร (1-12) มาหาผลรวมเป็นฐาน แล้วอธิบายช่วงอายุที่สูง-ต่ำของชีวิตอย่างสมเหตุสมผล
4. ยึดข้อมูลที่คำนวณมาให้แล้ว ห้ามคำนวณวันในสัปดาห์ ราศี หรือปีนักษัตรใหม่
5. ถ้าผู้ใช้แนบข้อความจากเว็บอื่นมา ให้เพิ่มหัวข้อ ### วิเคราะห์ข้อความอ้างอิง เพื่อสรุปและบอกว่าเข้าทางเดียวกับดวงกำเนิดหรือไม่ ส่วนใดควรปรับ
6. ให้คำแนะนำที่ทำได้จริง และจบด้วยกำลังใจ 1 บรรทัด
7. ปิดท้ายด้วยบรรทัดเดียวว่า "🔮 เพื่อความบันเทิงเท่านั้น"`;

/* ---------------- ฟังก์ชันช่วย ---------------- */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMd(str) {
  return escapeHtml(str)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
}

// มาร์กดาวน์แบบเบา ๆ: ### หัวข้อ, - รายการ, ย่อหน้าธรรมดา
function formatReading(text) {
  const out = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };

  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    if (/^#{1,6}\s+/.test(line)) {
      closeList();
      out.push(`<h4>${inlineMd(line.replace(/^#{1,6}\s+/, ''))}</h4>`);
      continue;
    }
    if (/^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inlineMd(line.replace(/^[-*•]\s+/, ''))}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inlineMd(line)}</p>`);
  }
  closeList();
  return out.join('');
}

function zodiacOf(month, day) {
  let sign = 'มังกร'; // 1-19 ม.ค. ยังเป็นราศีมังกร
  for (const [m, d, name] of ZODIAC_CUTS) {
    if (month > m || (month === m && day >= d)) sign = name;
  }
  return sign;
}

// คำนวณข้อมูลที่คำนวณได้แน่นอนในเครื่อง เพื่อลดการมั่วของ AI
function computeBirthInfo(dateObj) {
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1;
  const yearCE = dateObj.getFullYear();
  const beYear = yearCE + 543;
  const dayName = THAI_DAY_NAMES[dateObj.getDay()];
  const naksat = NAKSAT_NAMES[(((beYear + 5) % 12) + 12) % 12];

  const today = new Date();
  let age = today.getFullYear() - yearCE;
  const beforeBirthday = today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;

  return {
    gregorian: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${yearCE}`,
    be: `พ.ศ. ${beYear}`,
    dayName,
    thaiDate: `วัน${dayName}ที่ ${day} ${THAI_MONTH_NAMES[month - 1]} ${beYear}`,
    zodiac: zodiacOf(month, day),
    naksat,
    age: Math.max(0, age),
    color: THAI_DAY_COLORS[dayName] || '—',
    dayNumber: day,
    monthNumber: month,
    naksatNumber: (((beYear + 5) % 12) + 12) % 12 + 1,
  };
}

/* ============================================================
   ThaiAstro — ตัวควบคุมหน้าไสยศาสตร์ไทย
   ============================================================ */
class ThaiAstro {
  constructor() {
    this.modesEl   = document.getElementById('thai-modes');
    this.wsEl      = document.getElementById('thai-workspace');
    this.wsBody    = document.getElementById('thai-ws-body');
    this.wsName    = document.getElementById('thai-ws-name');
    this.wsDesc    = document.getElementById('thai-ws-desc');
    this.wsIcon    = document.getElementById('thai-ws-icon');

    this.mode        = null;
    this.gender      = 'ชาย';
    this.focusSel    = new Set();
    this.editingBirth = false;
    this.readingLoading = false;
    this.chatLoading = false;
    this.chatMsgs    = [];

    this._bind();
    document.addEventListener('settings:saved', () => {
      if (this.mode) this._renderWorkspace();
    });
  }

  /* ---------- โครงหน้า ---------- */
  _bind() {
    document.querySelectorAll('.thai-mode-card').forEach(card => {
      card.addEventListener('click', () => this._openMode(card.dataset.mode));
    });
    document.getElementById('thai-ws-back')?.addEventListener('click', () => this._showModes());
  }

  _showModes() {
    this.mode = null;
    document.body.classList.remove('thai-chat-mode');
    this.wsEl.hidden = true;
    this.modesEl.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  _openMode(mode) {
    if (!THAI_MODES[mode]) return;
    this.mode = mode;
    this.focusSel = new Set();
    this.editingBirth = false;
    this.modesEl.hidden = true;
    this.wsEl.hidden = false;
    this._renderWorkspace();
    this.wsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  _renderWorkspace() {
    const meta = THAI_MODES[this.mode];
    if (!meta) return;
    this.wsIcon.innerHTML = thaiAvatarMarkup();
    this.wsName.textContent = meta.name;
    this.wsDesc.textContent = meta.desc;

    document.body.classList.remove('thai-chat-mode');
    this.wsBody.innerHTML = '';

    if (this.mode === 'chat') this._renderChatWorkspace();
    else this._renderReadingWorkspace(this.mode);
  }

  /* ---------- ฟอร์มดวงกำเนิด (ใช้ร่วมกันทุกโหมด) ---------- */
  _birthFormHTML() {
    const saved = Store.get(STORAGE.THAI_BIRTH, null) || {};
    return `
      <div class="astro-card">
        <h3 class="astro-card-title">🗓️ ข้อมูลดวงกำเนิด</h3>
        <div class="astro-form-grid">
          <label class="astro-field">
            <span>วันเดือนปีเกิด</span>
            <input type="date" id="thai-birth-date" max="2100-12-31" value="${escapeHtml(saved.dateStr || '')}" />
          </label>
          <label class="astro-field">
            <span>เวลาเกิด <em>(ไม่ทราบเว้นว่างได้)</em></span>
            <input type="time" id="thai-birth-time" value="${escapeHtml(saved.timeStr || '')}" />
          </label>
          <div class="astro-field">
            <span>เพศ <em>(ใช้ในการนับเกณฑ์ชาย–หญิง)</em></span>
            <div class="astro-segmented" id="thai-gender">
              <button type="button" data-gender="ชาย" class="${(saved.gender || 'ชาย') === 'ชาย' ? 'active' : ''}">ชาย</button>
              <button type="button" data-gender="หญิง" class="${saved.gender === 'หญิง' ? 'active' : ''}">หญิง</button>
              <button type="button" data-gender="ไม่ระบุ" class="${saved.gender === 'ไม่ระบุ' ? 'active' : ''}">ไม่ระบุ</button>
            </div>
          </div>
          <label class="astro-field">
            <span>ชื่อที่ให้เรียก <em>(ไม่บังคับ)</em></span>
            <input type="text" id="thai-name" placeholder="เช่น คุณสมชาย" value="${escapeHtml(saved.name || '')}" />
          </label>
        </div>
        <label class="astro-field astro-field-full">
          <span>สิ่งที่อยากรู้เป็นพิเศษ / หมายเหตุ <em>(ไม่บังคับ)</em></span>
          <textarea id="thai-note" rows="2" placeholder="เช่น อยากเน้นเรื่องการงาน, เกิดไม่ตรงเวลาแจ้งไว้, ใช้ปฏิทินจันทรคติ, อยากรู้ดวงคู่ครอง">${escapeHtml(saved.note || '')}</textarea>
        </label>
        <div class="astro-birth-preview" id="astro-birth-preview"></div>
      </div>`;
  }

  _bindBirthForm() {
    const dateEl = document.getElementById('thai-birth-date');
    const timeEl = document.getElementById('thai-birth-time');

    BirthProfile.enhanceDateInput(dateEl);
    BirthProfile.enhanceTimeInput(timeEl);
    BirthProfile.syncSegmentedGender(document.getElementById('thai-gender'));

    this.gender = document.querySelector('#thai-gender button.active')?.dataset.gender || 'ชาย';
    document.querySelectorAll('#thai-gender button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#thai-gender button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.gender = btn.dataset.gender;
        this._updateBirthPreview();
      });
    });

    dateEl?.addEventListener('change', () => this._updateBirthPreview());
    dateEl?.addEventListener('input',  () => this._updateBirthPreview());
    timeEl?.addEventListener('change', () => this._updateBirthPreview());
    this._updateBirthPreview();
  }

  _updateBirthPreview() {
    const el = document.getElementById('astro-birth-preview');
    if (!el) return;
    const dateStr = document.getElementById('thai-birth-date')?.value;
    const info = this._infoFrom(dateStr);
    if (!info) { el.innerHTML = '<span class="muted">กรอกวันเดือนปีเกิดเพื่อดูข้อมูลดวงกำเนิด</span>'; return; }
    el.innerHTML = `
      <span class="chip-ok">🗓️ ${info.thaiDate}</span>
      <span>ราศี <strong>${info.zodiac}</strong></span>
      <span>ปีนักษัตร <strong>${info.naksat}</strong></span>
      <span>อายุ <strong>${info.age}</strong> ปี</span>
      <span>สีประจำวัน <strong>${info.color}</strong></span>`;
  }

  _infoFrom(dateStr) {
    if (!dateStr) return null;
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return null;
    return computeBirthInfo(d);
  }

  // อ่านค่า + ตรวจสอบฟอร์ม (คืน null ถ้าไม่ผ่าน)
  _collectBirth() {
    const dateStr = document.getElementById('thai-birth-date')?.value || '';
    const info = this._infoFrom(dateStr);
    if (!info) {
      showToast('กรอกวันเดือนปีเกิดก่อนนะครับ 🗓️', 'error');
      document.getElementById('thai-birth-date')?.focus();
      return null;
    }
    return {
      dateStr,
      timeStr: document.getElementById('thai-birth-time')?.value || '',
      gender:  this.gender || 'ชาย',
      name:    (document.getElementById('thai-name')?.value || '').trim(),
      note:    (document.getElementById('thai-note')?.value || '').trim(),
      info,
    };
  }

  // ข้อความดวงกำเนิดที่ส่งให้ AI
  _birthBlock(birth, extra = {}) {
    const b = birth;
    const lines = [
      'ข้อมูลดวงกำเนิดของผู้ใช้ (คำนวณมาให้แล้ว):',
      `- เพศ: ${b.gender}`,
      b.name ? `- ชื่อที่ให้เรียก: ${b.name}` : null,
      `- วันเกิด (ค.ศ.): ${b.info.gregorian}`,
      `- วันเกิด (ไทย): ${b.info.thaiDate} (${b.info.be})`,
      `- วันในสัปดาห์: วัน${b.info.dayName} · สีประจำวัน: ${b.info.color}`,
      `- เวลาเกิด: ${b.timeStr || 'ไม่ทราบ'}`,
      `- ราศี (ตะวันตก): ${b.info.zodiac}`,
      `- ปีนักษัตร: ${b.info.naksat} (ลำดับที่ ${b.info.naksatNumber})`,
      `- อายุปัจจุบัน: ${b.info.age} ปี`,
      `- เลขวันเกิด: ${b.info.dayNumber} · เลขเดือนเกิด: ${b.info.monthNumber}`,
      b.note ? `- หมายเหตุจากผู้ใช้: ${b.note}` : null,
    ].filter(Boolean);

    if (extra.focus?.length) lines.push(`- หัวข้อที่อยากเน้นเป็นพิเศษ: ${extra.focus.join(', ')}`);

    let text = lines.join('\n');
    if (extra.paste) {
      text += `\n\nข้อความคำทำนายจากเว็บไซต์อื่นที่ผู้ใช้คัดลอกมาให้วิเคราะห์ต่อ:\n"""\n${extra.paste}\n"""`;
    }
    return text;
  }

  /* ---------- โหมด 1 & 3: ฟอร์ม + ผลวิเคราะห์ ---------- */
  _renderReadingWorkspace(mode) {
    const meta = THAI_MODES[mode];
    this.wsBody.innerHTML = `
      ${this._keyWarningHTML()}
      ${this._birthFormHTML()}
      ${mode === 'tamra' ? this._tamraExtrasHTML() : ''}
      <button class="astro-cta" id="thai-run" type="button">${meta.cta}</button>
      <div id="astro-result-slot"></div>`;

    this._bindBirthForm();
    if (mode === 'tamra') this._bindTamraExtras();

    document.getElementById('thai-run')?.addEventListener('click', () => this._runReading(mode));

    const saved = (Store.get(STORAGE.THAI_RESULTS, {}) || {})[mode];
    if (saved?.text) this._showResult(mode, saved);
  }

  _tamraExtrasHTML() {
    const savedPaste = (Store.get(STORAGE.THAI_BIRTH, {}) || {}).paste || '';
    return `
      <div class="astro-card">
        <h3 class="astro-card-title">🎯 อยากให้เน้นเรื่องไหน</h3>
        <div class="astro-chips" id="thai-focus">
          ${FOCUS_TOPICS.map(t => `<button type="button" class="astro-chip" data-topic="${t}">${t}</button>`).join('')}
        </div>
      </div>
      <div class="astro-card">
        <h3 class="astro-card-title">📋 ข้อความจากเว็บอื่น <em>(ไม่บังคับ)</em></h3>
        <p class="astro-card-hint">วางคำทำนายที่คัดลอกจากเว็บดูดวงอื่น แล้วให้ AI วิเคราะห์ต่อว่าเข้าทางกับดวงกำเนิดของคุณหรือไม่</p>
        <textarea id="thai-paste" class="astro-textarea" rows="4" placeholder="วางข้อความตรงนี้ได้เลย...">${escapeHtml(savedPaste)}</textarea>
      </div>`;
  }

  _bindTamraExtras() {
    document.querySelectorAll('#thai-focus .astro-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const topic = chip.dataset.topic;
        if (this.focusSel.has(topic)) this.focusSel.delete(topic);
        else this.focusSel.add(topic);
        chip.classList.toggle('active', this.focusSel.has(topic));
      });
    });
  }

  async _runReading(mode) {
    if (this.readingLoading) return;
    const key = Store.get(STORAGE.API_KEY, '');
    if (!key) { showToast('ใส่ API Key ก่อนนะครับ ⚙️', 'error'); return; }

    const birth = this._collectBirth();
    if (!birth) return;

    const extras = { focus: [...this.focusSel], paste: (document.getElementById('thai-paste')?.value || '').trim() };
    Store.set(STORAGE.THAI_BIRTH, { ...birth, paste: extras.paste });

    const slot = document.getElementById('astro-result-slot');
    const runBtn = document.getElementById('thai-run');

    this.readingLoading = true;
    if (runBtn) { runBtn.disabled = true; runBtn.textContent = '🔮 กำลังเปิดตำรา...'; }
    slot.innerHTML = '<div class="astro-loading"><span class="astro-loading-orb">🔮</span> กำลังเปิดตำราโบราณ กรุณารอสักครู่...</div>';
    slot.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const prompt = `${this._birthBlock(birth, extras)}\n\nกรุณาวิเคราะห์ตามที่กำหนดในคำสั่งระบบ`;
      const system = mode === 'khad' ? THAI_KHAD_PROMPT : THAI_TAMRA_PROMPT;
      const text = await callGemini(prompt, system);

      const results = Store.get(STORAGE.THAI_RESULTS, {}) || {};
      results[mode] = { text, birth, ts: Date.now() };
      Store.set(STORAGE.THAI_RESULTS, results);

      this._showResult(mode, results[mode]);
    } catch (err) {
      slot.innerHTML = `<div class="astro-error">❌ เกิดข้อผิดพลาด: ${escapeHtml(err.message)}</div>`;
    } finally {
      this.readingLoading = false;
      if (runBtn) { runBtn.disabled = false; runBtn.textContent = THAI_MODES[mode].cta; }
    }
  }

  _showResult(mode, data) {
    const slot = document.getElementById('astro-result-slot');
    if (!slot) return;
    const meta = THAI_MODES[mode];
    const b = data.birth?.info;

    slot.innerHTML = `
      <div class="astro-result">
        <div class="astro-result-head">
          <div>
            <div class="astro-result-badge">${meta.icon} ${meta.name}</div>
            <div class="astro-result-meta">
              ${b ? `${b.thaiDate} · ราศี${b.zodiac} · ปี${b.naksat} · อายุ ${b.age} ปี` : ''}
            </div>
          </div>
          <div class="astro-result-actions">
            <button type="button" class="astro-mini-btn" id="thai-copy">📋 คัดลอก</button>
            <button type="button" class="astro-mini-btn" id="thai-again">🔄 ทำนายใหม่</button>
          </div>
        </div>
        <div class="astro-reading">${formatReading(data.text)}</div>
      </div>`;

    document.getElementById('thai-copy')?.addEventListener('click', () => {
      const plain = String(data.text).replace(/\*\*/g, '');
      navigator.clipboard?.writeText(plain)
        .then(() => showToast('คัดลอกคำทำนายแล้ว 📋', 'success'))
        .catch(() => showToast('คัดลอกไม่สำเร็จ', 'error'));
    });
    document.getElementById('thai-again')?.addEventListener('click', () => {
      document.getElementById('thai-run')?.click();
    });
  }

  /* ---------- โหมด 2: แชทถามดวง ---------- */
  _renderChatWorkspace() {
    document.body.classList.remove('thai-chat-mode');
    const birth = Store.get(STORAGE.THAI_BIRTH, null);
    if (!birth?.info || this.editingBirth) {
      this.wsBody.innerHTML = `
        ${this._keyWarningHTML()}
        ${this._birthFormHTML()}
        <button class="astro-cta" id="thai-start-chat" type="button">${THAI_MODES.chat.cta}</button>`;
      this._bindBirthForm();
      document.getElementById('thai-start-chat')?.addEventListener('click', () => this._startChat());
      return;
    }

    this.wsBody.innerHTML = `
      <div class="chat-container thai-chat-container">
        <div class="thai-birth-bar">
          <span class="thai-birth-bar-text">
            🗓️ ${escapeHtml(birth.info.thaiDate)} · ${escapeHtml(birth.gender)} · อายุ ${birth.info.age} ปี
          </span>
          <span class="thai-birth-bar-actions">
            <button type="button" class="astro-mini-btn" id="thai-clear-chat">🗑 ล้างแชท</button>
            <button type="button" class="astro-mini-btn" id="thai-edit-birth">✏️ แก้ข้อมูลเกิด</button>
          </span>
        </div>
        <div class="chat-messages" id="thai-chat-messages" role="log" aria-live="polite" aria-label="บทสนทนาดูดวง"></div>
        <div class="chat-input-area">
          <div class="chat-input-row">
            <div class="chat-input-wrapper">
              <textarea id="thai-chat-input" class="chat-textarea" rows="1" placeholder="ถามเรื่องดวงชะตา... เช่น ปีนี้การงานเป็นอย่างไร"></textarea>
            </div>
            <button class="btn-send" id="thai-chat-send" aria-label="ส่ง">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>`;

    document.body.classList.add('thai-chat-mode');
    this._initChat();
  }

  _startChat() {
    const birth = this._collectBirth();
    if (!birth) return;
    const prev = Store.get(STORAGE.THAI_BIRTH, {}) || {};
    Store.set(STORAGE.THAI_BIRTH, { ...prev, ...birth });
    this.editingBirth = false;
    this._renderChatWorkspace();
    setTimeout(() => document.getElementById('thai-chat-input')?.focus(), 120);
  }

  _initChat() {
    this.chatMsgEl = document.getElementById('thai-chat-messages');
    this.chatInput = document.getElementById('thai-chat-input');
    this.chatSend  = document.getElementById('thai-chat-send');
    this.chatMsgs  = Store.get(STORAGE.THAI_CHAT, []) || [];

    this.chatSend?.addEventListener('click', () => this._sendChat());
    this.chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._sendChat(); }
    });
    this.chatInput?.addEventListener('input', () => {
      this.chatInput.style.height = 'auto';
      this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 140) + 'px';
    });

    document.getElementById('thai-edit-birth')?.addEventListener('click', () => {
      this.editingBirth = true;
      this._renderChatWorkspace();
    });
    document.getElementById('thai-clear-chat')?.addEventListener('click', () => {
      if (!confirm('ล้างประวัติการถามดวงทั้งหมด?')) return;
      this.chatMsgs = [];
      Store.remove(STORAGE.THAI_CHAT);
      this._renderChat();
      showToast('ล้างแชทแล้ว 🗑️', 'success');
    });

    this._renderChat();
    setTimeout(() => this.chatInput?.focus(), 120);
  }

  _chatBubble(role, content) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${role}`;
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = role === 'ai'
      ? thaiAvatarMarkup('เทพซ่า')
      : '<span class="message-user-icon" aria-hidden="true">◉</span>';
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = formatReading(content) || `<p>${escapeHtml(content)}</p>`;
    if (role === 'ai') addTTSButton(bubble, () => content);
    wrapper.append(avatar, bubble);
    return wrapper;
  }

  _renderChat() {
    if (!this.chatMsgEl) return;
    this.chatMsgEl.innerHTML = '';
    if (!this.chatMsgs.length) {
      const birth = Store.get(STORAGE.THAI_BIRTH, null);
      const name = birth?.name ? `${birth.name} ` : '';
      const welcome = birth
        ? `สวัสดีครับ ${name}เทพซ่ารับฟังอยู่ครับ ✨<br><br>ดวงกำเนิดของคุณคือ <strong>วัน${birth.info.dayName}ที่ ${birth.info.thaiDate.replace(/^วัน.*?ที่ /, '')}</strong> ราศี<strong>${birth.info.zodiac}</strong> ปี<strong>${birth.info.naksat}</strong><br><br>อยากถามเรื่องไหนก่อนดีครับ? การงาน การเงิน ความรัก หรือโชคลาภ 🌙`
        : 'กรอกข้อมูลดวงกำเนิดก่อนนะครับ แล้วเทพซ่าจะเปิดดวงให้ครับ 🌙';
      const el = document.createElement('div');
      el.className = 'message ai';
      el.innerHTML = `<div class="message-avatar">${thaiAvatarMarkup('เทพซ่า')}</div><div class="message-bubble">${welcome}</div>`;
      this.chatMsgEl.appendChild(el);
      return;
    }
    for (const m of this.chatMsgs) this.chatMsgEl.appendChild(this._chatBubble(m.role, m.content));
    this._scrollChat();
  }

  _scrollChat() {
    setTimeout(() => { if (this.chatMsgEl) this.chatMsgEl.scrollTop = this.chatMsgEl.scrollHeight; }, 50);
  }

  _addChatTyping() {
    const el = document.createElement('div');
    el.className = 'message ai';
    el.id = 'thai-typing';
    el.innerHTML = `
      <div class="message-avatar">${thaiAvatarMarkup('เทพซ่า')}</div>
      <div class="typing-indicator">
        <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
      </div>`;
    this.chatMsgEl?.appendChild(el);
    this._scrollChat();
    return el;
  }

  async _sendChat() {
    const text = this.chatInput?.value.trim();
    if (!text || this.chatLoading) return;

    const key = Store.get(STORAGE.API_KEY, '');
    if (!key) { showToast('ใส่ API Key ก่อนนะครับ ⚙️', 'error'); return; }

    const birth = Store.get(STORAGE.THAI_BIRTH, null);
    if (!birth?.info) { showToast('กรอกข้อมูลดวงกำเนิดก่อนนะครับ', 'error'); return; }

    if (!this.chatMsgs.length) this.chatMsgEl.innerHTML = '';

    this.chatMsgs.push({ role: 'user', content: text, ts: Date.now() });
    this.chatMsgEl.appendChild(this._chatBubble('user', text));
    this.chatInput.value = '';
    this.chatInput.style.height = 'auto';
    this._scrollChat();

    this.chatLoading = true;
    if (this.chatSend) this.chatSend.disabled = true;
    const typing = this._addChatTyping();

    try {
      const history = this.chatMsgs.slice(-9, -1)
        .map(m => `${m.role === 'user' ? 'ผู้ใช้' : 'เทพซ่า'}: ${m.content}`)
        .join('\n');
      const prompt = history ? `บทสนทนาก่อนหน้า:\n${history}\n\nผู้ใช้: ${text}` : text;
      const system = `${THAI_CHAT_PROMPT}\n\n${this._birthBlock(birth)}`;

      const reply = await callGemini(prompt, system);
      typing.remove();
      this.chatMsgs.push({ role: 'ai', content: reply, ts: Date.now() });
      Store.set(STORAGE.THAI_CHAT, this.chatMsgs.slice(-100));
      this.chatMsgEl.appendChild(this._chatBubble('ai', reply));
      this._scrollChat();
    } catch (err) {
      typing.remove();
      const msg = err.message === 'NO_API_KEY'
        ? '⚠️ กรุณาใส่ API Key ในการตั้งค่าก่อนนะครับ'
        : `❌ เกิดข้อผิดพลาด: ${err.message}`;
      this.chatMsgEl.appendChild(this._chatBubble('ai', msg));
      this._scrollChat();
    } finally {
      this.chatLoading = false;
      if (this.chatSend) this.chatSend.disabled = false;
    }
  }

  /* ---------- อย่างอื่น ---------- */
  _keyWarningHTML() {
    if (Store.get(STORAGE.API_KEY, '')) return '';
    return `<div class="astro-key-warning">🔑 ยังไม่ได้ใส่ API Key — กด ⚙️ มุมขวาบนเพื่อใส่ก่อนใช้งาน</div>`;
  }
}

/* ---------------- Init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('thai-modes')) {
    window.thaiAstro = new ThaiAstro();
  }
});
