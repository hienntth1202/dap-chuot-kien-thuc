import {
  listQuestionBanks,
  countAvailableQuestions,
  findQuestionById,
} from './question-banks.js';
import {
  aggregateTeamScores,
  createBalancedTeams,
  formatDurationMs,
  normalizeRoomCode,
  speedLabel,
  teamDisplayName,
  teamShortName,
} from './engine.js';
import { renderMath } from './game-view.js';
import {
  assignTeams,
  createRoom,
  endRoom,
  getApproxServerNow,
  getRoom,
  initFirebase,
  isClassroomAvailable,
  listenPlayers,
  listenRoomMeta,
  pauseRoom,
  resumeRoom,
  startRoom,
} from './firebase-service.js';

const PRESET_KEY = 'math-mole-teacher-presets-v1';
const banks = listQuestionBanks();
const bankMap = new Map(banks.map((bank) => [bank.id, bank]));

const els = {
  createPanel: byId('createPanel'), createRoomForm: byId('createRoomForm'), createRoomBtn: byId('createRoomBtn'), createMessage: byId('createMessage'),
  topicChecklist: byId('topicChecklist'), selectAllTopics: byId('selectAllTopics'), clearTopics: byId('clearTopics'),
  difficulty: byId('difficulty'), durationSec: byId('durationSec'), questionCount: byId('questionCount'), questionCountHint: byId('questionCountHint'), teamCount: byId('teamCount'),
  presetSelect: byId('presetSelect'), loadPreset: byId('loadPreset'), deletePreset: byId('deletePreset'), presetName: byId('presetName'), savePreset: byId('savePreset'),
  dashboard: byId('dashboard'), roomCodeText: byId('roomCodeText'), roomTitle: byId('roomTitle'), roomMetaTags: byId('roomMetaTags'), qrCode: byId('qrCode'),
  copyJoinLink: byId('copyJoinLink'), randomTeams: byId('randomTeams'), startGame: byId('startGame'), pauseGame: byId('pauseGame'), resumeGame: byId('resumeGame'), endGame: byId('endGame'),
  playAgain: byId('playAgain'), playAgainRandom: byId('playAgainRandom'), toggleScores: byId('toggleScores'), teacherMessage: byId('teacherMessage'), teacherTimer: byId('teacherTimer'),
  teamList: byId('teamList'), teamEvent: byId('teamEvent'), studentCount: byId('studentCount'), playerTableBody: byId('playerTableBody'), scoreArea: byId('scoreArea'),
  classInsights: byId('classInsights'), topMistakes: byId('topMistakes'),
  backgroundMusicFile: byId('backgroundMusicFile'), musicToggle: byId('musicToggle'), musicVolume: byId('musicVolume'), musicName: byId('musicName'),
  teacherCountdown: byId('teacherCountdown'), teacherCountdownText: byId('teacherCountdownText'),
  winnerModal: byId('winnerModal'), winnerRevealCount: byId('winnerRevealCount'), winnerContent: byId('winnerContent'), winnerName: byId('winnerName'), winnerScore: byId('winnerScore'), winnerPodium: byId('winnerPodium'), winnerMistakes: byId('winnerMistakes'), closeWinner: byId('closeWinner'),
};

let roomCode = null;
let currentMeta = null;
let players = {};
let playersInitialized = false;
let previousTeamTotals = {};
let unsubMeta = null;
let unsubPlayers = null;
let timerHandle = null;
let countdownHandle = null;
let autoEndTriggered = false;
let backgroundAudio = null;
let backgroundMusicUrl = null;
let musicManualPaused = false;
let scoreboardHidden = false;
let lastWinnerSession = null;
let lastCountdownNumber = null;
let lastFrenzySecond = null;
let teacherAudioCtx = null;

populateTopics();
loadPresetList();
refreshQuestionCountOptions();

els.topicChecklist.addEventListener('change', refreshQuestionCountOptions);
els.difficulty.addEventListener('change', refreshQuestionCountOptions);
els.selectAllTopics.addEventListener('click', () => { setAllTopics(true); refreshQuestionCountOptions(); });
els.clearTopics.addEventListener('click', () => { setAllTopics(false); ensureAtLeastOneTopic(); refreshQuestionCountOptions(); });
els.savePreset.addEventListener('click', saveCurrentPreset);
els.loadPreset.addEventListener('click', applySelectedPreset);
els.deletePreset.addEventListener('click', deleteSelectedPreset);

