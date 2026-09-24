/* ============================================================
   chinese.js — ดูดวงจีน (Chinese Astrology / ปาจื้อ 四柱八字)
   คำนวณ 4 เสาชะตา · 5 ธาตุ · วัยจร ในเครื่อง แล้วให้ AI ตีความ
   ============================================================ */

'use strict';

/* ---------------- ตารางธาตุพื้นฐาน ---------------- */
const CN_STEMS = [
  { char: '甲', th: 'เจี่ย',  element: 'ไม้',  polarity: 'หยาง' },
  { char: '乙', th: 'อี่',    element: 'ไม้',  polarity: 'หยิน' },
  { char: '丙', th: 'ปิ่ง',   element: 'ไฟ',   polarity: 'หยาง' },
  { char: '丁', th: 'ติง',    element: 'ไฟ',   polarity: 'หยิน' },
  { char: '戊', th: 'อู้',    element: 'ดิน',  polarity: 'หยาง' },
  { char: '己', th: 'จี่',    element: 'ดิน',  polarity: 'หยิน' },
  { char: '庚', th: 'เกิง',   element: 'ทอง',  polarity: 'หยาง' },
  { char: '辛', th: 'ซิน',    element: 'ทอง',  polarity: 'หยิน' },
  { char: '壬', th: 'เหริน',  element: 'น้ำ',  polarity: 'หยาง' },
  { char: '癸', th: 'กุ้ย',   element: 'น้ำ',  polarity: 'หยิน' },
];

const CN_BRANCHES = [
  { char: '子', animal: 'ชวด',  th: 'หนู',     emoji: '🐭', element: 'น้ำ',  hours: '23:00–00:59' },
  { char: '丑', animal: 'ฉลู',  th: 'วัว',     emoji: '🐮', element: 'ดิน',  hours: '01:00–02:59' },
  { char: '寅', animal: 'ขาล',  th: 'เสือ',    emoji: '🐯', element: 'ไม้',  hours: '03:00–04:59' },
  { char: '卯', animal: 'เถาะ', th: 'กระต่าย', emoji: '🐰', element: 'ไม้',  hours: '05:00–06:59' },
  { char: '辰', animal: 'มะโรง', th: 'มังกร',  emoji: '🐲', element: 'ดิน',  hours: '07:00–08:59' },
  { char: '巳', animal: 'มะเส็ง', th: 'งู',    emoji: '🐍', element: 'ไฟ',   hours: '09:00–10:59' },
  { char: '午', animal: 'มะเมีย', th: 'ม้า',   emoji: '🐴', element: 'ไฟ',   hours: '11:00–12:59' },
  { char: '未', animal: 'มะแม', th: 'แพะ',     emoji: '🐐', element: 'ดิน',  hours: '13:00–14:59' },
  { char: '申', animal: 'วอก',  th: 'ลิง',     emoji: '🐵', element: 'ทอง',  hours: '15:00–16:59' },
  { char: '酉', animal: 'ระกา', th: 'ไก่',     emoji: '🐔', element: 'ทอง',  hours: '17:00–18:59' },
  { char: '戌', animal: 'จอ',   th: 'หมา',     emoji: '🐶', element: 'ดิน',  hours: '19:00–20:59' },
  { char: '亥', animal: 'กุน',  th: 'หมู',     emoji: '🐷', element: 'น้ำ',  hours: '21:00–22:59' },
];

const CN_ELEMENT_ORDER = ['ไม้', 'ไฟ', 'ดิน', 'ทอง', 'น้ำ'];

// วันที่เริ่ม "เดือน" ตามปฏิทินสุริยคติจีน (ค่าประมาณ ±1 วัน)
const CN_MONTH_TERMS = [
  { md: [2, 4],  name: 'ลี่ชุน (立春)' },
  { md: [3, 6],  name: 'จิงเจ๋อ (驚蟄)' },
  { md: [4, 5],  name: 'ชิงหมิง (清明)' },
  { md: [5, 6],  name: 'ลี่เซี่ย (立夏)' },
  { md: [6, 6],  name: 'หมางจ้ง (芒種)' },
  { md: [7, 7],  name: 'เสี่ยวสู่ (小暑)' },
  { md: [8, 8],  name: 'ลี่ชิว (立秋)' },
  { md: [9, 8],  name: 'ไป๋ลู่ (白露)' },
  { md: [10, 8], name: 'ฮั่นลู่ (寒露)' },
  { md: [11, 7], name: 'ลี่ตง (立冬)' },
  { md: [12, 7], name: 'ต้าซวี่ (大雪)' },
  { md: [1, 6],  name: 'เสี่ยวฮั่น (小寒)' },
];

