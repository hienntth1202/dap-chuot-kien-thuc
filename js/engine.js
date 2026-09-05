export const SCORE_RULES = Object.freeze({
  CORRECT: 10,
  WRONG: -5,
  COMBO_EVERY: 3,
  COMBO_BONUS: 10,
  MIN_SCORE: 0,
});

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizeName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 40);
}

export function normalizeRoomCode(code) {
  return String(code || '').replace(/\D/g, '').slice(0, 6);
}

export function hashString(input) {
  let h = 2166136261;
  const text = String(input ?? '');
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(items, seedInput) {
  const result = [...items];
  const random = mulberry32(hashString(seedInput));
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function randomShuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function difficultyToMaxLevel(difficulty) {
  if (difficulty === 'basic') return 1;
  if (difficulty === 'challenge') return 3;
  return 2;
}

export function filterQuestionsByDifficulty(questions, difficulty = 'normal') {
  const maxLevel = difficultyToMaxLevel(difficulty);
  return (questions || []).filter((question) => question.enabled !== false && Number(question.level || 1) <= maxLevel);
}


export function normalizeQuestionCount(questionCount, availableCount) {
  const available = Math.max(0, Number(availableCount) || 0);
  if (!available) return 0;
  const requested = Number(questionCount);
  if (!Number.isFinite(requested) || requested <= 0) return available;
  return Math.max(1, Math.min(Math.floor(requested), available));
}

export function buildSessionQuestionSet(questions, {
  difficulty = 'normal',
  questionCount = 0,
  seed = 'session',
  bankId = 'bank',
} = {}) {
  const filtered = filterQuestionsByDifficulty(questions, difficulty);
  const count = normalizeQuestionCount(questionCount, filtered.length);
  if (count < 3) {
    throw new Error('Bộ câu hỏi sau khi lọc cần ít nhất 3 câu.');
  }
  return seededShuffle(filtered, `question-set:${bankId}:${difficulty}:${seed}`).slice(0, count);
}

export class QuestionDeck {
  constructor(questions, { seed = 'deck', playerId = 'player' } = {}) {
    if (!Array.isArray(questions) || questions.length < 3) {
      throw new Error('Bộ câu hỏi cần ít nhất 3 câu để game hoạt động ổn định.');
    }
    this.questions = [...questions];
    this.seed = String(seed);
    this.playerId = String(playerId);
    this.cycle = 0;
    this.index = 0;
    this.deck = [];
    this.rebuild();
  }

  rebuild() {
    this.deck = seededShuffle(
      this.questions,
      `${this.seed}:${this.playerId}:cycle:${this.cycle}`,
    );
    this.index = 0;
    this.cycle += 1;
  }

  next() {
    if (this.index >= this.deck.length) this.rebuild();
    const question = this.deck[this.index];
    this.index += 1;
    return question;
  }
}

export function initialGameStats() {
  return {
    score: 0,
    correct: 0,
    wrong: 0,
    answered: 0,
    streak: 0,
    comboBonuses: 0,
    totalResponseMs: 0,
    avgResponseMs: 0,
    lastDelta: 0,
    lastWasBonus: false,
    mistakeCounts: {},
  };
}

export function applyAnswer(previousStats, isCorrect, responseMs) {
  const stats = { ...initialGameStats(), ...previousStats };
  const safeResponseMs = Math.max(0, Number(responseMs) || 0);
  let delta = 0;
  let bonus = 0;

  stats.answered += 1;
  stats.totalResponseMs += safeResponseMs;
  stats.avgResponseMs = stats.totalResponseMs / stats.answered;
  stats.lastWasBonus = false;

  if (isCorrect) {
    stats.correct += 1;
    stats.streak += 1;
    delta += SCORE_RULES.CORRECT;

    if (stats.streak % SCORE_RULES.COMBO_EVERY === 0) {
      bonus = SCORE_RULES.COMBO_BONUS;
      delta += bonus;
      stats.comboBonuses += 1;
      stats.lastWasBonus = true;
    }
  } else {
    stats.wrong += 1;
    stats.streak = 0;
    delta += SCORE_RULES.WRONG;
  }

  stats.score = Math.max(SCORE_RULES.MIN_SCORE, stats.score + delta);
  stats.lastDelta = delta;

  return { stats, delta, bonus };
}

export function computeAccuracy(stats) {
  if (!stats?.answered) return 0;
  return (stats.correct / stats.answered) * 100;
}

export function computeQuestionsPerMinute(answered, activeElapsedMs) {
  const elapsedMinutes = Math.max(Number(activeElapsedMs) || 0, 1000) / 60000;
  return Number(answered || 0) / elapsedMinutes;
}

export function formatDurationMs(ms) {
  const safe = Math.max(0, Number(ms) || 0);
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function speedLabel(avgResponseMs) {
  const value = Number(avgResponseMs) || 0;
  if (!value) return 'Chưa có dữ liệu';
  if (value <= 1800) return 'Rất nhanh';
  if (value <= 3000) return 'Nhanh';
  if (value <= 5000) return 'Vừa';
  return 'Chậm';
}

export function createBalancedTeams(playerIds, teamCount, seed = Date.now()) {
  const ids = [...playerIds];
  const count = clamp(Number(teamCount) || 2, 2, Math.max(2, ids.length || 2));
  const shuffled = seededShuffle(ids, `teams:${seed}`);
  const assignments = {};

  shuffled.forEach((playerId, index) => {
    assignments[playerId] = `team-${(index % count) + 1}`;
  });

  return assignments;
}

export const TEAM_NAMES = Object.freeze(['Mèo Mướp', 'Mèo tam thể', 'Mèo Vàng', 'Mèo Ba Tư', 'Mèo chân ngắn', 'Mèo Xiêm']);

export function teamDisplayName(teamId) {
  const match = String(teamId || '').match(/(\d+)$/);
  if (!match) return 'Chưa chia đội';
  const index = Math.max(0, Number(match[1]) - 1);
  return TEAM_NAMES[index] || `Đội ${match[1]}`;
}

export function teamShortName(teamId) {
  const match = String(teamId || '').match(/(\d+)$/);
  if (!match) return '—';
  const index = Math.max(0, Number(match[1]) - 1);
  return TEAM_NAMES[index] || `Đội ${match[1]}`;
}

export function aggregateTeamScores(players = {}) {
  const totals = {};
  Object.values(players || {}).forEach((player) => {
    const teamId = player?.teamId;
    if (!teamId) return;
    if (!totals[teamId]) {
      totals[teamId] = { score: 0, members: 0, answered: 0, correct: 0 };
    }
    totals[teamId].score += Number(player.score) || 0;
    totals[teamId].members += 1;
    totals[teamId].answered += Number(player.answered) || 0;
    totals[teamId].correct += Number(player.correct) || 0;
  });
  return totals;
}
