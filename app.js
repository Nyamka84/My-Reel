'use strict';

// ══════════════════════════════════════
//  STATE
// ══════════════════════════════════════
let APP = {
  currentDay    : 0,
  currentSentIdx: 0,
  isFlipped     : false,
  examAnswered  : false,
  examState     : {
    type     : 'day',
    dayIndex : 0,
    questions: [],
    currentQ : 0,
    answers  : [],
    score    : 0
  }
};

let activeRecognition = null;

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════
const $ = id => document.getElementById(id);

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $(id).classList.add('active');
  window.scrollTo(0, 0);
}

function showLoading(v) {
  $('loading-overlay').style.display = v ? 'flex' : 'none';
}

let toastTimer;
function showToast(msg, type = 'info', ms = 2600) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  clearTimeout(toastTimer);
  t.textContent = msg;
  t.className = `toast ${type}`;
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// ══════════════════════════════════════
//  CUSTOM CONFIRM — browser confirm() орлуулна
// ══════════════════════════════════════
function customConfirm(message, onYes) {
  const old = document.getElementById('custom-confirm');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'custom-confirm';
  overlay.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.75);
    z-index:9999; display:flex; align-items:center;
    justify-content:center; padding:20px;
    backdrop-filter:blur(4px);
  `;
  overlay.innerHTML = `
    <div style="
      background:#1e293b; border:1px solid #334155;
      border-radius:16px; padding:28px 24px;
      max-width:300px; width:100%; text-align:center;
    ">
      <div style="font-size:36px; margin-bottom:12px;">⚠️</div>
      <div style="font-size:16px; font-weight:600;
        color:#f1f5f9; margin-bottom:24px; line-height:1.5;">
        ${message}
      </div>
      <div style="display:flex; gap:10px;">
        <button id="cc-no" style="
          flex:1; padding:12px; background:transparent;
          border:1px solid #334155; border-radius:10px;
          color:#94a3b8; font-size:15px; cursor:pointer;
        ">Үгүй</button>
        <button id="cc-yes" style="
          flex:1; padding:12px;
          background:linear-gradient(135deg,#ef4444,#dc2626);
          border:none; border-radius:10px;
          color:white; font-size:15px;
          font-weight:700; cursor:pointer;
        ">Тийм</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('cc-yes').addEventListener('click', () => {
    overlay.remove();
    onYes();
  });
  document.getElementById('cc-no').addEventListener('click', () => {
    overlay.remove();
  });
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.remove();
  });
}

// ══════════════════════════════════════
//  THEME
// ══════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem('angli_theme') || 'dark';
  if (saved === 'light') {
    document.body.classList.add('light-mode');
    $('btn-theme').textContent = '☀️';
  } else {
    $('btn-theme').textContent = '🌙';
  }
}

$('btn-theme').addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light-mode');
  $('btn-theme').textContent = isLight ? '☀️' : '🌙';
  localStorage.setItem('angli_theme', isLight ? 'light' : 'dark');
});

// ══════════════════════════════════════
//  LICENSE
// ══════════════════════════════════════
function checkLicense() {
  if (LICENSE.isActivated()) {
    initApp();
  } else {
    showPage('page-license');
  }
}

$('license-input').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
  $('license-error').textContent = '';
});

$('btn-activate').addEventListener('click', () => {
  const code = $('license-input').value.trim();
  if (!code) { $('license-error').textContent = 'Код оруулна уу!'; return; }
  if (LICENSE.activate(code)) {
    $('license-error').textContent = '';
    showToast('✅ Амжилттай идэвхижлээ!', 'success');
    setTimeout(initApp, 800);
  } else {
    $('license-error').textContent = '❌ Код буруу байна. Дахин шалгана уу.';
    $('license-input').style.borderColor = 'var(--danger)';
    setTimeout(() => { $('license-input').style.borderColor = ''; }, 1500);
  }
});