const CN_PILLAR_INFO = [
  { key: 'year',  icon: '🌍', title: 'เสาปีเกิด',   sub: 'เสาภายนอก',  look: 'ภาพลักษณ์ สังคม เพื่อนฝูง บรรพบุรุษ และการพบเจอผู้คนใหม่ ๆ' },
  { key: 'month', icon: '💼', title: 'เสาเดือนเกิด', sub: 'เสาการงาน',  look: 'หน้าที่การงาน ความถนัด สภาพแวดล้อมในการทำงาน และความสัมพันธ์กับพ่อแม่' },
  { key: 'day',   icon: '🪞', title: 'เสาวันเกิด',   sub: 'เสาตัวตน',   look: 'ตัวตนที่แท้จริง (ธาตุเจ้าชะตา) คู่ครอง และความรัก' },
  { key: 'hour',  icon: '🔭', title: 'เสาเวลาเกิด',  sub: 'เสาอนาคต',   look: 'โปรเจกต์ในอนาคต ความลับ ความคิดในใจ บุตร และบริวารใต้บังคับบัญชา' },
];

/* ---------------- คำสั่งระบบของ AI ---------------- */
const CN_SYSTEM_PROMPT = `คุณคือ "เทพซ่า" ซินแสผู้ชายผู้เชี่ยวชาญโหราศาสตร์จีนโบราณ ปาจื้อ (四柱八字) ห้าธาตุ (五行) และวัยจร

ใช้สรรพนามผู้ชายและลงท้ายด้วย "ครับ" หรือ "ครับผม" เท่านั้น ห้ามใช้ "ค่ะ" หรือ "คะ"

ข้อมูลดวงจีนของผู้ใช้ถูกคำนวณมาให้แล้วในข้อความของผู้ใช้ (เสาชะตาทั้ง 4 พร้อมธาตุ จำนวนธาตุแต่ละชนิด วัยจร และปีปัจจุบัน)
ห้ามคำนวณเสาชะตา ธาตุ หรือวัยจรใหม่ ให้ใช้ข้อมูลนั้นเป็นข้อเท็จจริงแล้วทำหน้าที่ตีความเท่านั้น

กฎการตอบ (ภาษาไทยทั้งหมด) ให้แบ่งเป็น 3 หัวข้อใหญ่ โดยขึ้นต้นหัวข้อด้วย ### เท่านั้น:
### ๑. ถอดรหัส 4 เสาชะตา
- อธิบายทีละเสาตามความหมายที่ให้มา: เสาปี (ภาพลักษณ์ สังคม เพื่อนฝูง บรรพบุรุษ) · เสาเดือน (การงาน ความถนัด พ่อแม่) · เสาวัน (ตัวตนและธาตุเจ้าชะตา คู่ครอง) · เสาเวลา (อนาคต ความคิดในใจ บุตร บริวาร)
- สรุปนิสัยโดยรวม จุดแข็ง และจุดที่ควรปรับ
### ๒. ความสมดุลของ 5 ธาตุ
- บอกว่าธาตุใดมากเกินไปและธาตุใดขาดไป พร้อมผลที่ตามมา
- สรุป "ธาตุส่งเสริม (ธาตุโชคลาภ)" ที่ควรใช้
- อาชีพที่ถูกโฉลก และแนวธุรกิจที่ควรเลี่ยง
- ระบบร่างกายที่ควรดูแลเป็นพิเศษตามธาตุที่ขาด/มากเกิน
- สี ตัวเลข ทิศทาง และของมงคลที่ช่วยเสริมธาตุนั้น
### ๓. วัยจร และดวงรายปี
- อธิบายวัยจร 10 ปีว่าแต่ละช่วงให้จังหวะชีวิตอย่างไร เน้นช่วงปัจจุบันและช่วงถัดไป
- ชี้ว่าปีนี้เจ้าชะตาอยู่ในจังหวะขาขึ้นหรือขาลง และควรบุกลุยงานหรือประคองตัว
- ให้ข้อควรระวังที่สำคัญ และคำแนะนำที่ทำได้จริง

ใช้ - นำหน้ารายการ ห้ามใช้หัวข้อย่อยอื่นนอกจากหัวข้อใหญ่ทั้ง 3
พูดแบบซินแสไทยที่สุภาพ ให้กำลังใจ ไม่ขู่ให้กลัว และไม่ฟันธงเรื่องสุขภาพหรือการเงินแบบเสี่ยงอันตราย
ปิดท้ายด้วยบรรทัดเดียวว่า "☯️ เพื่อความบันเทิงเท่านั้น"`;

