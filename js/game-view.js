import {
  QuestionDeck,
  applyAnswer,
  computeAccuracy,
  computeQuestionsPerMinute,
  buildSessionQuestionSet,
  formatDurationMs,
  initialGameStats,
  randomShuffle,
} from './engine.js';

const WAVE_BASE_BY_LEVEL_MS = { 1: 2000, 2: 2800, 3: 3600 };
const WAVE_MAX_INTERVAL_MS = 4000;
const WAVE_TRANSITION_GAP_MS = 380;

const MOLE_SVG = `
<svg class="mole-face" viewBox="0 0 140 116" aria-hidden="true">
  <!-- Tai to, rõ -->
  <circle cx="35" cy="29" r="21" fill="#c2410c"/>
  <circle cx="35" cy="29" r="13" fill="#f9a8d4"/>
  <circle cx="105" cy="29" r="21" fill="#c2410c"/>
  <circle cx="105" cy="29" r="13" fill="#f9a8d4"/>

  <!-- Đầu -->
  <ellipse cx="70" cy="65" rx="51" ry="48" fill="#ea580c"/>
  <ellipse cx="70" cy="72" rx="42" ry="38" fill="#f97316" opacity=".92"/>

  <!-- Má hồng -->
  <ellipse cx="36" cy="70" rx="10" ry="6" fill="#fb7185" opacity=".78"/>
  <ellipse cx="104" cy="70" rx="10" ry="6" fill="#fb7185" opacity=".78"/>

  <!-- Mắt -->
  <ellipse cx="50" cy="55" rx="8.5" ry="10" fill="#111827"/>
  <circle cx="53" cy="51" r="3" fill="#ffffff"/>
  <ellipse cx="90" cy="55" rx="8.5" ry="10" fill="#111827"/>
  <circle cx="93" cy="51" r="3" fill="#ffffff"/>

  <!-- Mõm -->
  <ellipse cx="70" cy="75" rx="24" ry="18" fill="#fed7aa"/>
  <path d="M61 70 Q70 61 79 70 Q76 80 70 80 Q64 80 61 70Z" fill="#7c2d12"/>
  <path d="M70 80 C66 84 61 84 58 82" stroke="#7c2d12" stroke-width="3" stroke-linecap="round" fill="none"/>
  <path d="M70 80 C74 84 79 84 82 82" stroke="#7c2d12" stroke-width="3" stroke-linecap="round" fill="none"/>

  <!-- Hai răng nhỏ -->
  <path d="M65 86 L70 86 L69 97 Q67 101 64 97Z" fill="#fff" stroke="#e5e7eb" stroke-width="1"/>
  <path d="M70 86 L75 86 L76 97 Q73 101 70 97Z" fill="#fff" stroke="#e5e7eb" stroke-width="1"/>

  <!-- Râu -->
  <path d="M18 70 L45 74 M16 80 L44 80 M95 74 L122 70 M96 80 L124 80" stroke="#9a3412" stroke-width="2.4" stroke-linecap="round"/>

  <!-- Chân trước -->
  <ellipse cx="46" cy="104" rx="15" ry="8" fill="#c2410c"/>
  <ellipse cx="94" cy="104" rx="15" ry="8" fill="#c2410c"/>
</svg>`;

export function renderMath(latex, element) {
  if (!element) return;
  if (window.katex) {
    try {
      window.katex.render(latex, element, { throwOnError: false, displayMode: false });
      return;
    } catch (error) {
      console.warn('KaTeX render error:', error);
    }
  }
  element.textContent = latex;
}

