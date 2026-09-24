/* ============================================================
   tarot.js — ไพ่ทาโรต์ & ไพ่ยิปซี
   78 cards, shuffle, cut, pick 3, daily limit, AI reading
   ============================================================ */

'use strict';

// ---- 78 Tarot Cards Dataset ----
const MAJOR_ARCANA = [
  { id: 0,  name: 'The Fool',         nameTH: 'นักเดินทาง',        emoji: '🃏', meaning: 'จุดเริ่มต้น การผจญภัย ความไร้เดียงสา' },
  { id: 1,  name: 'The Magician',     nameTH: 'นักมายากล',         emoji: '🎩', meaning: 'พลัง ความสามารถ ความมุ่งมั่น' },
  { id: 2,  name: 'The High Priestess', nameTH: 'นักบวชหญิง',      emoji: '🌙', meaning: 'สัญชาตญาณ ความลึกลับ ความรู้ภายใน' },
  { id: 3,  name: 'The Empress',      nameTH: 'จักรพรรดินี',       emoji: '👑', meaning: 'ความอุดมสมบูรณ์ ธรรมชาติ ความเป็นแม่' },
  { id: 4,  name: 'The Emperor',      nameTH: 'จักรพรรดิ',         emoji: '⚔️', meaning: 'อำนาจ โครงสร้าง ความเป็นผู้นำ' },
  { id: 5,  name: 'The Hierophant',   nameTH: 'นักบวช',            emoji: '⛪', meaning: 'ประเพณี ศรัทธา การเรียนรู้' },
  { id: 6,  name: 'The Lovers',       nameTH: 'คู่รัก',            emoji: '💕', meaning: 'ความรัก ความสัมพันธ์ การเลือก' },
  { id: 7,  name: 'The Chariot',      nameTH: 'รถม้า',             emoji: '🏆', meaning: 'ชัยชนะ ความมุ่งมั่น การควบคุม' },
  { id: 8,  name: 'Strength',         nameTH: 'ความแข็งแกร่ง',     emoji: '🦁', meaning: 'ความกล้า ความอดทน การฝึกฝน' },
  { id: 9,  name: 'The Hermit',       nameTH: 'ฤๅษี',              emoji: '🏔️', meaning: 'ความสันโดษ ปัญญา การแสวงหา' },
  { id: 10, name: 'Wheel of Fortune', nameTH: 'วงล้อโชคชะตา',     emoji: '☸️', meaning: 'โชคชะตา การเปลี่ยนแปลง วัฏจักร' },
  { id: 11, name: 'Justice',          nameTH: 'ความยุติธรรม',      emoji: '⚖️', meaning: 'ความยุติธรรม สมดุล ความจริง' },
  { id: 12, name: 'The Hanged Man',   nameTH: 'ชายแขวนคอ',         emoji: '🙃', meaning: 'การรอคอย การเสียสละ มุมมองใหม่' },
  { id: 13, name: 'Death',            nameTH: 'ความตาย',            emoji: '💀', meaning: 'การเปลี่ยนแปลง การสิ้นสุด การเริ่มใหม่' },
  { id: 14, name: 'Temperance',       nameTH: 'ความพอดี',          emoji: '🌊', meaning: 'ความสมดุล ความอดทน การปรับตัว' },
  { id: 15, name: 'The Devil',        nameTH: 'ซาตาน',             emoji: '😈', meaning: 'การติด ความมืด สิ่งยั่วยวน' },
  { id: 16, name: 'The Tower',        nameTH: 'หอคอย',             emoji: '⚡', meaning: 'ความวุ่นวาย การเปลี่ยนแปลงฉับพลัน' },
  { id: 17, name: 'The Star',         nameTH: 'ดวงดาว',            emoji: '⭐', meaning: 'ความหวัง แรงบันดาลใจ การรักษา' },
  { id: 18, name: 'The Moon',         nameTH: 'ดวงจันทร์',         emoji: '🌕', meaning: 'ความลวงตา ความกลัว จิตใต้สำนึก' },
  { id: 19, name: 'The Sun',          nameTH: 'ดวงอาทิตย์',        emoji: '☀️', meaning: 'ความสุข ความสำเร็จ ความกระจ่าง' },
  { id: 20, name: 'Judgement',        nameTH: 'วันพิพากษา',        emoji: '📯', meaning: 'การตื่นรู้ การเรียกสติ การฟื้นฟู' },
  { id: 21, name: 'The World',        nameTH: 'โลก',               emoji: '🌍', meaning: 'ความสำเร็จ บูรณาการ การเดินทาง' },
];