/* ============================================================
   ส่วนคำนวณปาจื้อ
   ============================================================ */
const Bazi = {
  // Julian Day Number ของวันที่แบบปฏิทินเกรกอเรียน
  jdn(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
      Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  },

  stemBranch(stemIdx, branchIdx) {
    const s = CN_STEMS[((stemIdx % 10) + 10) % 10];
    const b = CN_BRANCHES[((branchIdx % 12) + 12) % 12];
    return {
      stem: s, branch: b,
      char: `${s.char}${b.char}`,
      stemIdx: ((stemIdx % 10) + 10) % 10,
      branchIdx: ((branchIdx % 12) + 12) % 12,
      label: `${s.element}(${s.polarity}) + ${b.animal} ธาตุ${b.element}`,
    };
  },

  // เสาปี — ปีจีนเริ่มที่ ลี่ชุน (ราว 4 ก.พ.)
  yearPillar(date) {
    const y = date.getMonth() + 1 < 2 || (date.getMonth() + 1 === 2 && date.getDate() < 4)
      ? date.getFullYear() - 1
      : date.getFullYear();
    return { ...this.stemBranch((y - 4) % 10, (y - 4) % 12), solarYear: y };
  },

  // เดือนตามสุริยคติจีน: termIdx 0 = ลี่ชุน = เดือนแรก (เสาขาล)
  // ต้องเรียงตามเดือนจริง (ม.ค. → ธ.ค.) ไม่ใช่ตามลําดับ termIdx เพราะ ม.ค. คือ termIdx 11
  monthTermIndex(date) {
    const y = date.getFullYear();
    const byMonth = CN_MONTH_TERMS
      .map((t, i) => ({ i, m: t.md[0], d: t.md[1] }))
      .sort((a, b) => a.m - b.m);

    let best = null;
    for (const t of byMonth) {
      const dt = new Date(y, t.m - 1, t.d);
      if (dt <= date) best = { i: t.i, date: dt, year: y };
    }
    if (!best) {
      // ต้นเดือน ม.ค. (ก่อน 6 ม.ค.) ยังอยู่เดือนซื่อ (子) ที่เริ่ม 7 ธ.ค. ของปีก่อน
      const dec = byMonth[byMonth.length - 1];
      best = { i: dec.i, date: new Date(y - 1, dec.m - 1, dec.d), year: y - 1 };
    }
    return best;
  },

  monthPillar(date, yearStemIdx, termInfo) {
    const order = termInfo.i + 1;                       // 1 = เดือนขาล
    const stemIdx = ((yearStemIdx % 5) * 2 + 2 + (order - 1)) % 10;
    const branchIdx = (termInfo.i + 2) % 12;            // i=0 → ขาล
    return { ...this.stemBranch(stemIdx, branchIdx), term: CN_MONTH_TERMS[termInfo.i].name };
  },

  // เสาวัน — วัฏจักร 60 วัน ต่อเนื่อง (วันจีนเปลี่ยนที่ 23:00)
  dayPillar(date) {
    const d = new Date(date.getTime());
    if (d.getHours() >= 23) d.setDate(d.getDate() + 1);
    const n = this.jdn(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const cycle = ((n + 49) % 60 + 60) % 60;
    return this.stemBranch(cycle % 10, cycle % 12);
  },

  hourBranchIndex(hour) {
    return Math.floor(((hour + 1) % 24) / 2);
  },

  hourPillar(hour, dayStemIdx) {
    const branchIdx = this.hourBranchIndex(hour);
    const stemIdx = ((dayStemIdx % 5) * 2 + branchIdx) % 10;
    return this.stemBranch(stemIdx, branchIdx);
  },

  // วัยจร 10 ปี — ทิศทางตามเพศและขั้วของเสาปี
  luckCycles({ date, hour, gender, yearStemIdx, monthPillar, yearStemPolarity }) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    // ตารางเริ่มที่ ก.พ. (ลี่ชุน) ดังนั้นเดือน ก.พ. → index 0, มี.ค. → 1, ... ม.ค. → 11
    const termOfMonth = (yy, mm) => {
      const [tm, td] = CN_MONTH_TERMS[(mm + 10) % 12].md;
      return new Date(yy, tm - 1, td);
    };
    const thisTerm = termOfMonth(y, m);
    let prev, next;
    if (date >= thisTerm) {
      prev = thisTerm;
      next = m === 12 ? termOfMonth(y + 1, 1) : termOfMonth(y, m + 1);
    } else {
      prev = m === 1 ? termOfMonth(y - 1, 12) : termOfMonth(y, m - 1);
      next = thisTerm;
    }

    const yangYear = yearStemPolarity === 'หยาง';
    const male = gender !== 'หญิง';                       // ไม่ระบุ → ใช้เกณฑ์ชาย
    const forward = (yangYear && male) || (!yangYear && !male);
    const days = (forward ? (next - date) : (date - prev)) / 86400000;
    const startAge = Math.max(0, Math.round(days / 3 * 10) / 10); // 3 วัน = 1 ปี
    const birthBE = y + 543;

    const cycles = [];
    for (let i = 1; i <= 9; i++) {
      const step = forward ? i : -i;
      const p = this.stemBranch(monthPillar.stemIdx + step, monthPillar.branchIdx + step);
      const ageFrom = Math.floor(startAge + (i - 1) * 10);
      cycles.push({
        index: i, pillar: p, forward,
        ageFrom, ageTo: ageFrom + 10,
        yearFrom: birthBE + ageFrom, yearTo: birthBE + ageFrom + 10,
      });
    }
    return { forward, startAge, days: Math.round(days * 10) / 10, cycles };
  },

  currentYearPillar(reference = new Date()) {
    const y = reference.getFullYear();
    return { ...this.stemBranch((y - 4) % 10, (y - 4) % 12), ceYear: y, beYear: y + 543 };
  },

  // ประกอบทุกอย่างเข้าด้วยกัน
  analyse(dateStr, timeStr, gender) {
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return null;
    const hour = timeStr ? parseInt(timeStr.slice(0, 2), 10) : 12;
    const hasTime = !!timeStr;

    const year  = this.yearPillar(date);
    const term  = this.monthTermIndex(date);
    const month = this.monthPillar(date, year.stemIdx, term);
    const day   = this.dayPillar(hasTime ? new Date(`${dateStr}T${timeStr}:00`) : date);
    const hourP = this.hourPillar(hour, day.stemIdx);

    // นับธาตุจาก 8 ตัวอักษร
    const counts = { ดิน: 0, ทอง: 0, น้ำ: 0, ไม้: 0, ไฟ: 0 };
    for (const p of [year, month, day, hourP]) {
      counts[p.stem.element] += 1;
      counts[p.branch.element] += 1;
    }
    const missing = CN_ELEMENT_ORDER.filter(e => counts[e] === 0);
    const maxCount = Math.max(...Object.values(counts));
    const dominant = CN_ELEMENT_ORDER.filter(e => counts[e] === maxCount);

    const luck = this.luckCycles({
      date, hour, gender,
      yearStemIdx: year.stemIdx,
      monthPillar: month,
      yearStemPolarity: year.stem.polarity,
    });

    return {
      date, hour, hasTime, gender,
      pillars: { year, month, day, hour: hourP },
      dayMaster: day.stem,
      counts, missing, dominant, maxCount,
      total: 8,
      luck,
      thisYear: this.currentYearPillar(),
      age: this.ageOf(date),
      termName: month.term,
      zodiacEmoji: year.branch.emoji,
      zodiacAnimal: year.branch.animal,
    };
  },

  ageOf(date) {
    const t = new Date();
    let age = t.getFullYear() - date.getFullYear();
    const before = t.getMonth() + 1 < date.getMonth() + 1 ||
      (t.getMonth() + 1 === date.getMonth() + 1 && t.getDate() < date.getDate());
    if (before) age -= 1;
    return Math.max(0, age);
  },
};