export class MoleGame {
  constructor({
    root,
    questionBank,
    difficulty = 'normal',
    questionCount = 0,
    playerId = 'personal',
    sessionSeed = Date.now(),
    playerName = '',
    teamName = '',
    remainingMsProvider,
    pausedProvider = () => false,
    activeElapsedMsProvider,
    onStats = () => {},
    onFinish = () => {},
    initialStats = null,
  }) {
    if (!root) throw new Error('Thiếu phần tử root cho game.');
    this.root = root;
    this.bank = questionBank;
    this.difficulty = difficulty;
    this.questionCount = questionCount;
    this.playerId = playerId;
    this.sessionSeed = sessionSeed;
    this.playerName = playerName;
    this.teamName = teamName;
    this.remainingMsProvider = remainingMsProvider;
    this.pausedProvider = pausedProvider;
    this.activeElapsedMsProvider = activeElapsedMsProvider;
    this.onStats = onStats;
    this.onFinish = onFinish;
    this.stats = { ...initialGameStats(), ...(initialStats || {}) };
    this.stats.mistakeCounts = { ...(initialStats?.mistakeCounts || {}) };

    this.isRunning = false;
    this.isLocked = true;
    this.transitioning = false;
    this.waveMoving = false;
    this.pendingNext = false;
    this.finished = false;

    this.timerHandle = null;
    this.waveDownTimer = null;
    this.waveUpTimer = null;
    this.waveToken = 0;

    this.currentQuestion = null;
    this.currentAnswers = [];
    this.previousHoleByAnswerKey = {};
    this.questionShownAt = 0;
    this.currentCorrectHole = null;
    // Chỉ lưu cục bộ trên máy người chơi. Không gửi lịch sử câu sai lên Firebase.
    this.wrongAnswers = [];

    this.soundEnabled = true;
    this.audioCtx = null;
    this.wasPaused = false;
    this.pauseBeganAt = 0;
    this.questionPausedMs = 0;

    this.questionSet = buildSessionQuestionSet(this.bank.questions, {
      difficulty,
      questionCount,
      seed: sessionSeed,
      bankId: this.bank.id,
    });
    this.questionLimit = this.questionSet.length;
    this.deck = new QuestionDeck(this.questionSet, { seed: sessionSeed, playerId });

    // Nếu học sinh tải lại trang giữa trận, bỏ qua đúng số câu đã trả lời
    // để tiếp tục thứ tự cũ thay vì quay lại câu đầu.
    const answeredBeforeReload = Math.min(Number(this.stats.answered) || 0, this.questionLimit);
    for (let i = 0; i < answeredBeforeReload; i += 1) this.deck.next();

    this.build();
    this.refreshStatsUI();
  }

  build() {
    this.root.innerHTML = `
      <div class="game-header">
        <div class="game-title">
          <h1>🔨 ${escapeHtml(this.bank.title)}</h1>
          <p>${escapeHtml(this.playerName || 'Chơi cá nhân')}${this.teamName ? ` · ${escapeHtml(this.teamName)}` : ''}</p>
        </div>
        <div class="stat-row">
          <div class="stat-box"><span class="label">Điểm</span><span class="value mono" data-score>0</span></div>
          <div class="stat-box"><span class="label">Combo</span><span class="value mono" data-streak>0</span></div>
          <div class="stat-box timer" data-timer-box><span class="label">Thời gian</span><span class="value mono" data-timer>00:00</span></div>
        </div>
      </div>

      <div class="question-card">
        <span class="question-badge" data-question-no>CÂU 1</span>
        <div class="question-label" data-question-label>Đạo hàm của hàm số sau là:</div>
        <div class="question-math" data-question></div>
      </div>
      <div class="combo-banner" data-combo-banner></div>
      <div class="frenzy-banner hidden" data-frenzy></div>

      <div class="board">
        <div class="mole-grid" data-grid></div>
        <div class="pause-overlay hidden" data-pause>
          <div><strong>⏸ TẠM DỪNG</strong><span>Giáo viên sẽ tiếp tục trận đấu.</span></div>
        </div>
      </div>

      <div class="game-footer">
        <span class="team-pill ${this.teamName ? '' : 'hidden'}" data-team>${escapeHtml(this.teamName)}</span>
        <button class="btn btn-light" type="button" data-sound>🔊 Âm thanh</button>
        <span class="muted small">Đúng +10 · Sai -5 · 3 câu đúng liên tiếp +10 · ${this.questionLimit} câu · Chuột đổi hang 2,0–4,0 giây tùy độ khó</span>
      </div>
    `;

    this.els = {
      score: this.root.querySelector('[data-score]'),
      streak: this.root.querySelector('[data-streak]'),
      timer: this.root.querySelector('[data-timer]'),
      timerBox: this.root.querySelector('[data-timer-box]'),
      question: this.root.querySelector('[data-question]'),
      questionLabel: this.root.querySelector('[data-question-label]'),
      questionNo: this.root.querySelector('[data-question-no]'),
      comboBanner: this.root.querySelector('[data-combo-banner]'),
      frenzy: this.root.querySelector('[data-frenzy]'),
      grid: this.root.querySelector('[data-grid]'),
      pause: this.root.querySelector('[data-pause]'),
      sound: this.root.querySelector('[data-sound]'),
    };

    for (let i = 0; i < 9; i += 1) {
      const hole = document.createElement('div');
      hole.className = 'hole';
      hole.dataset.hole = String(i);
      hole.innerHTML = `
        <div class="hole-depth"></div>
        <div class="mole-wrap">
          <button class="mole" type="button" aria-label="Đáp án" data-mole data-hole="${i}">
            <span class="sign" data-sign></span>
            ${MOLE_SVG}
          </button>
        </div>
        <div class="dirt"></div>
      `;
      const mole = hole.querySelector('[data-mole]');
      mole.addEventListener('click', () => this.handleMoleClick(mole));
      this.els.grid.appendChild(hole);
    }

    // Mở AudioContext ngay ở thao tác chạm đầu tiên. Đây là cách đáng tin cậy
    // hơn trên Chrome/Safari di động vì trình duyệt chặn âm thanh tự phát.
    this.root.addEventListener('pointerdown', () => {
      this.unlockAudio().catch(() => {});
    }, { once: true, capture: true });

    this.els.sound.addEventListener('click', async () => {
      this.soundEnabled = !this.soundEnabled;
      this.els.sound.textContent = this.soundEnabled ? '🔊 Âm thanh' : '🔇 Đã tắt';
      if (this.soundEnabled) {
        await this.unlockAudio();
        this.playSound('correct');
      }
    });
  }