const SUITS = ['ถ้วย', 'ดาบ', 'ไม้เท้า', 'เหรียญ'];
const SUIT_EMOJIS = { 'ถ้วย': '🏆', 'ดาบ': '⚔️', 'ไม้เท้า': '🪄', 'เหรียญ': '💰' };
const RANKS = ['Ace','2','3','4','5','6','7','8','9','10','Page','Knight','Queen','King'];
const RANK_TH = { 'Ace':'เอซ', '2':'สอง', '3':'สาม', '4':'สี่', '5':'ห้า', '6':'หก', '7':'เจ็ด', '8':'แปด', '9':'เก้า', '10':'สิบ', 'Page':'หน้า', 'Knight':'อัศวิน', 'Queen':'ราชินี', 'King':'กษัตริย์' };

// Generate all 78 cards
const ALL_CARDS = [...MAJOR_ARCANA];
for (const suit of SUITS) {
  for (const rank of RANKS) {
    ALL_CARDS.push({
      id:      100 + ALL_CARDS.length,
      name:    `${rank} of ${suit}`,
      nameTH:  `${RANK_TH[rank]}แห่ง${suit}`,
      emoji:   SUIT_EMOJIS[suit],
      meaning: `พลังของ${suit} ระดับ ${RANK_TH[rank]}`,
      suit, rank, minor: true
    });
  }
}