/* ---------------- ฟังก์ชันช่วยแสดงผล ---------------- */
function cnEscape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cnFormat(text) {
  const out = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
  const inline = (s) => cnEscape(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line) { closeList(); continue; }
    if (/^#{1,6}\s+/.test(line)) {
      closeList();
      out.push(`<h4>${inline(line.replace(/^#{1,6}\s+/, ''))}</h4>`);
      continue;
    }
    if (/^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(line.replace(/^[-*•]\s+/, ''))}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('');
}

// แยกคำตอบ AI ออกเป็นหัวข้อตามบรรทัดที่ขึ้นต้นด้วย ###
function cnSplitSections(text) {
  const sections = [];
  let current = null;
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    const m = line.match(/^#{2,4}\s+(.+)$/);
    if (m) {
      current = { title: m[1].replace(/\*\*/g, '').trim(), lines: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { title: '', lines: [] };
      sections.push(current);
    }
    current.lines.push(raw);
  }
  return sections
    .map(s => ({ title: s.title, body: s.lines.join('\n').trim() }))
    .filter(s => s.title || s.body);
}

function cnElementClass(element) {
  return { 'ไม้': 'mai', 'ไฟ': 'fai', 'ดิน': 'din', 'ทอง': 'thong', 'น้ำ': 'nam' }[element] || 'din';
}

/* ============================================================
   ChineseAstro — ตัวควบคุมหน้าดูดวงจีน
   ============================================================ */
class ChineseAstro {
  constructor() {
    this.formEl   = document.getElementById('cn-form-slot');
    this.runBtn   = document.getElementById('cn-run');
    this.panelEl  = document.getElementById('cn-panel');
    this.resultEl = document.getElementById('cn-result');
    this.gender   = 'ชาย';
    this.loading  = false;

    this._bind();
    document.addEventListener('settings:saved', () => this._renderKeyWarning());
  }

  _bind() {
    this.runBtn?.addEventListener('click', () => this._run());
  }

  /* ---------- ฟอร์ม ---------- */
  _renderKeyWarning() {
    const el = document.getElementById('cn-key-warning');
    if (!el) return;
    el.style.display = Store.get(STORAGE.API_KEY, '') ? 'none' : 'block';
  }

  _saved() {
    return Store.get(STORAGE.CN_BIRTH, null) || {};
  }

  _bindForm() {
    BirthProfile.enhanceDateInput(document.getElementById('cn-birth-date'));
    BirthProfile.enhanceTimeInput(document.getElementById('cn-birth-time'));
    BirthProfile.syncSegmentedGender(document.getElementById('cn-gender'));
    this.gender = document.querySelector('#cn-gender button.active')?.dataset.gender || 'ชาย';
    document.querySelectorAll('#cn-gender button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#cn-gender button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.gender = btn.dataset.gender;
        this._updatePreview();
      });
    });
    const dateEl = document.getElementById('cn-birth-date');
    dateEl?.addEventListener('change', () => this._updatePreview());
    dateEl?.addEventListener('input',  () => this._updatePreview());
    document.getElementById('cn-birth-time')?.addEventListener('change', () => this._updatePreview());
    this._updatePreview();
  }

  _updatePreview() {
    const el = document.getElementById('cn-birth-preview');
    if (!el) return;
    const dateStr = document.getElementById('cn-birth-date')?.value;
    const timeStr = document.getElementById('cn-birth-time')?.value || '';
    const a = dateStr ? Bazi.analyse(dateStr, timeStr, this.gender) : null;
    if (!a) {
      el.innerHTML = '<span class="muted">กรอกวันเดือนปีเกิดเพื่อคำนวณเสาชะตา</span>';
      return;
    }
    el.innerHTML = `
      <span class="chip-ok">${a.zodiacEmoji} ปี${a.zodiacAnimal}</span>
      <span>เสาปี <strong>${a.pillars.year.char}</strong></span>
      <span>เสาวัน <strong>${a.pillars.day.char}</strong></span>
      <span>ธาตุเจ้าชะตา <strong>${a.dayMaster.element} ${a.dayMaster.polarity}</strong></span>
      ${a.missing.length ? `<span>ธาตุที่ขาด <strong>${a.missing.join(', ')}</strong></span>` : ''}`;
  }

  _collect() {
    const dateStr = document.getElementById('cn-birth-date')?.value || '';
    const timeStr = document.getElementById('cn-birth-time')?.value || '';
    const analysed = Bazi.analyse(dateStr, timeStr, this.gender);
    if (!analysed) {
      showToast('กรอกวันเดือนปีเกิดก่อนนะครับ 🗓️', 'error');
      document.getElementById('cn-birth-date')?.focus();
      return null;
    }
    return {
      dateStr, timeStr,
      gender: this.gender,
      name: (document.getElementById('cn-name')?.value || '').trim(),
      note: (document.getElementById('cn-note')?.value || '').trim(),
      analysed,
    };
  }

  /* ---------- ข้อมูลที่ส่งให้ AI ---------- */
  _dataBlock(rec) {
    const a = rec.analysed;
    const p = a.pillars;
    const infoOf = (key) => CN_PILLAR_INFO.find(x => x.key === key);

    const lines = [
      'ข้อมูลดวงจีนของผู้ใช้ (คำนวณมาให้แล้ว ใช้เป็นข้อเท็จจริง):',
      `- เพศ: ${rec.gender}`,
      rec.name ? `- ชื่อที่ให้เรียก: ${rec.name}` : null,
      `- วันเกิด: ${rec.dateStr} เวลา ${rec.timeStr || 'ไม่ทราบ (ใช้เที่ยงวันเป็นค่ากลาง)'}`,
      `- อายุปัจจุบัน: ${a.age} ปี`,
      `- ปีนักษัตร: ปี${a.zodiacAnimal} ${p.year.branch.emoji}`,
      '',
      'เสาชะตา 4 เสา:',
      `- ${infoOf('year').title} (${infoOf('year').sub}): ${p.year.char} = ${p.year.label} — ดู ${infoOf('year').look}`,
      `- ${infoOf('month').title} (${infoOf('month').sub}): ${p.month.char} = ${p.month.label} — ดู ${infoOf('month').look}`,
      `- ${infoOf('day').title} (${infoOf('day').sub}): ${p.day.char} = ${p.day.label} — ดู ${infoOf('day').look}`,
      `- ${infoOf('hour').title} (${infoOf('hour').sub}): ${p.hour.char} = ${p.hour.label} — ดู ${infoOf('hour').look}`,
      '',
      `ธาตุเจ้าชะตา (Day Master): ${a.dayMaster.char} = ${a.dayMaster.element} ${a.dayMaster.polarity}`,
      `จำนวนธาตุจาก 8 ตัวอักษร: ${CN_ELEMENT_ORDER.map(e => `${e} ${a.counts[e]}`).join(' · ')}`,
      `- ธาตุที่ขาด: ${a.missing.length ? a.missing.join(', ') : 'ครบทั้ง 5 ธาตุ'}`,
      `- ธาตุที่มากที่สุด: ${a.dominant.join(', ')} (${a.maxCount} ตัว)`,
      '',
      `วัยจร (เปลี่ยนทุก 10 ปี) — เริ่มวัยจรอายุ ${a.luck.startAge} ปี (นับ ${a.luck.days} วัน ÷ 3) ทิศทาง${a.luck.forward ? 'เดินหน้า' : 'ย้อนหลัง'}:`,
      ...a.luck.cycles.map(c =>
        `- ลำดับ ${c.index}: อายุ ${c.ageFrom}–${c.ageTo} ปี (พ.ศ. ${c.yearFrom}–${c.yearTo}) เสา ${c.pillar.char} = ${c.pillar.label}${a.age >= c.ageFrom && a.age < c.ageTo ? '  ← ปัจจุบัน' : ''}`),
      '',
      `ปีปัจจุบัน: พ.ศ. ${a.thisYear.beYear} = ${a.thisYear.char} (${a.thisYear.label})`,
    ].filter(l => l !== null);

    if (rec.note) lines.push('', `หมายเหตุ/สิ่งที่อยากรู้เป็นพิเศษจากผู้ใช้: ${rec.note}`);
    return lines.join('\n');
  }

  /* ---------- รันวิเคราะห์ ---------- */
  async _run() {
    if (this.loading) return;
    if (!Store.get(STORAGE.API_KEY, '')) { showToast('ใส่ API Key ก่อนนะครับ ⚙️', 'error'); return; }

    const rec = this._collect();
    if (!rec) return;

    Store.set(STORAGE.CN_BIRTH, {
      dateStr: rec.dateStr, timeStr: rec.timeStr,
      gender: rec.gender, name: rec.name, note: rec.note,
    });

    this.loading = true;
    if (this.runBtn) { this.runBtn.disabled = true; this.runBtn.textContent = '☯️ กำลังเปิดดวง...'; }

    // แสดงผลคำนวณทันที ก่อนรอ AI
    this._renderPanel(rec.analysed);
    this.resultEl.innerHTML = '<div class="astro-loading"><span class="thai-loading-orb">☯️</span> กำลังวิเคราะห์ 4 เสาชะตา 5 ธาตุ และวัยจร...</div>';

    try {
      const text = await callGemini(
        `${this._dataBlock(rec)}\n\nกรุณาวิเคราะห์ตามหัวข้อที่กำหนดในคำสั่งระบบ`,
        CN_SYSTEM_PROMPT,
        { maxOutputTokens: 4096 }
      );

      Store.set(STORAGE.CN_RESULT, {
        text,
        birth: { dateStr: rec.dateStr, timeStr: rec.timeStr, gender: rec.gender, name: rec.name, note: rec.note },
        ts: Date.now(),
      });

      this._renderResult(text);
    } catch (err) {
      this.resultEl.innerHTML = `<div class="astro-error">❌ เกิดข้อผิดพลาด: ${cnEscape(err.message)}</div>`;
    } finally {
      this.loading = false;
      if (this.runBtn) { this.runBtn.disabled = false; this.runBtn.textContent = '☯️ เปิดดวงจีน'; }
    }
  }

  /* ---------- แผงข้อมูลที่คำนวณได้ ---------- */
  _renderPanel(a) {
    this.panelEl.innerHTML = `
      ${this._pillarsHTML(a)}
      ${this._elementsHTML(a)}
      ${this._luckHTML(a)}`;
    this.panelEl.hidden = false;
  }

  _pillarsHTML(a) {
    const cards = CN_PILLAR_INFO.map(info => {
      const p = a.pillars[info.key];
      const isSelf = info.key === 'day';
      return `
        <div class="cn-pillar ${isSelf ? 'is-self' : ''}">
          <div class="cn-pillar-head">
            <span class="cn-pillar-icon">${info.icon}</span>
            <div>
              <div class="cn-pillar-title">${info.title}</div>
              <div class="cn-pillar-sub">${info.sub}${isSelf ? ' · ธาตุเจ้าชะตา' : ''}</div>
            </div>
          </div>
          <div class="cn-pillar-chars">
            <span class="cn-char el-${cnElementClass(p.stem.element)}">${p.stem.char}</span>
            <span class="cn-char el-${cnElementClass(p.branch.element)}">${p.branch.char}</span>
            <span class="cn-zodiac">${p.branch.emoji} ${p.branch.animal}</span>
          </div>
          <div class="cn-pillar-elements">
            <span class="el-dot el-${cnElementClass(p.stem.element)}">${p.stem.element} ${p.stem.polarity}</span>
            <span class="el-dot el-${cnElementClass(p.branch.element)}">${p.branch.element}</span>
          </div>
          <p class="cn-pillar-look">ดูเรื่อง ${info.look}</p>
        </div>`;
    }).join('');
    return `<div class="astro-card"><h3 class="astro-card-title">🔍 ถอดรหัส 4 เสาชะตา</h3><div class="cn-pillar-grid">${cards}</div></div>`;
  }

  _elementsHTML(a) {
    const bars = CN_ELEMENT_ORDER.map(el => `
      <div class="cn-el-row">
        <span class="cn-el-name el-text-${cnElementClass(el)}">${el}</span>
        <span class="cn-el-bar"><i class="el-bg-${cnElementClass(el)}" style="width:${(a.counts[el] / a.total) * 100}%"></i></span>
        <span class="cn-el-count">${a.counts[el]}</span>
      </div>`).join('');

    return `
      <div class="astro-card">
        <h3 class="astro-card-title">☯️ ความสมดุลของ 5 ธาตุ</h3>
        <div class="cn-elements">${bars}</div>
        <div class="cn-el-summary">
          <span class="cn-tag ok">ธาตุเจ้าชะตา: ${a.dayMaster.char} = ${a.dayMaster.element} ${a.dayMaster.polarity}</span>
          <span class="cn-tag ${a.missing.length ? 'warn' : 'ok'}">
            ${a.missing.length ? `ธาตุที่ขาด: ${a.missing.join(', ')}` : 'ครบทั้ง 5 ธาตุ'}
          </span>
          <span class="cn-tag warn">ธาตุที่มากที่สุด: ${a.dominant.join(', ')} (${a.maxCount} ตัว)</span>
        </div>
      </div>`;
  }

  _luckHTML(a) {
    const cur = a.age;
    const rows = a.luck.cycles.map(c => {
      const active = cur >= c.ageFrom && cur < c.ageTo;
      return `
        <li class="cn-luck-row ${active ? 'active' : ''}">
          <span class="cn-luck-pillar el-${cnElementClass(c.pillar.stem.element)}">${c.pillar.char}</span>
          <span class="cn-luck-age">อายุ ${c.ageFrom}–${c.ageTo} ปี</span>
          <span class="cn-luck-year">พ.ศ. ${c.yearFrom}–${c.yearTo}</span>
          <span class="cn-luck-el">${c.pillar.label}</span>
          ${active ? '<span class="cn-luck-now">← วัยจรปัจจุบัน</span>' : ''}
        </li>`;
    }).join('');

    return `
      <div class="astro-card">
        <h3 class="astro-card-title">⏳ วัยจร 10 ปี และดวงรายปี</h3>
        <div class="cn-luck-now-badge">
          ปีนี้ พ.ศ. ${a.thisYear.beYear} · เจ้าชะตา ${a.thisYear.char} (${a.thisYear.label})
        </div>
        <ul class="cn-luck-list">${rows}</ul>
        <p class="astro-card-hint">
          วัยจรเริ่มที่อายุ ${a.luck.startAge} ปี (นับ${a.luck.days} วัน ÷ 3) ทิศทาง${a.luck.forward ? 'เดินหน้า' : 'ย้อนหลัง'} ·
          เสาเดือนคือจุดตั้งต้นของวัยจร · ปีจีนเริ่มที่ลี่ชุน (ราว 4 ก.พ.)
        </p>
      </div>`;
  }

  /* ---------- ผลวิเคราะห์จาก AI ---------- */
  _renderResult(text) {
    const sections = cnSplitSections(text);
    const cards = sections.length > 1
      ? sections.map(s => `
          <div class="astro-result">
            <div class="astro-result-head">
              <div class="astro-result-badge">${cnEscape(s.title) || '☯️ คำทำนาย'}</div>
            </div>
            <div class="astro-reading">${cnFormat(s.body)}</div>
          </div>`).join('')
      : `<div class="astro-result">
           <div class="astro-result-head"><div class="astro-result-badge">☯️ คำทำนายจากเทพซ่า</div></div>
           <div class="astro-reading">${cnFormat(text)}</div>
         </div>`;

    this.resultEl.innerHTML = `
      ${cards}
      <div class="cn-actions">
        <button type="button" class="astro-mini-btn" id="cn-copy">📋 คัดลอกคำทำนาย</button>
        <button type="button" class="astro-mini-btn" id="cn-again">🔄 วิเคราะห์ใหม่</button>
      </div>`;

    this.resultEl.querySelectorAll('.astro-reading').forEach((reading) => {
      addTTSButton(reading.parentElement, () => reading.textContent);
    });

    document.getElementById('cn-copy')?.addEventListener('click', () => {
      const plain = String(text).replace(/\*\*/g, '').replace(/^#{2,4}\s*/gm, '');
      navigator.clipboard?.writeText(plain)
        .then(() => showToast('คัดลอกคำทำนายแล้ว 📋', 'success'))
        .catch(() => showToast('คัดลอกไม่สำเร็จ', 'error'));
    });
    document.getElementById('cn-again')?.addEventListener('click', () => this.runBtn?.click());
  }

  /* ---------- เปิดหน้ามาแล้วมีผลเดิม ---------- */
  restore() {
    const saved = Store.get(STORAGE.CN_RESULT, null);
    const birth = this._saved();
    if (saved?.text) {
      const a = birth.dateStr ? Bazi.analyse(birth.dateStr, birth.timeStr || '', birth.gender || 'ชาย') : null;
      if (a) this._renderPanel(a);
      this._renderResult(saved.text);
    }
    this._renderKeyWarning();
  }
}