  start() {
    if (this.finished || this.isRunning) return;
    this.isRunning = true;
    this.isLocked = false;
    if (this.stats.answered >= this.questionLimit) {
      this.finish('questions');
      return;
    }
    this.nextQuestion();
    this.timerHandle = window.setInterval(() => this.tick(), 100);
    this.tick();
  }

  tick() {
    if (this.finished) return;
    const paused = Boolean(this.pausedProvider());
    const perfNow = performance.now();

    if (paused && !this.wasPaused) {
      this.pauseBeganAt = perfNow;
      this.stopMoleCycle();
      this.isLocked = true;
    } else if (!paused && this.wasPaused) {
      if (this.pauseBeganAt) {
        this.questionPausedMs += Math.max(0, perfNow - this.pauseBeganAt);
      }
      this.pauseBeganAt = 0;

      if (this.pendingNext && !this.finished) {
        this.pendingNext = false;
        this.nextQuestion();
      } else if (this.currentQuestion && !this.transitioning && !this.finished) {
        this.showAnswerWave();
      }
    }

    this.wasPaused = paused;
    this.els.pause.classList.toggle('hidden', !paused);
    this.isLocked = paused || this.transitioning || this.waveMoving || !this.currentQuestion;

    const remainingMs = Math.max(0, Number(this.remainingMsProvider?.()) || 0);
    this.els.timer.textContent = formatDurationMs(remainingMs);
    this.els.timerBox.classList.toggle('urgent', remainingMs <= 10000 && remainingMs > 0);

    const frenzy = remainingMs > 0 && remainingMs <= 30000;
    this.root.classList.toggle('frenzy-mode', frenzy);
    this.els.frenzy.classList.toggle('hidden', !frenzy);
    if (frenzy) {
      const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
      this.els.frenzy.textContent = seconds <= 10 ? `🔥 ${seconds}!` : `🔥 ${seconds} GIÂY CUỐI!`;
    }

    if (remainingMs <= 0) this.finish('time');
  }

  nextQuestion() {
    if (this.finished || this.pausedProvider()) return;
    this.stopMoleCycle();
    this.hideAllMoles({ clearSigns: true });

    this.currentQuestion = this.deck.next();
    this.questionShownAt = performance.now();
    this.questionPausedMs = 0;
    this.transitioning = false;
    this.pendingNext = false;
    this.waveMoving = false;
    this.previousHoleByAnswerKey = {};

    this.els.questionNo.textContent = `CÂU ${Math.min(this.stats.answered + 1, this.questionLimit)} / ${this.questionLimit}`;
    this.els.questionLabel.textContent = this.currentQuestion.instruction || this.bank.instruction || 'Chọn đáp án đúng:';
    renderMath(this.currentQuestion.prompt, this.els.question);

    const distractors = randomShuffle(this.currentQuestion.distractors).slice(0, 2);
    this.currentAnswers = [
      { key: 'answer-0', formula: this.currentQuestion.answer, correct: true },
      { key: 'answer-1', formula: distractors[0], correct: false },
      { key: 'answer-2', formula: distractors[1], correct: false },
    ];

    this.showAnswerWave();
  }