const CARD_POSITIONS = ['อดีต', 'ปัจจุบัน', 'อนาคต'];
const CARD_IMAGE_PATH = '../icon_sss/Major_Arcana/';
const CARD_IMAGE_FILES = [
  'Ace_of_Pentacles_—_ไพ่ทาโรต์,_I_Ace_of_Pentacles.webp', 'Ace_of_Swords_—_ไพ่ทาโรต์,_I_Ace_of_Swords.webp',
  'Eight_of_Cups_—_ไพ่ทาโรต์,_VIII_Eight_of_Cups.webp', 'Eight_of_Pentacles_—_ไพ่ทาโรต์,_VIII_Eight_of_Pentacles.webp',
  'Eight_of_Swords_—_ไพ่ทาโรต์,_VIII_Eight_of_Swords.webp', 'Five_of_Cups_—_ไพ่ทาโรต์,_V_Five_of_Cups.webp',
  'Five_of_Pentacles_—_ไพ่ทาโรต์,_V_Five_of_Pentacles.webp', 'Five_of_Swords_—_ไพ่ทาโรต์,_V_Five_of_Swords.webp',
  'Four_of_Pentacles_—_ไพ่ทาโรต์,_IV_Four_of_Pentacles.webp', 'Four_of_Swords_—_ไพ่ทาโรต์,_IV_Four_of_Swords.webp',
  'King_of_Cups_—_ไพ่ทาโรต์,_King_of_Cups.webp', 'King_of_Pentacles_—_ไพ่ทาโรต์,_King_of_Pentacles.webp',
  'King_of_Swords_—_ไพ่ทาโรต์,_King_of_Swords.webp', 'Knight_of_Cups_—_ไพ่ทาโรต์,_Knight_of_Cups.webp',
  'Knight_of_Pentacles_—_ไพ่ทาโรต์,_Knight_of_Pentacles.webp', 'Nine_of_Cups_—_ไพ่ทาโรต์,_IX_Nine_of_Cups.webp',
  'Nine_of_Pentacles_—_ไพ่ทาโรต์,_IX_Nine_of_Pentacles.webp', 'Nine_of_Swords_—_ไพ่ทาโรต์,_IX_Nine_of_Swords.webp',
  'Page_of_Cups_—_ไพ่ทาโรต์,_Page_of_Cups.webp', 'Page_of_Pentacles_—_ไพ่ทาโรต์,_Page_of_Pentacles.webp',
  'Page_of_Swords_—_ไพ่ทาโรต์,_Page_of_Swords.webp', 'Queen_of_Cups_—_ไพ่ทาโรต์,_Queen_of_Cups.webp',
  'Queen_of_Pentacles_—_ไพ่ทาโรต์,_Queen_of_Pentacles.webp', 'Queen_of_Swords_—_ไพ่ทาโรต์,_Queen_of_Swords.webp',
  'Seven_of_Cups_—_ไพ่ทาโรต์,_VII_Seven_of_Cups.webp', 'Seven_of_Pentacles_—_ไพ่ทาโรต์,_VII_Seven_of_Pentacles.webp',
  'Seven_of_Swords_—_ไพ่ทาโรต์,_VII_Seven_of_Swords.webp', 'Six_of_Cups_—_ไพ่ทาโรต์,_VI_Six_of_Cups.webp',
  'Six_of_Pentacles_—_ไพ่ทาโรต์,_VI_Six_of_Pentacles.webp', 'Ten_of_Cups_—_ไพ่ทาโรต์,_X_Ten_of_Cups.webp',
  'Ten_of_Pentacles_—_ไพ่ทาโรต์,_X_Ten_of_Pentacles.webp', 'Ten_of_Swords_—_ไพ่ทาโรต์,_X_Ten_of_Swords.webp',
  'Three_of_Pentacles_—_ไพ่ทาโรต์,_III_Three_of_Pentacles.webp', 'Three_of_Swords_—_ไพ่ทาโรต์,_III_Three_of_Swords.webp',
  'Two_of_Pentacles_—_ไพ่ทาโรต์,_II_Two_of_Pentacles.webp', 'Two_of_Swords_—_ไพ่ทาโรต์,_II_Two_of_Swords.webp',
  'ความยุติธรรม_—_ไพ่ทาโรต์,_XI_Justice.webp', 'ควีนออฟวอนด์ส_—_ไพ่ทาโรต์,_Queen_of_Wands.webp',
  'คิงออฟวอนด์ส_—_ไพ่ทาโรต์,_King_of_Wands.webp', 'จัดจ์เมนต์_—_ไพ่ทาโรต์,_XX_Judgement.webp',
  'ดิเอ็มเพรส_—_ไพ่ทาโรต์,_III_The_Empress.webp', 'ดิเอ็มเพอเรอร์_—_ไพ่ทาโรต์,_IV_The_Emperor.webp',
  'ทรีออฟคัพส์_—_ไพ่ทาโรต์,_III_Three_of_Cups.webp', 'ทรีออฟวอนด์ส_—_ไพ่ทาโรต์,_III_Three_of_Wands.webp',
  'ทูออฟคัพส์_—_ไพ่ทาโรต์,_II_Two_of_Cups.webp', 'ทูออฟวอนด์ส_—_ไพ่ทาโรต์,_II_Two_of_Wands.webp',
  'วีลออฟฟอร์จูน_—_ไพ่ทาโรต์,_X_Wheel_of_Fortune.webp', 'สิบไม้เท้า_—_ไพ่ทาโรต์,_X_Ten_of_Wands.webp',
  'สเตร็งธ์_—_ไพ่ทาโรต์,_VIII_Strength.webp', 'ห้าไม้เท้า_—_ไพ่ทาโรต์,_V_Five_of_Wands.webp',
  'เซเว่นออฟวอนด์ส_—_ไพ่ทาโรต์,_VII_Seven_of_Wands.webp', 'เดธ_—_ไพ่ทาโรต์,_XIII_Death.webp',
  'เดอะซัน_—_ไพ่ทาโรต์,_XIX_The_Sun.webp', 'เดอะทาวเวอร์_—_ไพ่ทาโรต์,_XVI_The_Tower.webp',
  'เดอะฟูล_—_ไพ่ทาโรต์,_0_The_Fool.webp', 'เดอะมูน_—_ไพ่ทาโรต์,_XVIII_The_Moon.webp',
  'เดอะสตาร์_—_ไพ่ทาโรต์,_XVII_The_Star.webp', 'เดอะเดวิล_—_ไพ่ทาโรต์,_XV_The_Devil.webp',
  'เดอะเมจิเชียน_—_ไพ่ทาโรต์,_I_The_Magician.webp', 'เดอะเลิฟเวอร์ส_—_ไพ่ทาโรต์,_VI_The_Lovers.webp',
  'เดอะเวิลด์_—_ไพ่ทาโรต์,_XXI_The_World.webp', 'เดอะเฮอร์มิท_—_ไพ่ทาโรต์,_IX_The_Hermit.webp',
  'เดอะแชริออท_—_ไพ่ทาโรต์,_VII_The_Chariot.webp', 'เดอะแฮงด์แมน_—_ไพ่ทาโรต์,_XII_The_Hanged_Man.webp',
  'เดอะไฮพรีสเทส_—_ไพ่ทาโรต์,_II_The_High_Priestess.webp', 'เดอะไฮโรแฟนท์_—_ไพ่ทาโรต์,_V_The_Hierophant.webp',
  'เทมเพอแรนซ์_—_ไพ่ทาโรต์,_XIV_Temperance.webp', 'เพจออฟวอนด์ส_—_ไพ่ทาโรต์,_Page_of_Wands.webp',
  'เอซออฟคัพส์_—_ไพ่ทาโรต์,_I_Ace_of_Cups.webp', 'เอซออฟวอนด์ส_—_ไพ่ทาโรต์,_I_Ace_of_Wands.webp',
  'เอทออฟวอนด์ส_—_ไพ่ทาโรต์,_VIII_Eight_of_Wands.webp', 'โฟร์ออฟคัพส์_—_ไพ่ทาโรต์,_IV_Four_of_Cups.webp',
  'โฟร์ออฟวอนด์ส_—_ไพ่ทาโรต์,_IV_Four_of_Wands.webp', 'ไนท์ออฟวอนด์ส_—_ไพ่ทาโรต์,_Knight_of_Wands.webp',
  'ไนน์ออฟวอนด์ส_—_ไพ่ทาโรต์,_IX_Nine_of_Wands.webp', 'ไพ่_6_ดาบ_—_ไพ่ทาโรต์,_VI_Six_of_Swords.webp',
  'ไพ่_ภาคีดาบ_—_ไพ่ทาโรต์,_Knight_of_Swords.webp', 'ไพ่หกไม้เท้า_—_ไพ่ทาโรต์,_VI_Six_of_Wands.webp'
];