/* ---------------- Init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('cn-form-slot')) return;
  const app = new ChineseAstro();
  window.chineseAstro = app;

  // เติมฟอร์มเริ่มต้น
  const saved = app._saved();
  const slot = document.getElementById('cn-form-slot');
  slot.innerHTML = `
    <div class="astro-card">
      <h3 class="astro-card-title">🗓️ ข้อมูลเกิดสำหรับผูกดวงจีน</h3>
      <div class="astro-form-grid">
        <label class="astro-field">
          <span>วันเดือนปีเกิด</span>
          <input type="date" id="cn-birth-date" max="2100-12-31" value="${cnEscape(saved.dateStr || '')}" />
        </label>
        <label class="astro-field">
          <span>เวลาเกิด <em>(สำคัญต่อเสาเวลา — ไม่ทราบใช้เที่ยงวัน)</em></span>
          <input type="time" id="cn-birth-time" value="${cnEscape(saved.timeStr || '')}" />
        </label>
        <div class="astro-field">
          <span>เพศ <em>(ใช้กำหนดทิศทางวัยจร)</em></span>
          <div class="astro-segmented" id="cn-gender">
            <button type="button" data-gender="ชาย" class="${(saved.gender || 'ชาย') === 'ชาย' ? 'active' : ''}">ชาย</button>
            <button type="button" data-gender="หญิง" class="${saved.gender === 'หญิง' ? 'active' : ''}">หญิง</button>
            <button type="button" data-gender="ไม่ระบุ" class="${saved.gender === 'ไม่ระบุ' ? 'active' : ''}">ไม่ระบุ</button>
          </div>
        </div>
        <label class="astro-field">
          <span>ชื่อที่ให้เรียก <em>(ไม่บังคับ)</em></span>
          <input type="text" id="cn-name" placeholder="เช่น คุณสมชาย" value="${cnEscape(saved.name || '')}" />
        </label>
      </div>
      <label class="astro-field astro-field-full">
        <span>สิ่งที่อยากรู้เป็นพิเศษ <em>(ไม่บังคับ)</em></span>
        <textarea id="cn-note" rows="2" placeholder="เช่น อยากเน้นเรื่องการงาน, อยากรู้จังหวะเปลี่ยนงานกลางปีนี้">${cnEscape(saved.note || '')}</textarea>
      </label>
      <div class="astro-birth-preview" id="cn-birth-preview"></div>
    </div>`;

  app._bindForm();
  app.restore();
});