  showAnswerWave() {
    if (this.finished || this.transitioning || this.pausedProvider() || !this.currentQuestion) return;
    this.stopMoleCycle();
    this.waveMoving = true;
    this.isLocked = true;
    this.hideAllMoles({ clearSigns: true });

    const placements = this.pickNewPlacements();
    const orderedAnswers = randomShuffle(this.currentAnswers);

    orderedAnswers.forEach((answer) => {
      const holeIndex = placements[answer.key];
      const mole = this.root.querySelector(`[data-mole][data-hole="${holeIndex}"]`);
      const sign = mole.querySelector('[data-sign]');
      mole.dataset.correct = String(answer.correct);
      mole.dataset.answerKey = answer.key;
      renderMath(answer.formula, sign);
      this.previousHoleByAnswerKey[answer.key] = holeIndex;
      if (answer.correct) this.currentCorrectHole = holeIndex;

      // Hai frame để trình duyệt nhận trạng thái "ở dưới hang" trước khi trồi lên.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => mole.classList.add('up'));
      });
    });

    window.setTimeout(() => {
      if (this.finished || this.transitioning || this.pausedProvider()) return;
      this.waveMoving = false;
      this.isLocked = false;
    }, 210);

    const waveIntervalMs = this.getCurrentWaveIntervalMs();
    const waveVisibleMs = Math.max(1200, waveIntervalMs - WAVE_TRANSITION_GAP_MS);

    const token = ++this.waveToken;
    this.waveDownTimer = window.setTimeout(() => {
      if (token !== this.waveToken || this.finished || this.transitioning || this.pausedProvider()) return;
      this.waveMoving = true;
      this.isLocked = true;
      this.root.querySelectorAll('[data-mole].up').forEach((mole) => mole.classList.remove('up'));
    }, waveVisibleMs);

    this.waveUpTimer = window.setTimeout(() => {
      if (token !== this.waveToken || this.finished || this.transitioning || this.pausedProvider()) return;
      this.showAnswerWave();
    }, waveIntervalMs);
  }

  getCurrentWaveIntervalMs() {
    const level = Number(this.currentQuestion?.level) || 1;
    const baseMs = WAVE_BASE_BY_LEVEL_MS[level] || WAVE_BASE_BY_LEVEL_MS[1];

    // Công thức dài cần thêm một chút thời gian để học sinh đọc hết đáp án.
    // Chỉ xét độ dài chuỗi LaTeX của câu hỏi và 3 đáp án; không kéo dài quá 4 giây.
    const formulaLengths = [
      this.currentQuestion?.prompt || '',
      ...this.currentAnswers.map((answer) => answer.formula || ''),
    ].map((formula) => String(formula).length);
    const longestFormula = Math.max(0, ...formulaLengths);

    let extraMs = 0;
    if (longestFormula >= 40) extraMs = 400;
    else if (longestFormula >= 28) extraMs = 200;

    return Math.min(WAVE_MAX_INTERVAL_MS, baseMs + extraMs);
  }

  pickNewPlacements() {
    const available = randomShuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const placements = {};
    const used = new Set();

    randomShuffle(this.currentAnswers).forEach((answer) => {
      const previous = this.previousHoleByAnswerKey[answer.key];
      let hole = available.find((candidate) => !used.has(candidate) && candidate !== previous);
      if (hole === undefined) hole = available.find((candidate) => !used.has(candidate));
      placements[answer.key] = hole;
      used.add(hole);
    });

    return placements;
  }

  stopMoleCycle() {
    this.waveToken += 1;
    if (this.waveDownTimer) window.clearTimeout(this.waveDownTimer);
    if (this.waveUpTimer) window.clearTimeout(this.waveUpTimer);
    this.waveDownTimer = null;
    this.waveUpTimer = null;
  }

  handleMoleClick(mole) {
    if (this.finished || this.isLocked || this.pausedProvider() || !mole.classList.contains('up')) return;
    this.stopMoleCycle();
    this.isLocked = true;
    this.transitioning = true;

    // Gọi ngay trong hành động click để các trình duyệt điện thoại cho phép âm thanh.
    this.unlockAudio().catch(() => {});

    const isCorrect = mole.dataset.correct === 'true';
    const responseMs = Math.max(0, performance.now() - this.questionShownAt - this.questionPausedMs);

    // Ghi lại câu bấm sai ngay tại thời điểm trả lời để cuối trận học sinh xem lại.
    // Dữ liệu này chỉ tồn tại trên thiết bị người chơi trong trận hiện tại.
    if (!isCorrect) {
      const selectedAnswer = this.currentAnswers.find((answer) => answer.key === mole.dataset.answerKey);
      this.wrongAnswers.push({
        id: this.currentQuestion?.id || '',
        prompt: this.currentQuestion?.prompt || '',
        selected: selectedAnswer?.formula || '',
        correct: this.currentQuestion?.answer || '',
        group: this.currentQuestion?.group || '',
        responseMs,
      });
    }

    const mistakeCounts = { ...(this.stats.mistakeCounts || {}) };
    if (!isCorrect && this.currentQuestion?.id) {
      mistakeCounts[this.currentQuestion.id] = (Number(mistakeCounts[this.currentQuestion.id]) || 0) + 1;
    }

    const result = applyAnswer(this.stats, isCorrect, responseMs);
    this.stats = result.stats;
    this.stats.mistakeCounts = mistakeCounts;

    mole.classList.add('hit', isCorrect ? 'correct' : 'wrong');
    if (!isCorrect) {
      const correctMole = this.root.querySelector(`[data-mole][data-hole="${this.currentCorrectHole}"]`);
      if (correctMole) correctMole.classList.add('reveal');
    }

    this.showFloat(mole, formatDelta(result.delta), isCorrect ? 'good' : 'bad');
    this.playSound(isCorrect ? 'correct' : 'wrong');
    if (result.bonus > 0) window.setTimeout(() => this.playSound('bonus'), 170);
    this.refreshStatsUI(result.bonus);

    const activeElapsedMs = Math.max(1000, Number(this.activeElapsedMsProvider?.()) || 1000);
    const statsPayload = {
      ...this.stats,
      accuracy: computeAccuracy(this.stats),
      qpm: computeQuestionsPerMinute(this.stats.answered, activeElapsedMs),
      activeElapsedMs,
      finished: false,
    };
    this.onStats(statsPayload);

    const reachedQuestionLimit = this.stats.answered >= this.questionLimit;
    window.setTimeout(() => {
      if (this.finished) return;
      if (reachedQuestionLimit) {
        this.finish('questions');
        return;
      }
      if (this.pausedProvider()) {
        this.pendingNext = true;
        return;
      }
      this.nextQuestion();
    }, isCorrect ? 620 : 840);
  }

  refreshStatsUI(bonus = 0) {
    this.els.score.textContent = String(this.stats.score);
    this.els.streak.textContent = String(this.stats.streak);

    if (bonus > 0) {
      this.els.comboBanner.textContent = `💥 COMBO!!! +${10 + bonus} ĐIỂM`;
      this.root.classList.remove('combo-hit');
      void this.root.offsetWidth;
      this.root.classList.add('combo-hit');
      window.setTimeout(() => this.root.classList.remove('combo-hit'), 720);
      this.showComboBurst();
    } else if (this.stats.streak > 0) {
      const next = 3 - (this.stats.streak % 3 || 3);
      this.els.comboBanner.textContent = this.stats.streak % 3 === 0
        ? '🔥 Tiếp tục giữ chuỗi đúng!'
        : `Chuỗi đúng ${this.stats.streak} · Còn ${next} câu để nhận thưởng`;
    } else {
      this.els.comboBanner.textContent = '';
    }
  }

  showComboBurst() {
    const board = this.root.querySelector('.board');
    if (!board) return;
    const burst = document.createElement('div');
    burst.className = 'combo-burst';
    burst.innerHTML = '<strong>💥 COMBO!</strong><span>+10 BONUS</span>';
    board.appendChild(burst);
    window.setTimeout(() => burst.remove(), 760);
  }

  hideAllMoles({ clearSigns = false } = {}) {
    this.root.querySelectorAll('[data-mole]').forEach((mole) => {
      mole.classList.remove('up', 'hit', 'correct', 'wrong', 'reveal');
      mole.dataset.correct = 'false';
      mole.dataset.answerKey = '';
      if (clearSigns) {
        const sign = mole.querySelector('[data-sign]');
        if (sign) sign.textContent = '';
      }
    });
    this.currentCorrectHole = null;
  }

  showFloat(mole, text, type) {
    const hole = mole.closest('.hole');
    const note = document.createElement('div');
    note.className = `float-score ${type}`;
    note.textContent = text;
    hole.appendChild(note);
    window.setTimeout(() => note.remove(), 820);
  }

  finish(reason = 'external') {
    if (this.finished) return;
    this.finished = true;
    this.isRunning = false;
    this.isLocked = true;
    this.stopMoleCycle();
    if (this.timerHandle) window.clearInterval(this.timerHandle);
    this.timerHandle = null;
    this.hideAllMoles({ clearSigns: true });
    this.root.classList.remove('frenzy-mode', 'combo-hit');
    this.els.frenzy?.classList.add('hidden');

    const activeElapsedMs = Math.max(1000, Number(this.activeElapsedMsProvider?.()) || 1000);
    const finalStats = {
      ...this.stats,
      accuracy: computeAccuracy(this.stats),
      qpm: computeQuestionsPerMinute(this.stats.answered, activeElapsedMs),
      activeElapsedMs,
      finished: true,
      reason,
      // Sao chép mảng để màn hình kết quả chỉ đọc dữ liệu, không sửa trạng thái game.
      wrongAnswers: this.wrongAnswers.map((item) => ({ ...item })),
    };
    this.onStats(finalStats);
    this.onFinish(finalStats);
  }

  async unlockAudio() {
    if (!this.soundEnabled) return null;
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      try { await this.audioCtx.resume(); } catch { /* bỏ qua */ }
    }
    return this.audioCtx;
  }

  async playSound(type) {
    if (!this.soundEnabled) return;
    try {
      const ctx = await this.unlockAudio();
      if (!ctx || ctx.state !== 'running') return;

      const now = ctx.currentTime + 0.004;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.52, now);
      master.connect(ctx.destination);

      const chirp = (start, fromHz, peakHz, toHz, duration, volume) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(fromHz, start);
        osc.frequency.exponentialRampToValueAtTime(peakHz, start + duration * 0.32);
        osc.frequency.exponentialRampToValueAtTime(toHz, start + duration);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1900, start);
        filter.Q.setValueAtTime(1.25, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.009);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + duration + 0.03);
      };

      // "Chít-chít": hai tiếng cao, rất ngắn, đủ lớn cho loa điện thoại.
      if (type === 'bonus') {
        chirp(now, 1250, 2600, 1800, 0.105, 0.48);
        chirp(now + 0.09, 1500, 3200, 2100, 0.11, 0.46);
        chirp(now + 0.18, 1800, 3600, 2400, 0.12, 0.44);
      } else if (type === 'correct') {
        chirp(now, 1250, 2550, 1580, 0.105, 0.52);
        chirp(now + 0.112, 1420, 2920, 1740, 0.112, 0.48);
      } else {
        chirp(now, 980, 1960, 1160, 0.11, 0.50);
        chirp(now + 0.118, 900, 1700, 1040, 0.118, 0.44);
      }

      // Phản hồi rung nhẹ trên thiết bị có hỗ trợ; không ảnh hưởng nếu không hỗ trợ.
      if (navigator.vibrate) navigator.vibrate(type === 'bonus' ? [28, 30, 28] : type === 'correct' ? 24 : [18, 20, 18]);

      window.setTimeout(() => {
        try { master.disconnect(); } catch { /* bỏ qua */ }
      }, 450);
    } catch (error) {
      console.warn('Không phát được âm thanh:', error);
    }
  }
}

function formatDelta(delta) {
  const value = Number(delta) || 0;
  return value >= 0 ? `+${value}` : String(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