if (!isClassroomAvailable()) {
  showCreateError('Chế độ lớp chưa được cấu hình Firebase. Hãy điền cấu hình trong js/config.js trước.');
  els.createRoomBtn.disabled = true;
} else {
  try {
    initFirebase();
    const queryRoom = normalizeRoomCode(new URLSearchParams(location.search).get('room'));
    if (queryRoom.length === 6) restoreRoom(queryRoom);
  } catch (error) {
    showCreateError(error.message);
    els.createRoomBtn.disabled = true;
  }
}

els.createRoomForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearCreateMessage();
  const topicIds = selectedTopicIds();
  if (!topicIds.length) return showCreateError('Hãy chọn ít nhất 1 chủ đề.');
  els.createRoomBtn.disabled = true;
  try {
    const code = await createRoom({
      topicIds,
      topicId: topicIds[0],
      difficulty: els.difficulty.value,
      durationSec: Number(els.durationSec.value),
      questionCount: Number(els.questionCount.value),
      teamCount: Number(els.teamCount.value),
    });
    attachRoom(code);
    const url = new URL(window.location.href);
    url.searchParams.set('room', code);
    history.replaceState(null, '', url);
  } catch (error) {
    showCreateError(error.message || 'Không tạo được phòng.');
  } finally {
    els.createRoomBtn.disabled = false;
  }
});

els.copyJoinLink.addEventListener('click', async () => {
  if (!roomCode) return;
  const joinUrl = makeJoinUrl(roomCode);
  try {
    await navigator.clipboard.writeText(joinUrl.href);
    showTeacherMessage('Đã copy link học sinh.', 'success');
  } catch {
    window.prompt('Copy link này gửi cho học sinh:', joinUrl.href);
  }
});

els.randomTeams.addEventListener('click', () => randomizeTeams(false));
els.startGame.addEventListener('click', () => beginRound(false));
els.playAgain.addEventListener('click', () => beginRound(false));
els.playAgainRandom.addEventListener('click', () => beginRound(true));

els.pauseGame.addEventListener('click', async () => {
  if (!roomCode) return;
  try {
    await pauseRoom(roomCode);
    if (backgroundAudio && !backgroundAudio.paused) backgroundAudio.pause();
    updateMusicButton();
  } catch (error) { showTeacherMessage(error.message, 'error'); }
});

els.resumeGame.addEventListener('click', async () => {
  if (!roomCode) return;
  try {
    await resumeRoom(roomCode);
    if (!musicManualPaused) await playBackgroundMusic();
  } catch (error) { showTeacherMessage(error.message, 'error'); }
});

els.endGame.addEventListener('click', async () => {
  if (!roomCode) return;
  try {
    await endRoom(roomCode);
    stopBackgroundMusic({ reset: true });
  } catch (error) { showTeacherMessage(error.message, 'error'); }
});

els.toggleScores.addEventListener('click', () => {
  scoreboardHidden = !scoreboardHidden;
  els.toggleScores.textContent = scoreboardHidden ? '👁 Hiện bảng điểm' : '🙈 Ẩn bảng điểm';
  els.scoreArea.classList.toggle('scores-hidden', scoreboardHidden);
  renderTeams();
  renderPlayers();
});

els.closeWinner.addEventListener('click', () => els.winnerModal.classList.add('hidden'));

setupMusicControls();

async function beginRound(reshuffleTeams) {
  if (!roomCode) return;
  const ids = Object.keys(players || {});
  if (!ids.length) return showTeacherMessage('Chưa có học sinh trong phòng.', 'error');
  try {
    await ensureTeacherAudio();
    if (reshuffleTeams) {
      const teamCount = Math.min(Number(currentMeta?.teamCount) || 2, ids.length);
      const assignments = createBalancedTeams(ids, teamCount, `${Date.now()}:${Math.random()}`);
      await assignTeams(roomCode, assignments, teamCount);
    }
    els.winnerModal.classList.add('hidden');
    autoEndTriggered = false;
    lastWinnerSession = null;
    await startRoom(roomCode);
    musicManualPaused = false;
    await playBackgroundMusic();
    showTeacherMessage('Chuẩn bị 3–2–1… trận đấu sắp bắt đầu!', 'success');
  } catch (error) {
    showTeacherMessage(error.message || 'Không thể bắt đầu.', 'error');
  }
}