const ROMAN_NUMERALS = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
const MINOR_RANK_ROMAN = { Ace: 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII', '9': 'IX', '10': 'X' };
const MINOR_RANK_ENGLISH = { Ace: 'Ace', '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine', '10': 'Ten' };
const SUIT_ENGLISH = { 'ถ้วย': 'Cups', 'ดาบ': 'Swords', 'ไม้เท้า': 'Wands', 'เหรียญ': 'Pentacles' };

function getMajorArcanaImage(card) {
  const englishName = card.minor
    ? `${MINOR_RANK_ENGLISH[card.rank] || card.rank}_of_${SUIT_ENGLISH[card.suit]}`
    : card.name.replaceAll(' ', '_');
  const rankPrefix = card.minor ? (MINOR_RANK_ROMAN[card.rank] ? `${MINOR_RANK_ROMAN[card.rank]}_` : '') : `${ROMAN_NUMERALS[card.id]}_`;
  const suffix = `_${rankPrefix}${englishName}.webp`;
  const filename = CARD_IMAGE_FILES.find(file => file.endsWith(suffix));
  return filename ? `${CARD_IMAGE_PATH}${encodeURI(filename)}` : '';
}

const TAROT_SYSTEM_PROMPT = `คุณคือ "เทพซ่า" หมอดูผู้เชี่ยวชาญด้านไพ่ทาโรต์ ไพ่ยิปซี และโหราศาสตร์ตะวันตก

กฎการตอบ:
1. วิเคราะห์ไพ่ทั้ง 3 ใบในตำแหน่ง อดีต / ปัจจุบัน / อนาคต
2. อธิบายความหมายของแต่ละใบอย่างละเอียด รวมถึงถ้าไพ่กลับด้าน (reversed)
3. สรุปภาพรวมและคำทำนายที่เชื่อมโยงกัน
4. ใช้ภาษาไทยที่ลึกซึ้ง มีบรรยากาศลึกลับ ไสยศาสตร์
5. ใส่สัญลักษณ์ 🔮 ✨ 🌙 ⭐ เพิ่มบรรยากาศ
6. จบด้วยคำแนะนำและกำลังใจ`;

class TarotReader {
  constructor() {
    this.deck     = [];
    this.selected = [];
    this.phase    = 'deck'; // 'deck' | 'pick' | 'result'

    // ล้างข้อจำกัด 24 ชั่วโมงเดิมออก เพื่อให้จับไพ่ได้ตลอดเวลาตามใจชอบ
    Store.remove(STORAGE.TAROT_DATE);
    Store.remove(STORAGE.TAROT_RESULT);

    this._showPhase('deck');
    this._bind();
  }

  _bind() {
    document.getElementById('btn-shuffle')?.addEventListener('click', () => this._shuffle());
    document.getElementById('btn-cut')?.addEventListener('click',    () => this._cut());
    document.getElementById('btn-start-pick')?.addEventListener('click', () => this._startPick());
    document.getElementById('btn-new-reading')?.addEventListener('click', () => this._newReading());
  }

  _shuffle() {
    this._animateDeck('deck-shuffle-anim', 1600);
    this.deck = this._buildShuffledDeck();
    showToast('สับไพ่แล้ว ✨', 'info', 1500);
  }

  _cut() {
    if (this.deck.length === 0) this.deck = this._buildShuffledDeck();
    // Cut: move top half to bottom
    const cutPoint = Math.floor(this.deck.length / 3) + Math.floor(Math.random() * (this.deck.length / 3));
    this.deck = [...this.deck.slice(cutPoint), ...this.deck.slice(0, cutPoint)];
    this._animateDeck('deck-cut-anim', 1800);
    showToast('ตัดไพ่แล้ว 🃏', 'info', 1500);
  }

  _animateDeck(animationClass, duration) {
    const deckEl = document.getElementById('deck-visual');
    if (!deckEl) return;

    deckEl.classList.remove('deck-shuffle-anim', 'deck-cut-anim');
    void deckEl.offsetWidth;
    deckEl.classList.add(animationClass);
    window.setTimeout(() => deckEl.classList.remove(animationClass), duration);
  }

  _startPick() {
    if (this.deck.length === 0) this.deck = this._buildShuffledDeck();
    this.selected = [];
    const dots = document.querySelectorAll('.pick-dot');
    dots.forEach(dot => dot.classList.remove('filled'));
    this._showPhase('pick');
    this._renderSpread();
  }

  _pickCard(spreadIndex) {
    if (this.selected.length >= 3) return;
    const card = this.deck[spreadIndex];
    if (!card || this.selected.find(c => c.deckIndex === spreadIndex)) return;

    card.deckIndex = spreadIndex;
    card.reversed  = Math.random() < 0.3; // 30% chance reversed
    this.selected.push(card);

    // Update dot indicators
    const dots = document.querySelectorAll('.pick-dot');
    dots[this.selected.length - 1]?.classList.add('filled');

    // Mark card as selected
    document.querySelectorAll('.spread-card')[spreadIndex]?.classList.add('selected');

    if (this.selected.length === 3) {
      setTimeout(() => this._showResult(), 600);
    }
  }

  async _showResult() {
    this._showPhase('result');
    this._renderResultCards();
    await this._getAIReading();
  }

  _renderResultCards() {
    const container = document.getElementById('result-cards');
    if (!container) return;
    container.innerHTML = '';

    this.selected.forEach((card, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'result-card-wrapper';

      const pos = document.createElement('div');
      pos.className = 'result-card-position';
      pos.textContent = CARD_POSITIONS[i];

      const face = document.createElement('div');
      face.className = `tarot-card-face${card.reversed ? ' reversed' : ''}`;
      face.style.animationDelay = `${i * 0.2}s`;
      face.innerHTML = `
        <img class="card-image" src="${getMajorArcanaImage(card)}" alt="${card.nameTH}" />`;

      const details = document.createElement('div');
      details.className = 'result-card-details';
      details.innerHTML = `
        <div class="card-name">${card.nameTH}</div>
        <div class="card-number">${card.name}</div>`;

      const revLabel = document.createElement('div');
      revLabel.className = 'reversed-label';
      revLabel.textContent = card.reversed ? '🔄 กลับด้าน' : '';

      wrapper.appendChild(pos);
      wrapper.appendChild(face);
      wrapper.appendChild(details);
      wrapper.appendChild(revLabel);
      container.appendChild(wrapper);
    });
  }

  async _getAIReading() {
    const readingEl = document.getElementById('tarot-reading-text');
    const readingBox = document.getElementById('tarot-reading-box');
    if (!readingEl || !readingBox) return;

    readingBox.style.display = 'block';
    readingEl.className = 'tarot-reading-text typing-cursor';
    readingEl.textContent = '';

    const key = Store.get(STORAGE.API_KEY, '');
    if (!key) {
      readingEl.className = 'tarot-reading-text';
      readingEl.innerHTML = '⚠️ กรุณาใส่ API Key เพื่อรับคำทำนาย<br><br>ไพ่ที่จับได้:<br>' +
        this.selected.map((c, i) => `${CARD_POSITIONS[i]}: ${c.nameTH} (${c.name})${c.reversed ? ' [กลับด้าน]' : ''}`).join('<br>');
      return;
    }

    const cardDesc = this.selected.map((c, i) =>
      `ตำแหน่ง${CARD_POSITIONS[i]}: ${c.nameTH} (${c.name})${c.reversed ? ' - กลับด้าน' : ''}\nความหมายพื้นฐาน: ${c.meaning}`
    ).join('\n\n');

    const prompt = `จับไพ่ทาโรต์ได้ 3 ใบดังนี้:\n\n${cardDesc}\n\nกรุณาวิเคราะห์และทำนายอย่างละเอียด`;

    try {
      let fullText = '';
      for await (const chunk of callGeminiStream(prompt, TAROT_SYSTEM_PROMPT)) {
        fullText += chunk;
        readingEl.textContent = fullText;
        readingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
      readingEl.className = 'tarot-reading-text';
      addTTSButton(readingBox, () => fullText);
    } catch (err) {
      readingEl.className = 'tarot-reading-text';
      readingEl.textContent = `❌ เกิดข้อผิดพลาด: ${err.message}`;
    }
  }

  _newReading() {
    Store.remove(STORAGE.TAROT_DATE);
    Store.remove(STORAGE.TAROT_RESULT);
    this.selected = [];
    this.deck = [];

    // รีเซ็ตการแสดงผลคำทำนาย
    const readingBox = document.getElementById('tarot-reading-box');
    if (readingBox) readingBox.style.display = 'none';
    const readingEl = document.getElementById('tarot-reading-text');
    if (readingEl) {
      readingEl.textContent = '';
      readingEl.className = 'tarot-reading-text';
    }
    const ttsBtn = readingBox?.querySelector('.btn-tts');
    if (ttsBtn) ttsBtn.remove();

    // รีเซ็ตจุดนับไพ่
    const dots = document.querySelectorAll('.pick-dot');
    dots.forEach(dot => dot.classList.remove('filled'));

    this._showPhase('deck');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (typeof showToast === 'function') {
      showToast('พร้อมจับไพ่รอบใหม่แล้ว ✨', 'info', 1500);
    }
  }

  _renderSpread() {
    const container = document.getElementById('cards-spread');
    if (!container) return;
    container.innerHTML = '';

    // Show 21 cards face down
    const count = 21;
    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'spread-card';
      card.dataset.index = i;
      card.addEventListener('click', () => this._pickCard(i));
      container.appendChild(card);
    }
  }

  _buildShuffledDeck() {
    const deck = [...ALL_CARDS];
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  _showPhase(phase) {
    this.phase = phase;
    const phases = ['deck', 'pick', 'result'];
    phases.forEach(p => {
      const el = document.getElementById(`phase-${p}`);
      if (el) el.style.display = (p === phase) ? 'block' : 'none';
    });

    // ซ่อนกล่องแจ้งเตือนลิมิตรายวัน (ให้เปิดไพ่ได้ตลอดเวลา)
    const limitNotice = document.getElementById('daily-limit-notice');
    if (limitNotice) {
      limitNotice.style.display = 'none';
    }
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('phase-deck')) {
    window.tarotReader = new TarotReader();
  }
});
