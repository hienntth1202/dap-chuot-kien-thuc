import { MoleGame, renderMath } from './game-view.js';
import { buildMultiTopicQuestionBank, listQuestionBanks } from './question-banks.js';
import { normalizeRoomCode, teamDisplayName, teamShortName } from './engine.js';
import {
  getApproxServerNow, initFirebase, isClassroomAvailable, joinRoom,
  listenPlayer, listenPlayers, listenRoomMeta, updatePlayerStats,
} from './firebase-service.js';

const bankMap = new Map(listQuestionBanks().map((bank) => [bank.id, bank]));
const els = Object.fromEntries([
  'joinScreen','joinForm','roomCode','studentName','joinMessage','lobbyScreen','lobbyRoomCode','lobbyTitle','lobbySubtitle','lobbyMeta','lobbyPlayers','teamNotice','gameScreen','gameRoot',
  'studentResultModal','studentResultScore','studentResultCorrect','studentResultAccuracy','studentResultSpeed','studentResultTeam','studentWrongReview','studentWrongReviewSummary','studentWrongReviewList','studentNoWrongNotice',
  'studentCountdown','studentCountdownText','teamReveal','teamRevealCard','teamRevealName',
].map((id) => [id, document.getElementById(id)]));

let roomCode = null, playerId = null, playerName = '';
let currentMeta = null, currentPlayer = null, players = {};
let game = null, unsubMeta = null, unsubPlayers = null, unsubPlayer = null;
let hasShownResult = false, activeSessionSeed = null, countdownHandle = null, shownGroupVersion = null, teamRevealTimer = null;

const initialRoom = normalizeRoomCode(new URLSearchParams(location.search).get('room'));
if (initialRoom) els.roomCode.value = initialRoom;

if (!isClassroomAvailable()) {
  showJoinError('Chế độ lớp chưa được cấu hình Firebase. Giáo viên cần thiết lập file js/config.js.');
  els.joinForm.querySelector('button[type="submit"]').disabled = true;
} else {
  try { initFirebase(); } catch (error) { showJoinError(error.message); }
}

els.joinForm.addEventListener('submit', async (event) => {
  event.preventDefault(); clearJoinMessage();
  const code = normalizeRoomCode(els.roomCode.value), name = els.studentName.value.trim();
  try {
    const result = await joinRoom(code, name);
    roomCode=result.roomCode; playerId=result.playerId; playerName=name; currentMeta=result.meta; currentPlayer=result.player;
    attachRoomListeners(); showLobby(); renderLobby();
  } catch (error) { showJoinError(error.message || 'Không thể vào phòng.'); }
});

function attachRoomListeners() {
  unsubMeta?.(); unsubPlayers?.(); unsubPlayer?.();
  unsubMeta = listenRoomMeta(roomCode, (meta) => {
    currentMeta = meta;
    if (!meta) return showJoinError('Phòng đã bị xóa hoặc không còn tồn tại.');
    maybeShowTeamReveal(); handleRoomState();
  }, (error) => showJoinError(error.message));
  unsubPlayers = listenPlayers(roomCode, (value) => { players=value||{}; renderLobbyPlayers(); });
  unsubPlayer = listenPlayer(roomCode, playerId, (value) => { currentPlayer=value; renderTeamNotice(); maybeShowTeamReveal(); });
}

function handleRoomState() {
  renderLobby();
  const status=currentMeta?.status;
  const session=Number(currentMeta?.sessionSeed)||null;

  if (status==='lobby') { clearCountdown(); if(!game)showLobby(); return; }

  if (status==='playing' && Number(currentMeta?.startedAt)) {
    if (session && activeSessionSeed !== session) resetForNewRound(session);
    const waitMs=Number(currentMeta.startedAt)-getApproxServerNow();
    if (waitMs>0) { showLobby(); runCountdown(); return; }
    clearCountdown();
    if (!game) startGroupGame();
    showGame(); return;
  }

  if (status==='paused') {
    clearCountdown();
    if (game) showGame(); else showLobby();
    return;
  }

  if (status==='ended') {
    clearCountdown();
    if(game&&!game.finished)game.finish('room-ended');
    if(!hasShownResult&&currentPlayer)showResult(buildResultFromPlayer(currentPlayer));
  }
}

function resetForNewRound(sessionSeed) {
  if (game && !game.finished) game.finish('new-round');
  game=null; activeSessionSeed=sessionSeed; hasShownResult=false;
  els.gameRoot.innerHTML=''; els.studentResultModal.classList.add('hidden');
  els.studentWrongReviewList.innerHTML=''; els.studentWrongReview.classList.add('hidden'); els.studentNoWrongNotice.classList.add('hidden');
}