async function randomizeTeams(silent = false) {
  if (!roomCode || !currentMeta) return;
  const ids = Object.keys(players);
  if (ids.length < 2) {
    if (!silent) showTeacherMessage('Cần ít nhất 2 học sinh để chia nhóm.', 'error');
    return;
  }
  const teamCount = Math.min(Number(currentMeta.teamCount) || 2, ids.length);
  const assignments = createBalancedTeams(ids, teamCount, `${Date.now()}:${Math.random()}`);
  try {
    await assignTeams(roomCode, assignments, teamCount);
    if (!silent) showTeacherMessage(`Đã chia ngẫu nhiên ${ids.length} học sinh vào ${teamCount} đội.`, 'success');
  } catch (error) {
    if (!silent) showTeacherMessage(error.message || 'Không chia được nhóm.', 'error');
  }
}

async function restoreRoom(code) {
  try {
    const room = await getRoom(code);
    if (!room?.meta) return showCreateError('Không tìm thấy phòng trong đường dẫn này.');
    attachRoom(code);
  } catch (error) { showCreateError(error.message); }
}

function attachRoom(code) {
  roomCode = code;
  autoEndTriggered = false;
  playersInitialized = false;
  previousTeamTotals = {};
  els.createPanel.classList.add('hidden');
  els.dashboard.classList.remove('hidden');
  els.roomCodeText.textContent = code;
  renderQr(code);

  unsubMeta?.(); unsubPlayers?.();
  if (timerHandle) clearInterval(timerHandle);
  if (countdownHandle) clearInterval(countdownHandle);

  unsubMeta = listenRoomMeta(code, (meta) => {
    const previousStatus = currentMeta?.status;
    const previousSession = currentMeta?.sessionSeed;
    currentMeta = meta;
    renderRoomMeta();
    renderControls();
    renderTeams();
    scheduleTeacherCountdown();

    if (meta?.status === 'ended') {
      stopBackgroundMusic({ reset: true });
      document.body.classList.remove('teacher-frenzy');
      renderClassInsights();
      if (previousStatus !== 'ended' || previousSession !== meta.sessionSeed) {
        // Chờ một nhịp ngắn để nhận nốt cập nhật điểm cuối từ các máy học sinh.
        window.setTimeout(() => { renderClassInsights(); showWinnerReveal(); }, 420);
      }
    } else {
      els.classInsights.classList.add('hidden');
    }
  }, (error) => showTeacherMessage(error.message, 'error'));

  unsubPlayers = listenPlayers(code, (value) => {
    const nextPlayers = value || {};
    detectComboEvents(players, nextPlayers);
    players = nextPlayers;
    renderPlayers();
    renderTeams();
    renderControls();
    if (currentMeta?.status === 'ended') renderClassInsights();
    maybeAutoEndWhenAllFinished();
    playersInitialized = true;
  }, (error) => showTeacherMessage(error.message, 'error'));

  timerHandle = setInterval(updateTimer, 150);
  updateTimer();
}

function renderRoomMeta() {
  if (!currentMeta) return;
  const ids = metaTopicIds();
  const titles = ids.map((id) => bankMap.get(id)?.title).filter(Boolean);
  els.roomTitle.textContent = titles.length <= 2 ? titles.join(' + ') : `Ôn tập ${titles.length} chủ đề`;
  els.roomMetaTags.innerHTML = `
    <span class="tag">${difficultyLabel(currentMeta.difficulty)}</span>
    <span class="tag">📚 ${titles.length} chủ đề</span>
    <span class="tag">⏱ ${Math.round((Number(currentMeta.durationSec) || 120) / 60)} phút</span>
    <span class="tag">📝 ${Number(currentMeta.questionCount) || 0} câu</span>
    <span class="tag">👥 ${Number(currentMeta.teamCount) || 2} đội</span>
    <span class="tag">${statusLabel(currentMeta.status)}</span>`;
}