// ══════════════════════════════════════
//  TRANSLATE
// ══════════════════════════════════════
async function translateMnToEn(text) {
  const url  = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=mn|en`;
  const res  = await fetch(url);
  const json = await res.json();
  if (json.responseStatus === 200) return json.responseData.translatedText;
  throw new Error('Орчуулга амжилтгүй');
}

// ══════════════════════════════════════
//  TEXT TO SPEECH
// ══════════════════════════════════════
function speakText(text, btnEl) {
  if (!window.speechSynthesis) { showToast('Дэмжихгүй байна', 'error'); return; }
  window.speechSynthesis.cancel();
  const utter   = new SpeechSynthesisUtterance(text);
  utter.lang    = 'en-US';
  utter.rate    = 0.88;
  utter.pitch   = 1;
  const voices  = speechSynthesis.getVoices();
  const enVoice = voices.find(v =>
    v.lang.startsWith('en') &&
    (v.name.includes('Google') || v.name.includes('Microsoft'))
  ) || voices.find(v => v.lang.startsWith('en'));
  if (enVoice) utter.voice = enVoice;
  if (btnEl) {
    btnEl.classList.add('speaking');
    utter.onend = () => btnEl.classList.remove('speaking');
  }
  speechSynthesis.speak(utter);
}

// ══════════════════════════════════════
//  SIMILARITY — Levenshtein
//  (Энэ функц ЗААВАЛ startSpeech-ийн өмнө байх ёстой)
// ══════════════════════════════════════
function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

function answerOk(user, correct) {
  const u = user.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const c = correct.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  return similarity(u, c) >= 0.72;
}

// ══════════════════════════════════════
//  SPEECH RECOGNITION
//  — Эхлэх товч + Дуусгах товч
// ══════════════════════════════════════
function processResult(said, expected, resultEl, startBtn, stopBtn) {
  // Зогсооно
  activeRecognition = null;
  if (startBtn) startBtn.classList.remove('listening');
  if (stopBtn && stopBtn.parentNode) stopBtn.remove();

  if (!resultEl) return;

  const saidClean = said.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const expClean  = expected.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const sim       = similarity(saidClean, expClean);

  resultEl.style.color = '';

  if (sim >= 0.70) {
    resultEl.textContent = `✅ Маш сайн! "${said.trim()}"`;
    resultEl.className   = typeof resultEl.className === 'string'
      ? resultEl.className.replace(/\bcorrect\b|\bincorrect\b/g, '').trim() + ' correct'
      : 'correct';
  } else {
    resultEl.textContent = `❌ "${said.trim()}" — Дахин оролдоно уу`;
    resultEl.className   = typeof resultEl.className === 'string'
      ? resultEl.className.replace(/\bcorrect\b|\bincorrect\b/g, '').trim() + ' incorrect'
      : 'incorrect';
  }
}

function createStopBtn(referenceBtn) {
  // Байгаа stop товч байвал устгана
  const existing = document.querySelector('.speech-stop-btn');
  if (existing) existing.remove();

  const btn = document.createElement('button');
  btn.className   = 'speech-stop-btn';
  btn.textContent = '⏹ Дуусгах';
  btn.style.cssText = `
    padding: 5px 14px;
    background: #7f1d1d;
    border: 1px solid #ef4444;
    border-radius: 20px;
    color: #fca5a5;
    font-size: 12px;
    cursor: pointer;
    margin-left: 6px;
    vertical-align: middle;
    animation: pulse 0.8s infinite;
  `;
  if (referenceBtn && referenceBtn.parentNode) {
    referenceBtn.insertAdjacentElement('afterend', btn);
  }
  return btn;
}

function startSpeech(expected, resultEl, startBtn) {
  // Аль хэдийн ажиллаж байвал зогсооно
  if (activeRecognition) {
    try { activeRecognition.stop(); } catch(e) {}
    activeRecognition = null;
    if (startBtn) startBtn.classList.remove('listening');
    const old = document.querySelector('.speech-stop-btn');
    if (old) old.remove();
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    if (resultEl) {
      resultEl.textContent = '⚠️ Энэ browser дэмжихгүй байна';
      resultEl.className   = 'speech-result incorrect';
    }
    return;
  }

  // resultEl шалгах
  if (!resultEl) {
    showToast('Дуудлага шалгах боломжгүй', 'error');
    return;
  }

  const stopBtn = createStopBtn(startBtn);

  const rec          = new SR();
  rec.lang           = 'en-US';
  rec.continuous     = false;
  rec.interimResults = true;
  activeRecognition  = rec;

  if (startBtn) startBtn.classList.add('listening');
  resultEl.textContent = '🎤 Хэлж байна...';
  resultEl.style.color = '#818cf8';

  // Дуусгах товч
  stopBtn.addEventListener('click', e => {
    e.stopPropagation();
    e.preventDefault();
    try { rec.stop(); } catch(err) {}
  });

  let finalResult = '';

  rec.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        finalResult += t;
      } else {
        interim += t;
      }
    }
    if (resultEl) {
      resultEl.textContent = `🎤 "${interim || finalResult}"`;
    }
  };

  rec.onend = () => {
    if (finalResult) {
      processResult(finalResult, expected, resultEl, startBtn, stopBtn);
    } else {
      // Дуу ороогүй
      activeRecognition = null;
      if (startBtn) startBtn.classList.remove('listening');
      if (stopBtn && stopBtn.parentNode) stopBtn.remove();
      if (resultEl) {
        resultEl.style.color = '';
        resultEl.textContent = '⚠️ Дуу сонсогдсонгүй. Дахин оролдоно уу.';
        resultEl.className   = 'sent-speech-result incorrect';
      }
    }
  };

  rec.onerror = e => {
    activeRecognition = null;
    if (startBtn) startBtn.classList.remove('listening');
    if (stopBtn && stopBtn.parentNode) stopBtn.remove();

    let msg = '⚠️ Алдаа гарлаа.';
    if (e.error === 'no-speech')     msg = '⚠️ Дуу сонсогдсонгүй.';
    if (e.error === 'not-allowed')   msg = '⚠️ Микрофоны зөвшөөрөл өгнө үү.';
    if (e.error === 'network')       msg = '⚠️ Интернет шалгана уу.';
    if (e.error === 'audio-capture') msg = '⚠️ Микрофон олдсонгүй.';

    if (resultEl) {
      resultEl.style.color = '';
      resultEl.textContent = msg;
      resultEl.className   = 'sent-speech-result incorrect';
    }
  };

  try {
    rec.start();
  } catch(err) {
    activeRecognition = null;
    if (startBtn) startBtn.classList.remove('listening');
    if (stopBtn && stopBtn.parentNode) stopBtn.remove();
    if (resultEl) {
      resultEl.textContent = '⚠️ Микрофон эхлүүлж чадсангүй.';
      resultEl.className   = 'sent-speech-result incorrect';
    }
  }
}

// ══════════════════════════════════════
//  HOME PAGE
// ══════════════════════════════════════
function renderHome() {
  const data      = DB.load();
  const container = $('days-container');
  container.innerHTML = '';

  data.days.forEach((day, i) => {
    const locked = DB.isDayLocked(i);
    const filled = day.sentences.filter(s => s.filled).length;
    const isDone = day.score === 10;
    const card   = document.createElement('div');
    card.className = `day-card${locked ? ' locked' : ''}${isDone ? ' completed' : ''}`;

    const dots = day.sentences.map(s => {
      let c = 'dot';
      if (s.filled) c += isDone ? ' done' : ' filled';
      return `<div class="${c}"></div>`;
    }).join('');

    let rightHTML = locked
      ? `<div class="dc-lock">🔒</div>`
      : day.score !== null
        ? `<div class="dc-score">${day.score}/10</div>`
        : '';
    rightHTML += `<div class="dc-dots">${dots}</div>`;

    card.innerHTML = `
      <div class="day-card-left">
        <h3>Day ${day.id}</h3>
        <p>${filled}/10 • ${
          day.score !== null ? `${day.score}/10 оноо` :
          filled === 10 ? 'Шалгалтад бэлэн' : 'Бөглөж байна'
        }</p>
      </div>
      <div class="day-card-right">${rightHTML}</div>
    `;
    if (!locked) card.addEventListener('click', () => openDay(i));
    container.appendChild(card);
  });

  updateGeneralExam();
  showPage('page-home');
}

function updateGeneralExam() {
  const data  = DB.load();
  const total = data.days.reduce(
    (acc, d) => acc + d.sentences.filter(s => s.filled).length, 0
  );
  const ge    = $('general-exam-card');
  const sub   = $('ge-sub');
  const score = $('ge-score');

  if (total >= 20) {
    ge.classList.add('unlocked');
    sub.textContent = `${total} өгүүлбэрийн дотроос 20 асуулт`;
    if (data.generalScore !== null && data.generalScore !== undefined) {
      score.textContent = `${data.generalScore}/10`;
    }
  } else {
    ge.classList.remove('unlocked');
    sub.textContent   = `${total}/20 өгүүлбэр — ${20 - total} дутуу байна`;
    score.textContent = '';
  }
}

// ══════════════════════════════════════
//  DAY PAGE
// ══════════════════════════════════════
function openDay(dayIdx) {
  APP.currentDay = dayIdx;
  const day = DB.getDay(dayIdx);
  if (!day) return;

  $('day-title').textContent = `Day ${day.id}`;
  const badge = $('day-score-badge');
  if (day.score !== null) {
    badge.style.display = 'block';
    badge.textContent   = `${day.score}/10`;
  } else {
    badge.style.display = 'none';
  }

  renderSentences(dayIdx);
  showPage('page-day');
}

// ══════════════════════════════════════
//  ӨГҮҮЛБЭРИЙН ЖАГСААЛТ
// ══════════════════════════════════════
function renderSentences(dayIdx) {
  const day       = DB.getDay(dayIdx);
  const container = $('sentences-container');
  container.innerHTML = '';

  day.sentences.forEach((sent, i) => {
    const row = document.createElement('div');
    row.className   = `sentence-row${sent.filled ? ' filled' : ''}`;
    row.dataset.idx = i;

    if (sent.filled) {
      let showMn = false;
      row.innerHTML = buildFilledRow(sent, i, showMn);
      attachRowEvents(row, sent, i, showMn);

      row.addEventListener('click', e => {
        if (e.target.closest(
          'button, textarea, .sent-edit-area, .speech-stop-btn'
        )) return;
        showMn = !showMn;
        animateFlipRow(row, sent, i, showMn);
      });

    } else {
      row.innerHTML = `
        <div class="sent-en-row">
          <div class="sent-num">${i + 1}</div>
          <div class="sent-empty">+ Өгүүлбэр нэмэх...</div>
        </div>
      `;
      row.addEventListener('click', () => openModal(dayIdx, i));
    }

    container.appendChild(row);
  });

  updateExamCard(day);
}

// ── Row HTML ──
function buildFilledRow(sent, i, showMn) {
  if (showMn) {
    return `
      <div class="sent-face sent-face-mn">
        <div class="sent-en-row">
          <div class="sent-num mn-num">${i + 1}</div>
          <div class="sent-mn-big">${sent.mn}</div>
          <span class="sent-flip-icon">🔄</span>
        </div>
        <div class="sent-action-bar">
          <button class="sent-edit-btn" data-side="mn">✏️ Монгол засах</button>
        </div>
        <div class="sent-edit-area" style="display:none">
          <textarea class="sent-edit-textarea" rows="2">${sent.mn}</textarea>
          <div class="sent-edit-btns">
            <button class="sent-cancel-btn">Болих</button>
            <button class="sent-save-btn" data-side="mn">💾 Хадгалж орчуулах</button>
          </div>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="sent-face sent-face-en">
        <div class="sent-en-row">
          <div class="sent-num">${i + 1}</div>
          <div class="sent-en-text">${sent.en}</div>
          <span class="sent-flip-icon">🔄</span>
        </div>
        <div class="sent-action-bar">
          <button class="act-btn act-voice sent-voice-btn">🔊</button>
          <button class="act-btn act-edit sent-edit-btn" data-side="en">✏️</button>
          <button class="act-btn act-mic sent-mic-btn">🎤</button>
        </div>
        <div class="sent-edit-area" style="display:none">
          <textarea class="sent-edit-textarea" rows="2">${sent.en}</textarea>
          <div class="sent-edit-btns">
            <button class="sent-cancel-btn">Болих</button>
            <button class="sent-save-btn" data-side="en">💾 Хадгалах</button>
          </div>
        </div>
        <div class="sent-speech-result"></div>
      </div>
    `;
  }
}

// ── Flip анимейшн ──
function animateFlipRow(row, sent, i, showMn) {
  row.classList.add('flipping');
  setTimeout(() => {
    row.innerHTML = buildFilledRow(sent, i, showMn);
    attachRowEvents(row, sent, i, showMn);

    // Flip дарах event дахин нэмнэ
    row.addEventListener('click', e => {
      if (e.target.closest(
        'button, textarea, .sent-edit-area, .speech-stop-btn'
      )) return;
      showMn = !showMn;
      animateFlipRow(row, sent, i, showMn);
    });

    row.classList.remove('flipping');
    row.classList.add('flipped-in');
    setTimeout(() => row.classList.remove('flipped-in'), 350);
  }, 200);
}

// ── Row events ──
function attachRowEvents(row, sent, i, showMn) {
  if (!showMn) {
    // ── АНГЛИ ТАЛ ──

    // 🔊 Дуу
    const voiceBtn = row.querySelector('.sent-voice-btn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', e => {
        e.stopPropagation();
        speakText(sent.en, voiceBtn);
      });
    }

    // 🎤 Микрофон
    const micBtn = row.querySelector('.sent-mic-btn');
    if (micBtn) {
      micBtn.addEventListener('click', e => {
        e.stopPropagation();
        // resultEl — micBtn-ийн ойрхон .sent-speech-result-г хайна
        const resultEl = row.querySelector('.sent-speech-result');
        startSpeech(sent.en, resultEl, micBtn);
      });
    }

    // ✏️ Англи засах
    const editBtn = row.querySelector('.sent-edit-btn[data-side="en"]');
    if (editBtn) {
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        const area = row.querySelector('.sent-edit-area');
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
      });
    }

    // Болих
    const cancelBtn = row.querySelector('.sent-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', e => {
        e.stopPropagation();
        row.querySelector('.sent-edit-area').style.display = 'none';
      });
    }

    // 💾 Англи хадгалах
    const saveBtn = row.querySelector('.sent-save-btn[data-side="en"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', e => {
        e.stopPropagation();
        const newEn = row.querySelector('.sent-edit-textarea').value.trim();
        if (!newEn) return;
        sent.en = newEn;
        DB.saveSentence(APP.currentDay, i, sent.mn, newEn);
        renderSentences(APP.currentDay);
        showToast('✅ Англи өгүүлбэр засагдлаа', 'success');
      });
    }

  } else {
    // ── МОНГОЛ ТАЛ ──

    // ✏️ Монгол засах
    const editBtn = row.querySelector('.sent-edit-btn[data-side="mn"]');
    if (editBtn) {
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        const area = row.querySelector('.sent-edit-area');
        area.style.display = area.style.display === 'none' ? 'block' : 'none';
      });
    }

    // Болих
    const cancelBtn = row.querySelector('.sent-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', e => {
        e.stopPropagation();
        row.querySelector('.sent-edit-area').style.display = 'none';
      });
    }

    // 💾 Монгол хадгалж орчуулах
    const saveBtn = row.querySelector('.sent-save-btn[data-side="mn"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', async e => {
        e.stopPropagation();
        const newMn = row.querySelector('.sent-edit-textarea').value.trim();
        if (!newMn) return;
        showLoading(true);
        try {
          const newEn = await translateMnToEn(newMn);
          sent.mn = newMn;
          sent.en = newEn;
          DB.saveSentence(APP.currentDay, i, newMn, newEn);
          renderSentences(APP.currentDay);
          showLoading(false);
          showToast('✅ Өгүүлбэр шинэчлэгдлээ', 'success');
        } catch {
          showLoading(false);
          showToast('Орчуулга амжилтгүй', 'error');
        }
      });
    }
  }
}

function updateExamCard(day) {
  const filled   = day.sentences.filter(s => s.filled).length;
  const examCard = $('exam-card');
  const sub      = $('exam-trigger-sub');
  if (filled === 10) {
    examCard.classList.add('ready');
    sub.textContent = day.score !== null
      ? `Өмнөх оноо: ${day.score}/10 — Дахин өгөх`
      : 'Шалгалт өгөх бэлэн!';
  } else {
    examCard.classList.remove('ready');
    sub.textContent = `${filled}/10 өгүүлбэр — ${10 - filled} дутуу байна`;
  }
}

// ══════════════════════════════════════
//  MODAL — Шинэ өгүүлбэр нэмэх
// ══════════════════════════════════════
function openModal(dayIdx, sentIdx) {
  APP.currentDay     = dayIdx;
  APP.currentSentIdx = sentIdx;
  APP.isFlipped      = false;

  const day  = DB.getDay(dayIdx);
  const sent = day.sentences[sentIdx];

  $('card3d').classList.remove('flipped');
  $('speech-result').textContent      = '';
  $('speech-result').className        = 'speech-result';
  $('en-edit-wrap').style.display     = 'none';
  $('edit-mn-section').style.display  = 'none';
  $('modal-num').textContent          = `${sentIdx + 1}-р өгүүлбэр`;

  if (sent.filled) {
    $('mn-display').textContent      = sent.mn;
    $('en-sentence').textContent     = sent.en;
    $('input-section').style.display = 'none';
    $('mn-display').style.display    = 'block';
    setTimeout(() => flipCard(), 150);
  } else {
    $('mn-display').textContent      = '';
    $('mn-display').style.display    = 'none';
    $('input-section').style.display = 'flex';
    $('mn-input').value              = '';
    $('en-sentence').textContent     = '';
  }

  $('modal-overlay').style.display = 'flex';
  if (!sent.filled) setTimeout(() => $('mn-input').focus(), 400);
}

function flipCard() {
  APP.isFlipped = !APP.isFlipped;
  $('card3d').classList.toggle('flipped', APP.isFlipped);
  $('modal-tap-hint').textContent = APP.isFlipped
    ? 'Дарахад монгол харагдана'
    : 'Дарахад англи харагдана';
}

function closeModal() {
  $('modal-overlay').style.display = 'none';
  window.speechSynthesis && window.speechSynthesis.cancel();
  if (activeRecognition) {
    try { activeRecognition.stop(); } catch(e) {}
    activeRecognition = null;
  }
}

$('card3d').addEventListener('click', e => {
  if (e.target.closest('button, textarea, .act-btn')) return;
  const day  = DB.getDay(APP.currentDay);
  const sent = day.sentences[APP.currentSentIdx];
  if (sent.filled) flipCard();
});

$('modal-close').addEventListener('click', closeModal);
$('modal-overlay').addEventListener('click', e => {
  if (e.target === $('modal-overlay')) closeModal();
});

$('btn-do-translate').addEventListener('click', async () => {
  const text = $('mn-input').value.trim();
  if (!text) { showToast('Монгол өгүүлбэр бичнэ үү', 'error'); return; }
  showLoading(true);
  try {
    const en = await translateMnToEn(text);
    $('en-sentence').textContent     = en;
    $('mn-display').textContent      = text;
    $('mn-display').style.display    = 'block';
    $('input-section').style.display = 'none';
    showLoading(false);
    APP.isFlipped = false;
    $('card3d').classList.remove('flipped');
    setTimeout(() => flipCard(), 80);
  } catch {
    showLoading(false);
    showToast('Орчуулга амжилтгүй. Интернет шалгана уу.', 'error');
  }
});

$('btn-voice').addEventListener('click', e => {
  e.stopPropagation();
  speakText($('en-sentence').textContent, $('btn-voice'));
});

$('btn-en-edit').addEventListener('click', e => {
  e.stopPropagation();
  const wrap = $('en-edit-wrap');
  const show = wrap.style.display === 'none';
  wrap.style.display = show ? 'flex' : 'none';
  if (show) {
    $('en-edit-input').value = $('en-sentence').textContent;
    $('en-edit-input').focus();
  }
});

$('btn-en-edit-cancel').addEventListener('click', e => {
  e.stopPropagation();
  $('en-edit-wrap').style.display = 'none';
});

$('btn-en-edit-save').addEventListener('click', e => {
  e.stopPropagation();
  const newText = $('en-edit-input').value.trim();
  if (!newText) return;
  $('en-sentence').textContent    = newText;
  $('en-edit-wrap').style.display = 'none';
  showToast('✏️ Засагдлаа', 'success');
});

$('btn-check-speech').addEventListener('click', e => {
  e.stopPropagation();
  const text = $('en-sentence').textContent;
  if (!text) return;
  startSpeech(text, $('speech-result'), $('btn-check-speech'));
});

$('btn-save-done').addEventListener('click', e => {
  e.stopPropagation();
  const mn = $('mn-display').textContent.trim();
  const en = $('en-sentence').textContent.trim();
  if (!mn || !en) { showToast('Эхлээд орчуулна уу', 'error'); return; }
  DB.saveSentence(APP.currentDay, APP.currentSentIdx, mn, en);
  renderSentences(APP.currentDay);
  closeModal();
  showToast('✅ Хадгалагдлаа!', 'success');
});

// ══════════════════════════════════════
//  EXAM
// ══════════════════════════════════════
$('exam-card').addEventListener('click', () => {
  const day = DB.getDay(APP.currentDay);
  if (!day) return;
  if (day.sentences.filter(s => s.filled).length < 10) {
    showToast('10 өгүүлбэрийг бүгдийг бөглөнө үү', 'error');
    return;
  }
  startExam('day', APP.currentDay);
});

$('general-exam-card').addEventListener('click', () => {
  const data = DB.load();
  const all  = [];
  data.days.forEach(d => d.sentences.forEach(s => { if (s.filled) all.push(s); }));
  if (all.length < 20) { showToast('Хангалттай өгүүлбэр байхгүй', 'error'); return; }
  startExam('general', -1);
});

function startExam(type, dayIdx) {
  let questions = [];
  if (type === 'day') {
    const day = DB.getDay(dayIdx);
    questions = day.sentences
      .filter(s => s.filled)
      .sort(() => Math.random() - 0.5);
  } else {
    const data = DB.load();
    const all  = [];
    data.days.forEach(d => d.sentences.forEach(s => { if (s.filled) all.push(s); }));
    questions = all.sort(() => Math.random() - 0.5).slice(0, 20);
  }

  APP.examState    = { type, dayIndex: dayIdx, questions, currentQ: 0, answers: [], score: 0 };
  APP.examAnswered = false;

  const totalQ = type === 'general' ? 20 : 10;
  $('exam-title').textContent         = type === 'general' ? 'Ерөнхий Шалгалт' : `Day ${dayIdx + 1} — Шалгалт`;
  $('exam-tot').textContent           = totalQ;
  $('exam-result-wrap').style.display = 'none';
  $('exam-q-card').style.display      = 'block';

  renderExamQ();
  showPage('page-exam');
}

function renderExamQ() {
  const { questions, currentQ } = APP.examState;
  const q      = questions[currentQ];
  const totalQ = APP.examState.type === 'general' ? 20 : 10;

  $('exam-curr').textContent     = currentQ + 1;
  $('exam-q-mn').textContent     = q.mn;
  $('exam-ans-input').value      = '';
  $('exam-feedback').className   = 'exam-feedback';
  $('exam-feedback').textContent = '';
  $('btn-exam-next').textContent = 'Шалгах →';
  $('exam-prog-fill').style.width = `${(currentQ / totalQ) * 100}%`;

  APP.examAnswered = false;
}

$('btn-exam-next').addEventListener('click', () => {
  const { questions, currentQ, type } = APP.examState;
  const totalQ = type === 'general' ? 20 : 10;

  if (!APP.examAnswered) {
    const userAns = $('exam-ans-input').value.trim();
    if (!userAns) { showToast('Хариулт бичнэ үү', 'error'); return; }

    const q  = questions[currentQ];
    const ok = answerOk(userAns, q.en);
    APP.examState.answers.push({ mn: q.mn, en: q.en, user: userAns, ok });
    if (ok) APP.examState.score++;

    $('exam-feedback').textContent = ok
      ? `✅ Зөв! — ${q.en}`
      : `❌ Буруу! Зөв: "${q.en}"`;
    $('exam-feedback').className = `exam-feedback ${ok ? 'correct' : 'incorrect'}`;

    APP.examAnswered = true;
    $('btn-exam-next').textContent = currentQ < totalQ - 1 ? 'Дараагийн →' : 'Дүн харах ✓';
    return;
  }

  APP.examState.currentQ++;
  if (APP.examState.currentQ >= totalQ) {
    showExamResult();
  } else {
    renderExamQ();
  }
});

function showExamResult() {
  const { score, answers, type, dayIndex } = APP.examState;
  const totalQ    = type === 'general' ? 20 : 10;
  const normScore = Math.round((score / totalQ) * 10);

  if (type === 'day') DB.saveScore(dayIndex, normScore);
  else                DB.saveGeneralScore(normScore);

  $('exam-q-card').style.display      = 'none';
  $('exam-result-wrap').style.display = 'flex';
  $('exam-prog-fill').style.width     = '100%';
  $('ring-num').textContent           = normScore;

  const offset = 326.7 - (normScore / 10) * 326.7;
  setTimeout(() => {
    $('ring-progress').style.transition       = 'stroke-dashoffset 1s ease';
    $('ring-progress').style.strokeDashoffset = offset;
  }, 200);

  const msgs = [
    '💪 Дахин оролдоорой!', '💪 Дахин оролдоорой!',
    '📖 Дахин давтаарай',   '📖 Дахин давтаарай',
    '📖 Дахин давтаарай',   '👍 Дунд зэрэг!',
    '👍 Дунд зэрэг!',       '👍 Сайн байна!',
    '🎉 Маш сайн!',         '🎉 Маш сайн!',
    '🏆 Төгс!'
  ];
  $('result-msg').textContent = msgs[normScore] || '💪';

  $('result-list').innerHTML = answers.map((a, idx) => `
    <div class="ri">
      <div class="ri-mn">${idx + 1}. ${a.mn}</div>
      ${a.ok
        ? `<div class="ri-ok">✅ ${a.user}</div>`
        : `<div class="ri-bad">❌ Таны: ${a.user}</div>
           <div class="ri-ans">✔ Зөв: ${a.en}</div>`
      }
    </div>
  `).join('');
}

$('btn-finish').addEventListener('click', () => {
  const { type, dayIndex } = APP.examState;
  if (type === 'day') openDay(dayIndex);
  else renderHome();
});

// ══════════════════════════════════════
//  BACK BUTTONS
// ══════════════════════════════════════
$('btn-back').addEventListener('click', renderHome);

$('btn-back-exam').addEventListener('click', () => {
  customConfirm('Шалгалтаас гарах уу?', () => {
    const { type, dayIndex } = APP.examState;
    if (type === 'day') openDay(dayIndex);
    else renderHome();
  });
});

// ══════════════════════════════════════
//  ADD DAY
// ══════════════════════════════════════
$('btn-add-day').addEventListener('click', () => {
  const data = DB.load();
  if (data.days.length > 0) {
    const last = data.days[data.days.length - 1];
    if (last.score !== 10) {
      showToast(`Day ${last.id}-г 10/10 дуусгасны дараа нэмэгдэнэ`, 'error', 3000);
      return;
    }
  }
  const idx = DB.createDay();
  renderHome();
  setTimeout(() => openDay(idx), 250);
});

// ══════════════════════════════════════
//  VOICE PRELOAD
// ══════════════════════════════════════
if (window.speechSynthesis) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
}

// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════
function initApp() {
  initTheme();
  const data = DB.load();
  if (data.days.length === 0) DB.createDay();
  renderHome();
}

checkLicense();