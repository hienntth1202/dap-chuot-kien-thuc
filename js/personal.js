import { MoleGame, renderMath } from './game-view.js';
import { buildMultiTopicQuestionBank } from './question-banks.js';

const params = new URLSearchParams(window.location.search);
const topicIds = (params.get('topics') || params.get('topic') || 'derivative_basic').split(',').filter(Boolean);
const difficulty = params.get('difficulty') || 'normal';
const durationSec = Math.max(30, Math.min(600, Number(params.get('duration')) || 120));
const questionCount = Math.max(0, Number(params.get('questions')) || 0);
let bank = null;

let startedAt = Date.now();
let game = null;

function remainingMs() {
  return Math.max(0, durationSec * 1000 - (Date.now() - startedAt));
}

function activeElapsedMs() {
  return Math.min(durationSec * 1000, Date.now() - startedAt);
}

function launch() {
  startedAt = Date.now();
  const sessionSeed = Date.now();
  bank = buildMultiTopicQuestionBank(topicIds, { difficulty, questionCount, seed: sessionSeed });
  document.getElementById('resultModal').classList.add('hidden');
  game = new MoleGame({
    root: document.getElementById('gameRoot'),
    questionBank: bank,
    difficulty,
    questionCount: bank.questions.length,
    playerId: `personal-${crypto.randomUUID()}`,
    sessionSeed,
    playerName: 'Chơi cá nhân',
    remainingMsProvider: remainingMs,
    activeElapsedMsProvider: activeElapsedMs,
    pausedProvider: () => false,
    onFinish: showResult,
  });
  game.start();
}

function showResult(stats) {
  document.getElementById('resultScore').textContent = `${stats.score} điểm`;
  document.getElementById('resultCorrect').textContent = String(stats.correct);
  document.getElementById('resultAccuracy').textContent = `${Math.round(stats.accuracy)}%`;
  document.getElementById('resultQpm').textContent = stats.qpm.toFixed(1);
  document.getElementById('resultCombo').textContent = `Bạn đã nhận ${stats.comboBonuses} lần thưởng combo.`;
  renderWrongAnswers(stats.wrongAnswers || [], Number(stats.wrong) || 0);
  document.getElementById('resultModal').classList.remove('hidden');
}

function renderWrongAnswers(items, wrongCount = 0) {
  const review = document.getElementById('wrongReview');
  const summary = document.getElementById('wrongReviewSummary');
  const list = document.getElementById('wrongReviewList');
  const noWrong = document.getElementById('noWrongNotice');

  list.innerHTML = '';
  const wrongItems = Array.isArray(items) ? items : [];
  if (!wrongItems.length) {
    review.classList.add('hidden');
    review.open = false;
    noWrong.classList.remove('hidden');
    noWrong.classList.toggle('notice-success', wrongCount === 0);
    noWrong.classList.toggle('notice-warning', wrongCount > 0);
    noWrong.textContent = wrongCount > 0
      ? `Bạn có ${wrongCount} câu sai nhưng lịch sử chi tiết không còn trên thiết bị này.`
      : '🎉 Tuyệt vời! Bạn không bấm sai câu nào trong trận này.';
    return;
  }

  noWrong.classList.add('hidden');
  review.classList.remove('hidden');
  review.open = false;
  summary.textContent = `📚 Xem lại ${wrongItems.length} câu đã bấm sai`;

  wrongItems.forEach((item, index) => {
    list.appendChild(createWrongReviewItem(item, index));
  });
}

function createWrongReviewItem(item, index) {
  const card = document.createElement('article');
  card.className = 'wrong-review-item';

  const head = document.createElement('div');
  head.className = 'wrong-review-head';
  const title = document.createElement('strong');
  title.textContent = `Câu sai ${index + 1}`;
  head.appendChild(title);
  if (item.group) {
    const group = document.createElement('span');
    group.className = 'tag';
    group.textContent = item.group;
    head.appendChild(group);
  }
  card.appendChild(head);

  const promptBox = makeReviewMathRow('Câu hỏi', item.prompt, 'question');
  const selectedBox = makeReviewMathRow('Bạn đã chọn', item.selected, 'bad');
  const correctBox = makeReviewMathRow('Đáp án đúng', item.correct, 'good');
  card.append(promptBox, selectedBox, correctBox);
  return card;
}

function makeReviewMathRow(label, latex, type) {
  const row = document.createElement('div');
  row.className = `wrong-review-row ${type}`;
  const labelEl = document.createElement('span');
  labelEl.className = 'wrong-review-label';
  labelEl.textContent = label;
  const mathEl = document.createElement('span');
  mathEl.className = 'wrong-review-math';
  renderMath(latex || '—', mathEl);
  row.append(labelEl, mathEl);
  return row;
}

document.getElementById('playAgain').addEventListener('click', launch);
launch();