function renderControls() {
  const status = currentMeta?.status || 'lobby';
  const values = Object.values(players || {});
  const allGrouped = values.length > 0 && values.every((player) => player.teamId);
  els.randomTeams.disabled = status !== 'lobby' || values.length < 2;
  els.startGame.disabled = status !== 'lobby' || !allGrouped;
  els.randomTeams.classList.toggle('hidden', status !== 'lobby');
  els.startGame.classList.toggle('hidden', status !== 'lobby');
  els.pauseGame.classList.toggle('hidden', status !== 'playing' || isBeforeScheduledStart());
  els.resumeGame.classList.toggle('hidden', status !== 'paused');
  els.endGame.classList.toggle('hidden', !['playing', 'paused'].includes(status));
  els.playAgain.classList.toggle('hidden', status !== 'ended');
  els.playAgainRandom.classList.toggle('hidden', status !== 'ended');
}

function renderPlayers() {
  const values = Object.entries(players || {}).map(([id, player]) => ({ id, ...player }));
  values.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0) || String(a.name).localeCompare(String(b.name), 'vi'));
  els.studentCount.textContent = `${values.length} học sinh`;
  if (!values.length) {
    els.playerTableBody.innerHTML = '<tr><td colspan="7" class="empty">Chưa có học sinh vào phòng.</td></tr>';
    return;
  }
  els.playerTableBody.innerHTML = values.map((player) => {
    const answered = Number(player.answered) || 0;
    const correct = Number(player.correct) || 0;
    const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
    const avg = Number(player.avgResponseMs) || 0;
    const qpm = Number(player.qpm) || 0;
    return `<tr>
      <td><span class="status-dot ${player.connected ? 'on' : ''}"></span>${escapeHtml(player.name || 'Học sinh')}</td>
      <td>${player.teamId ? teamDisplayName(player.teamId) : '—'}</td>
      <td class="score-sensitive"><strong>${scoreboardHidden ? '???' : Number(player.score) || 0}</strong></td>
      <td>${correct}/${answered}</td><td>${accuracy}%</td>
      <td title="${escapeHtml(speedLabel(avg))}">${avg ? `${(avg / 1000).toFixed(2)}s` : '—'}</td>
      <td>${qpm ? qpm.toFixed(1) : '—'}</td></tr>`;
  }).join('');
}

function renderTeams() {
  if (!currentMeta) return;
  const count = Number(currentMeta.teamCount) || 2;
  const totals = aggregateTeamScores(players);
  const teamData = [];
  for (let i = 1; i <= count; i += 1) {
    const id = `team-${i}`;
    teamData.push({ id, ...(totals[id] || { score: 0, members: 0, answered: 0, correct: 0 }) });
  }
  if (scoreboardHidden) teamData.sort((a, b) => a.id.localeCompare(b.id));
  else teamData.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const maxScore = Math.max(1, ...teamData.map((team) => team.score));

  els.teamList.innerHTML = teamData.map((team, index) => {
    const accuracy = team.answered ? Math.round((team.correct / team.answered) * 100) : 0;
    const width = scoreboardHidden ? 50 : Math.max(3, Math.round((team.score / maxScore) * 100));
    const prior = Number(previousTeamTotals[team.id]?.score) || 0;
    const bumped = playersInitialized && team.score > prior;
    return `<div class="team-card team-${team.id.split('-')[1]} ${bumped ? 'energy-bump' : ''}">
      <div class="team-card-top"><strong>${!scoreboardHidden && index === 0 && team.score > 0 ? '🏆 ' : ''}${teamDisplayName(team.id)}</strong><span class="team-score score-sensitive">${scoreboardHidden ? '???' : team.score}</span></div>
      <div class="muted small">${team.members} thành viên · ${accuracy}% chính xác</div>
      <div class="team-progress score-sensitive ${scoreboardHidden ? 'concealed' : ''}"><span style="width:${width}%"></span></div>
    </div>`;
  }).join('');
  previousTeamTotals = totals;
}