function startGroupGame() {
  const topicIds=metaTopicIds();
  const bank=buildMultiTopicQuestionBank(topicIds,{difficulty:currentMeta.difficulty||'normal',questionCount:Number(currentMeta.questionCount)||0,seed:currentMeta.sessionSeed||roomCode});
  const initialStats=currentPlayer?{
    score:Number(currentPlayer.score)||0,correct:Number(currentPlayer.correct)||0,wrong:Number(currentPlayer.wrong)||0,answered:Number(currentPlayer.answered)||0,streak:Number(currentPlayer.streak)||0,comboBonuses:Number(currentPlayer.comboBonuses)||0,
    avgResponseMs:Number(currentPlayer.avgResponseMs)||0,totalResponseMs:(Number(currentPlayer.avgResponseMs)||0)*(Number(currentPlayer.answered)||0),mistakeCounts:currentPlayer.mistakeCounts||{},
  }:null;
  game=new MoleGame({
    root:els.gameRoot,questionBank:bank,difficulty:currentMeta.difficulty||'normal',questionCount:bank.questions.length,playerId,sessionSeed:currentMeta.sessionSeed||roomCode,playerName,
    teamName:teamDisplayName(players?.[playerId]?.teamId||currentPlayer?.teamId),remainingMsProvider:getRoomRemainingMs,activeElapsedMsProvider:getActiveElapsedMs,pausedProvider:()=>currentMeta?.status==='paused',initialStats,
    onStats:async(stats)=>{try{await updatePlayerStats(roomCode,playerId,stats);}catch(error){console.warn('Không cập nhật được điểm:',error);}},
    onFinish:(stats)=>showResult(stats),
  });
  game.start();
}

function runCountdown() {
  if (countdownHandle) return;
  els.studentCountdown.classList.remove('hidden');
  const tick=()=>{
    const ms=Number(currentMeta?.startedAt)-getApproxServerNow();
    if(ms<=0){els.studentCountdownText.textContent='CHIẾN!';clearInterval(countdownHandle);countdownHandle=null;setTimeout(()=>{els.studentCountdown.classList.add('hidden');handleRoomState();},480);return;}
    els.studentCountdownText.textContent=String(Math.min(3,Math.max(1,Math.ceil(ms/1000))));
  };
  tick(); countdownHandle=setInterval(tick,60);
}
function clearCountdown(){if(countdownHandle){clearInterval(countdownHandle);countdownHandle=null;}els.studentCountdown.classList.add('hidden');}

function getRoomRemainingMs(){if(!currentMeta)return 0;const durationMs=Math.max(1,Number(currentMeta.durationSec)||120)*1000;const startedAt=Number(currentMeta.startedAt);if(!startedAt)return durationMs;const pausedTotalMs=Number(currentMeta.pausedTotalMs)||0;let now=getApproxServerNow();if(currentMeta.status==='paused'&&Number(currentMeta.pauseStartedAt))now=Number(currentMeta.pauseStartedAt);const elapsed=Math.max(0,now-startedAt-pausedTotalMs);return Math.max(0,durationMs-elapsed);}
function getActiveElapsedMs(){const durationMs=Math.max(1,Number(currentMeta?.durationSec)||120)*1000;return Math.max(0,Math.min(durationMs,durationMs-getRoomRemainingMs()));}

function showLobby(){els.joinScreen.classList.add('hidden');els.gameScreen.classList.add('hidden');els.lobbyScreen.classList.remove('hidden');}
function showGame(){els.joinScreen.classList.add('hidden');els.lobbyScreen.classList.add('hidden');els.gameScreen.classList.remove('hidden');}

function renderLobby(){
  if(!roomCode||!currentMeta)return; const ids=metaTopicIds();const titles=ids.map((id)=>bankMap.get(id)?.title).filter(Boolean);
  els.lobbyRoomCode.textContent=roomCode;
  els.lobbyTitle.textContent=currentMeta.status==='paused'?'Trận đấu đang tạm dừng':currentMeta.status==='ended'?'Vòng chơi đã kết thúc':'Đang chờ giáo viên bắt đầu...';
  els.lobbySubtitle.textContent=titles.length<=2?titles.join(' + '):`Ôn tập ${titles.length} chủ đề`;
  els.lobbyMeta.innerHTML=`<span class="tag">⏱ ${Math.round((Number(currentMeta.durationSec)||120)/60)} phút</span><span class="tag">📝 ${Number(currentMeta.questionCount)||0} câu</span><span class="tag">📚 ${ids.length} chủ đề</span><span class="tag">👥 ${Number(currentMeta.teamCount)||2} đội</span><span class="tag">🔥 3 đúng +10</span>`;
  renderTeamNotice();renderLobbyPlayers();
}
function renderLobbyPlayers(){if(!els.lobbyPlayers)return;const values=Object.values(players||{});els.lobbyPlayers.innerHTML=values.length?values.map((p)=>`<span class="player-chip">${escapeHtml(p.name||'Học sinh')}</span>`).join(''):'<span class="muted">Đang chờ các bạn khác vào phòng...</span>';}
function renderTeamNotice(){const teamId=currentPlayer?.teamId;if(!teamId){els.teamNotice.classList.add('hidden');return;}els.teamNotice.textContent=`Bạn thuộc ${teamDisplayName(teamId)}.`;els.teamNotice.classList.remove('hidden');}