function detectComboEvents(oldPlayers, newPlayers) {
  if (!playersInitialized) return;
  for (const [playerId, player] of Object.entries(newPlayers || {})) {
    const before = Number(oldPlayers?.[playerId]?.comboBonuses) || 0;
    const after = Number(player.comboBonuses) || 0;
    if (after > before && player.teamId) {
      showTeamEvent(`🔥 ${teamShortName(player.teamId).toUpperCase()} COMBO! +10`, player.teamId);
      break;
    }
  }
}

function showTeamEvent(text, teamId) {
  els.teamEvent.textContent = text;
  els.teamEvent.className = `team-event team-${String(teamId).split('-')[1] || '1'}`;
  void els.teamEvent.offsetWidth;
  els.teamEvent.classList.add('show');
  window.setTimeout(() => els.teamEvent.classList.remove('show'), 1200);
}

function maybeAutoEndWhenAllFinished() {
  if (!roomCode || currentMeta?.status !== 'playing' || autoEndTriggered || isBeforeScheduledStart()) return;
  const values = Object.values(players || {});
  if (!values.length || !values.every((player) => Boolean(player.finished))) return;
  autoEndTriggered = true;
  stopBackgroundMusic({ reset: true });
  endRoom(roomCode).catch((error) => {
    autoEndTriggered = false;
    showTeacherMessage(error.message || 'Không thể tự kết thúc phòng.', 'error');
  });
}

function updateTimer() {
  if (!currentMeta) { els.teacherTimer.textContent = '--:--'; return; }
  const remaining = getRoomRemainingMs(currentMeta);
  els.teacherTimer.textContent = formatDurationMs(remaining);

  const playingStarted = currentMeta.status === 'playing' && !isBeforeScheduledStart();
  const frenzy = playingStarted && remaining > 0 && remaining <= 30000;
  document.body.classList.toggle('teacher-frenzy', frenzy);
  if (backgroundAudio) backgroundAudio.playbackRate = frenzy ? (remaining <= 10000 ? 1.12 : 1.06) : 1;

  if (frenzy) {
    const sec = Math.ceil(remaining / 1000);
    if (sec <= 10 && sec !== lastFrenzySecond) {
      lastFrenzySecond = sec;
      playTeacherBeep(sec === 1 ? 980 : 720, 0.055);
    }
  } else lastFrenzySecond = null;

  if (remaining <= 0 && currentMeta.status === 'playing' && !autoEndTriggered && !isBeforeScheduledStart()) {
    autoEndTriggered = true;
    stopBackgroundMusic({ reset: true });
    playTeacherBeep(1080, 0.18);
    endRoom(roomCode).catch((error) => {
      autoEndTriggered = false;
      showTeacherMessage(error.message, 'error');
    });
  }
}

function getRoomRemainingMs(meta) {
  const durationMs = Math.max(1, Number(meta.durationSec) || 120) * 1000;
  const startedAt = Number(meta.startedAt);
  if (!startedAt) return durationMs;
  const pausedTotalMs = Number(meta.pausedTotalMs) || 0;
  let referenceNow = getApproxServerNow();
  if (meta.status === 'paused' && Number(meta.pauseStartedAt)) referenceNow = Number(meta.pauseStartedAt);
  const elapsed = Math.max(0, referenceNow - startedAt - pausedTotalMs);
  return Math.max(0, durationMs - elapsed);
}

function isBeforeScheduledStart() {
  return currentMeta?.status === 'playing' && Number(currentMeta.startedAt) > getApproxServerNow();
}

function scheduleTeacherCountdown() {
  if (countdownHandle) { clearInterval(countdownHandle); countdownHandle = null; }
  if (!isBeforeScheduledStart()) { els.teacherCountdown.classList.add('hidden'); return; }
  lastCountdownNumber = null;
  els.teacherCountdown.classList.remove('hidden');
  const tick = () => {
    const ms = Number(currentMeta?.startedAt) - getApproxServerNow();
    if (ms <= 0) {
      els.teacherCountdownText.textContent = 'CHIẾN!';
      if (lastCountdownNumber !== 0) { lastCountdownNumber = 0; playTeacherBeep(1040, 0.12); }
      clearInterval(countdownHandle); countdownHandle = null;
      window.setTimeout(() => els.teacherCountdown.classList.add('hidden'), 520);
      renderControls();
      return;
    }
    const n = Math.min(3, Math.max(1, Math.ceil(ms / 1000)));
    els.teacherCountdownText.textContent = String(n);
    if (n !== lastCountdownNumber) { lastCountdownNumber = n; playTeacherBeep(560 + (3 - n) * 90, 0.07); }
  };
  tick(); countdownHandle = setInterval(tick, 60);
}