function maybeShowTeamReveal(){
  const version=Number(currentMeta?.groupVersion)||0, teamId=currentPlayer?.teamId;
  if(!version||!teamId||shownGroupVersion===version)return; shownGroupVersion=version;
  if(teamRevealTimer)clearTimeout(teamRevealTimer);
  els.teamRevealName.textContent=teamDisplayName(teamId).toUpperCase();
  els.teamRevealCard.className=`team-reveal-card team-${String(teamId).split('-')[1]||'1'}`;
  els.teamReveal.classList.remove('hidden');
  teamRevealTimer=setTimeout(()=>els.teamReveal.classList.add('hidden'),2300);
}

function buildResultFromPlayer(player){const answered=Number(player.answered)||0,correct=Number(player.correct)||0;return{score:Number(player.score)||0,correct,answered,accuracy:answered?(correct/answered)*100:0,qpm:Number(player.qpm)||0,comboBonuses:Number(player.comboBonuses)||0,wrong:Number(player.wrong)||0};}
function showResult(stats){if(hasShownResult)return;hasShownResult=true;els.studentResultScore.textContent=`${Math.round(Number(stats.score)||0)} điểm`;els.studentResultCorrect.textContent=String(Number(stats.correct)||0);els.studentResultAccuracy.textContent=`${Math.round(Number(stats.accuracy)||0)}%`;els.studentResultSpeed.textContent=(Number(stats.qpm)||0).toFixed(1);els.studentResultTeam.textContent=currentPlayer?.teamId?`${teamDisplayName(currentPlayer.teamId)} · ${Number(stats.comboBonuses)||0} lần nhận thưởng combo.`:`${Number(stats.comboBonuses)||0} lần nhận thưởng combo.`;renderWrongAnswers(stats.wrongAnswers||[],Number(stats.wrong)||0);els.studentResultModal.classList.remove('hidden');}

function renderWrongAnswers(items,wrongCount=0){const wrongItems=Array.isArray(items)?items:[];els.studentWrongReviewList.innerHTML='';if(!wrongItems.length){els.studentWrongReview.classList.add('hidden');els.studentWrongReview.open=false;els.studentNoWrongNotice.classList.remove('hidden');els.studentNoWrongNotice.classList.toggle('notice-success',wrongCount===0);els.studentNoWrongNotice.classList.toggle('notice-warning',wrongCount>0);els.studentNoWrongNotice.textContent=wrongCount>0?`Bạn có ${wrongCount} câu sai nhưng lịch sử chi tiết không còn trên thiết bị này (ví dụ sau khi tải lại trang).`:'🎉 Tuyệt vời! Bạn không bấm sai câu nào trong trận này.';return;}els.studentNoWrongNotice.classList.add('hidden');els.studentWrongReview.classList.remove('hidden');els.studentWrongReview.open=false;els.studentWrongReviewSummary.textContent=`📚 Xem lại ${wrongItems.length} câu đã bấm sai`;wrongItems.forEach((item,index)=>els.studentWrongReviewList.appendChild(createWrongReviewItem(item,index)));}
function createWrongReviewItem(item,index){const card=document.createElement('article');card.className='wrong-review-item';const head=document.createElement('div');head.className='wrong-review-head';const title=document.createElement('strong');title.textContent=`Câu sai ${index+1}`;head.appendChild(title);if(item.group){const group=document.createElement('span');group.className='tag';group.textContent=item.group;head.appendChild(group);}card.appendChild(head);card.append(makeReviewMathRow('Câu hỏi',item.prompt,'question'),makeReviewMathRow('Bạn đã chọn',item.selected,'bad'),makeReviewMathRow('Đáp án đúng',item.correct,'good'));return card;}
function makeReviewMathRow(label,latex,type){const row=document.createElement('div');row.className=`wrong-review-row ${type}`;const l=document.createElement('span');l.className='wrong-review-label';l.textContent=label;const m=document.createElement('span');m.className='wrong-review-math';renderMath(latex||'—',m);row.append(l,m);return row;}

function metaTopicIds(){return Array.isArray(currentMeta?.topicIds)&&currentMeta.topicIds.length?currentMeta.topicIds:[currentMeta?.topicId||'derivative_basic'];}
function showJoinError(message){els.joinMessage.innerHTML=`<div class="notice notice-error">${escapeHtml(message)}</div>`;}
function clearJoinMessage(){els.joinMessage.innerHTML='';}
function escapeHtml(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