function renderClassInsights() {
  const top = getTopMistakes(3);
  if (!top.length) { els.classInsights.classList.add('hidden'); return; }
  els.classInsights.classList.remove('hidden');
  renderMistakeItems(els.topMistakes, top);
}

function getTopMistakes(limit = 3) {
  const counts = {};
  Object.values(players || {}).forEach((player) => {
    Object.entries(player.mistakeCounts || {}).forEach(([id, count]) => {
      counts[id] = (counts[id] || 0) + (Number(count) || 0);
    });
  });
  return Object.entries(counts)
    .map(([id, count]) => ({ id, count, question: findQuestionById(id) }))
    .filter((item) => item.question && item.count > 0)
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function renderMistakeItems(container, items) {
  container.innerHTML = '';
  if (!items.length) { container.innerHTML = '<div class="notice notice-success">🎉 Không có câu sai nổi bật.</div>'; return; }
  items.forEach((item, index) => {
    const row = document.createElement('div'); row.className = 'mistake-item';
    const left = document.createElement('div'); left.innerHTML = `<strong>#${index + 1} · ${escapeHtml(item.question.sourceTitle || '')}</strong><div class="mistake-math"></div>`;
    renderMath(item.question.prompt, left.querySelector('.mistake-math'));
    const count = document.createElement('span'); count.className = 'mistake-count'; count.textContent = `${item.count} lần sai`;
    row.append(left, count); container.appendChild(row);
  });
}

function showWinnerReveal() {
  if (!currentMeta?.sessionSeed || lastWinnerSession === currentMeta.sessionSeed) return;
  lastWinnerSession = currentMeta.sessionSeed;
  const totals = aggregateTeamScores(players);
  const ranking = Object.entries(totals).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  if (!ranking.length) return;
  els.winnerModal.classList.remove('hidden');
  els.winnerContent.classList.add('hidden');
  els.winnerRevealCount.classList.remove('hidden');
  let n = 3;
  els.winnerRevealCount.textContent = '3';
  const interval = setInterval(() => {
    n -= 1;
    if (n > 0) { els.winnerRevealCount.textContent = String(n); playTeacherBeep(620 + (3 - n) * 100, 0.08); return; }
    clearInterval(interval);
    els.winnerRevealCount.classList.add('hidden');
    els.winnerContent.classList.remove('hidden');
    playTeacherBeep(1120, 0.22);
    const winner = ranking[0];
    els.winnerName.textContent = teamDisplayName(winner.id);
    els.winnerScore.textContent = `${winner.score} điểm`;
    els.winnerPodium.innerHTML = ranking.slice(0, 3).map((team, index) => `<div class="podium-row place-${index + 1}"><span>${['🥇','🥈','🥉'][index] || '•'} ${teamDisplayName(team.id)}</span><strong>${team.score}</strong></div>`).join('');
    renderMistakeItems(els.winnerMistakes, getTopMistakes(3));
  }, 650);
}

function populateTopics() {
  banks.forEach((bank, index) => {
    const label = document.createElement('label');
    label.className = 'topic-option';
    label.innerHTML = `<input type="checkbox" value="${bank.id}" ${index === 0 ? 'checked' : ''}><span><strong>${bank.title}</strong><small>${bank.questions.length} câu</small></span>`;
    els.topicChecklist.appendChild(label);
  });
}

function selectedTopicIds() { return [...els.topicChecklist.querySelectorAll('input:checked')].map((input) => input.value); }
function setAllTopics(checked) { els.topicChecklist.querySelectorAll('input').forEach((input) => { input.checked = checked; }); }
function ensureAtLeastOneTopic() { if (!selectedTopicIds().length) els.topicChecklist.querySelector('input').checked = true; }
function metaTopicIds() { return Array.isArray(currentMeta?.topicIds) && currentMeta.topicIds.length ? currentMeta.topicIds : [currentMeta?.topicId || 'derivative_basic']; }

function refreshQuestionCountOptions(preferredValue = null) {
  ensureAtLeastOneTopic();
  const ids = selectedTopicIds();
  const available = countAvailableQuestions(ids, els.difficulty.value);
  const previous = preferredValue ?? Number(els.questionCount.value) || 0;
  const standard = [5, 10, 15, 20, 25, 30, 40, 50].filter((count) => count < available);
  const options = [...standard, available].filter((value, index, arr) => value >= 3 && arr.indexOf(value) === index);
  els.questionCount.innerHTML = '';
  options.forEach((count) => {
    const option = document.createElement('option'); option.value = String(count); option.textContent = count === available ? `Tất cả (${available} câu)` : `${count} câu`; els.questionCount.appendChild(option);
  });
  const preferred = options.includes(Number(previous)) ? Number(previous) : (options.includes(15) ? 15 : options[0]);
  els.questionCount.value = String(preferred);
  els.questionCountHint.textContent = `${ids.length} chủ đề · ${available} câu phù hợp. Hệ thống sẽ chia số câu tương đối đều giữa các chủ đề.`;
}

function readPresets() { try { return JSON.parse(localStorage.getItem(PRESET_KEY) || '{}'); } catch { return {}; } }
function writePresets(data) { localStorage.setItem(PRESET_KEY, JSON.stringify(data)); }
function loadPresetList() {
  const data = readPresets(); const current = els.presetSelect.value;
  els.presetSelect.innerHTML = '<option value="">— Chưa chọn preset —</option>';
  Object.keys(data).sort((a,b) => a.localeCompare(b,'vi')).forEach((name) => { const o=document.createElement('option'); o.value=name; o.textContent=name; els.presetSelect.appendChild(o); });
  if (data[current]) els.presetSelect.value = current;
}
function saveCurrentPreset() {
  const name = String(els.presetName.value || '').trim();
  if (name.length < 2) return showCreateError('Hãy nhập tên preset trước khi lưu.');
  const data = readPresets();
  data[name] = { topicIds: selectedTopicIds(), difficulty: els.difficulty.value, durationSec: els.durationSec.value, questionCount: els.questionCount.value, teamCount: els.teamCount.value };
  writePresets(data); loadPresetList(); els.presetSelect.value = name; showCreateSuccess(`Đã lưu preset “${name}” trên máy này.`);
}
function applySelectedPreset() {
  const preset = readPresets()[els.presetSelect.value]; if (!preset) return;
  const set = new Set(preset.topicIds || []); els.topicChecklist.querySelectorAll('input').forEach((i) => { i.checked = set.has(i.value); }); ensureAtLeastOneTopic();
  els.difficulty.value = preset.difficulty || 'normal'; els.durationSec.value = preset.durationSec || '120'; els.teamCount.value = preset.teamCount || '4'; refreshQuestionCountOptions(Number(preset.questionCount) || 0); showCreateSuccess(`Đã tải preset “${els.presetSelect.value}”.`);
}
function deleteSelectedPreset() {
  const name = els.presetSelect.value; if (!name) return;
  const data = readPresets(); delete data[name]; writePresets(data); loadPresetList(); showCreateSuccess(`Đã xóa preset “${name}”.`);
}

function renderQr(code) {
  const url = makeJoinUrl(code).href; els.qrCode.innerHTML = '';
  if (window.QRCode) new window.QRCode(els.qrCode, { text: url, width: 164, height: 164, colorDark: '#111827', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
  else els.qrCode.innerHTML = `<div class="qr-fallback">QR chưa tải được.<br><small>${escapeHtml(url)}</small></div>`;
}
function makeJoinUrl(code) { const url = new URL('./student.html', window.location.href); url.searchParams.set('room', code); return url; }

function setupMusicControls() {
  els.backgroundMusicFile?.addEventListener('change', () => {
    const file = els.backgroundMusicFile.files?.[0]; stopBackgroundMusic({ reset: true }); if (backgroundMusicUrl) URL.revokeObjectURL(backgroundMusicUrl); backgroundMusicUrl = null; backgroundAudio = null;
    if (!file) { els.musicToggle.disabled = true; els.musicName.textContent = 'Chưa chọn nhạc. File chỉ phát trên máy giáo viên, không tải lên Firebase.'; return; }
    if (!file.type.startsWith('audio/')) { els.backgroundMusicFile.value=''; els.musicToggle.disabled=true; els.musicName.textContent='File không phải định dạng âm thanh.'; return; }
    backgroundMusicUrl=URL.createObjectURL(file); backgroundAudio=new Audio(backgroundMusicUrl); backgroundAudio.loop=true; backgroundAudio.preload='auto'; backgroundAudio.volume=Number(els.musicVolume.value||28)/100; musicManualPaused=false; els.musicToggle.disabled=false; updateMusicButton(); els.musicName.textContent=`${file.name} · phát lặp trên máy giáo viên.`;
  });
  els.musicVolume?.addEventListener('input', () => { if (backgroundAudio) backgroundAudio.volume=Number(els.musicVolume.value||0)/100; });
  els.musicToggle?.addEventListener('click', async () => { if (!backgroundAudio) return; if (backgroundAudio.paused) { musicManualPaused=false; await playBackgroundMusic(); } else { musicManualPaused=true; backgroundAudio.pause(); updateMusicButton(); } });
}
async function playBackgroundMusic() { if (!backgroundAudio) return; try { backgroundAudio.volume=Number(els.musicVolume?.value||28)/100; await backgroundAudio.play(); updateMusicButton(); } catch { showTeacherMessage('Trình duyệt chưa cho phép phát nhạc. Hãy bấm “Phát nhạc” một lần.', 'error'); } }
function stopBackgroundMusic({reset=false}={}) { if (!backgroundAudio) return; backgroundAudio.pause(); backgroundAudio.playbackRate=1; if(reset){try{backgroundAudio.currentTime=0;}catch{}} updateMusicButton(); }
function updateMusicButton(){ if(!backgroundAudio){els.musicToggle.disabled=true;els.musicToggle.textContent='▶ Nghe thử';return;} els.musicToggle.disabled=false;els.musicToggle.textContent=backgroundAudio.paused?'▶ Phát nhạc':'⏸ Dừng nhạc'; }

async function ensureTeacherAudio(){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return null; if(!teacherAudioCtx) teacherAudioCtx=new AC(); if(teacherAudioCtx.state==='suspended') try{await teacherAudioCtx.resume();}catch{} return teacherAudioCtx; }
async function playTeacherBeep(freq=700,duration=.07){ try{const ctx=await ensureTeacherAudio(); if(!ctx||ctx.state!=='running')return; const now=ctx.currentTime; const o=ctx.createOscillator(); const g=ctx.createGain(); o.type='sine';o.frequency.setValueAtTime(freq,now);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.16,now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+duration+.02);}catch{} }

function difficultyLabel(value){ if(value==='basic')return'🙂 Cơ bản'; if(value==='challenge')return'🔥 Thử thách'; return'😎 Bình thường'; }
function statusLabel(value){ if(value==='playing')return isBeforeScheduledStart()?'⏳ Đếm ngược':'🟢 Đang chơi'; if(value==='paused')return'⏸ Tạm dừng'; if(value==='ended')return'🏁 Đã kết thúc'; return'🟡 Phòng chờ'; }
function showCreateError(message){ els.createMessage.innerHTML=`<div class="notice notice-error">${escapeHtml(message)}</div>`; }
function showCreateSuccess(message){ els.createMessage.innerHTML=`<div class="notice notice-success">${escapeHtml(message)}</div>`; setTimeout(()=>{els.createMessage.innerHTML='';},3000); }
function clearCreateMessage(){els.createMessage.innerHTML='';}
function showTeacherMessage(message,type='success'){const cls=type==='error'?'notice-error':'notice-success';els.teacherMessage.innerHTML=`<div class="notice ${cls}">${escapeHtml(message)}</div>`;setTimeout(()=>{els.teacherMessage.innerHTML='';},3500);}
function escapeHtml(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
function byId(id){return document.getElementById(id);}

window.addEventListener('beforeunload',()=>{if(backgroundMusicUrl)URL.revokeObjectURL(backgroundMusicUrl);if(countdownHandle)clearInterval(countdownHandle);});
