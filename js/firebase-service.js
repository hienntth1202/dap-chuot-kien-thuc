import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {
  getDatabase,
  ref,
  set,
  update,
  get,
  onValue,
  onDisconnect,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { firebaseConfig, hasFirebaseConfig } from './config.js';
import { normalizeName, normalizeRoomCode } from './engine.js';

let app = null;
let db = null;
let auth = null;
let serverOffsetMs = 0;
let offsetUnsubscribe = null;

export function isClassroomAvailable() {
  return hasFirebaseConfig();
}

export function initFirebase() {
  if (!hasFirebaseConfig()) {
    throw new Error('Firebase chưa được cấu hình. Hãy sửa file js/config.js trước khi dùng chế độ lớp.');
  }

  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    const offsetRef = ref(db, '.info/serverTimeOffset');
    offsetUnsubscribe = onValue(offsetRef, (snapshot) => {
      serverOffsetMs = Number(snapshot.val()) || 0;
    });
  }
  return db;
}


export function listenTeacherAuth(callback) {
  initFirebase();
  return onAuthStateChanged(auth, callback);
}

export async function signInTeacherWithGoogle() {
  initFirebase();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutTeacher() {
  initFirebase();
  await signOut(auth);
}

export async function getTeacherAccess(user) {
  initFirebase();
  if (!user?.uid) return { approved: false, uid: null };
  try {
    const snapshot = await get(ref(db, `teachers/${user.uid}`));
    return { approved: snapshot.val() === true, uid: user.uid };
  } catch (error) {
    return { approved: false, uid: user.uid, error };
  }
}

export function getApproxServerNow() {
  return Date.now() + serverOffsetMs;
}

export async function createRoom({ topicId, topicIds, difficulty, durationSec, questionCount, teamCount }) {
  initFirebase();
  const roomCode = await generateUniqueRoomCode();
  const roomRef = ref(db, `rooms/${roomCode}`);

  const selectedTopicIds = Array.isArray(topicIds) && topicIds.length ? topicIds : [topicId].filter(Boolean);

  await set(roomRef, {
    meta: {
      status: 'lobby',
      topicId: selectedTopicIds[0] || topicId,
      topicIds: selectedTopicIds,
      difficulty,
      durationSec: Number(durationSec),
      questionCount: Number(questionCount),
      teamCount: Number(teamCount),
      createdAt: serverTimestamp(),
      startedAt: null,
      endedAt: null,
      pauseStartedAt: null,
      pausedTotalMs: 0,
      sessionSeed: null,
      groupVersion: 0,
      roundNumber: 0,
    },
    players: {},
  });

  return roomCode;
}

async function generateUniqueRoomCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const snapshot = await get(ref(db, `rooms/${code}/meta`));
    if (!snapshot.exists()) return code;
  }
  throw new Error('Không thể tạo mã phòng mới. Hãy thử lại.');
}

export async function getRoom(roomCode) {
  initFirebase();
  const code = normalizeRoomCode(roomCode);
  if (code.length !== 6) return null;
  const snapshot = await get(ref(db, `rooms/${code}`));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function joinRoom(roomCode, rawName) {
  initFirebase();
  const code = normalizeRoomCode(roomCode);
  const name = normalizeName(rawName);
  if (code.length !== 6) throw new Error('Mã phòng phải có 6 chữ số.');
  if (name.length < 2) throw new Error('Hãy nhập tên học sinh.');

  const room = await getRoom(code);
  if (!room?.meta) throw new Error('Không tìm thấy phòng này.');
  if (room.meta.status === 'ended') throw new Error('Phòng này đã kết thúc.');

  const storageKey = `math-mole-player:${code}`;
  let playerId = localStorage.getItem(storageKey);
  const isReturningPlayer = Boolean(playerId && room.players?.[playerId]);
  if (room.meta.status !== 'lobby' && !isReturningPlayer) {
    throw new Error('Trận đấu đã bắt đầu. Học sinh mới không thể vào phòng lúc này.');
  }
  if (!playerId) {
    playerId = crypto.randomUUID();
    localStorage.setItem(storageKey, playerId);
  }

  const playerRef = ref(db, `rooms/${code}/players/${playerId}`);
  const currentSnapshot = await get(playerRef);
  const current = currentSnapshot.exists() ? currentSnapshot.val() : {};

  const playerData = {
    name,
    teamId: current.teamId || null,
    score: Number(current.score) || 0,
    correct: Number(current.correct) || 0,
    wrong: Number(current.wrong) || 0,
    answered: Number(current.answered) || 0,
    avgResponseMs: Number(current.avgResponseMs) || 0,
    qpm: Number(current.qpm) || 0,
    streak: Number(current.streak) || 0,
    comboBonuses: Number(current.comboBonuses) || 0,
    mistakeCounts: current.mistakeCounts || {},
    connected: true,
    finished: Boolean(current.finished),
    joinedAt: current.joinedAt || serverTimestamp(),
    lastSeen: serverTimestamp(),
  };

  await set(playerRef, playerData);
  await onDisconnect(playerRef).update({ connected: false, lastSeen: serverTimestamp() });

  return { roomCode: code, playerId, player: playerData, meta: room.meta };
}

export function listenRoomMeta(roomCode, callback, onError) {
  initFirebase();
  const code = normalizeRoomCode(roomCode);
  return onValue(ref(db, `rooms/${code}/meta`), (snapshot) => {
    callback(snapshot.val());
  }, onError);
}

export function listenPlayers(roomCode, callback, onError) {
  initFirebase();
  const code = normalizeRoomCode(roomCode);
  return onValue(ref(db, `rooms/${code}/players`), (snapshot) => {
    callback(snapshot.val() || {});
  }, onError);
}

export function listenPlayer(roomCode, playerId, callback, onError) {
  initFirebase();
  const code = normalizeRoomCode(roomCode);
  return onValue(ref(db, `rooms/${code}/players/${playerId}`), (snapshot) => {
    callback(snapshot.val());
  }, onError);
}

export async function assignTeams(roomCode, assignments, teamCount) {
  initFirebase();
  const code = normalizeRoomCode(roomCode);
  const updates = {};
  Object.entries(assignments).forEach(([playerId, teamId]) => {
    updates[`rooms/${code}/players/${playerId}/teamId`] = teamId;
  });
  updates[`rooms/${code}/meta/teamCount`] = Number(teamCount);
  updates[`rooms/${code}/meta/groupVersion`] = Date.now();
  await update(ref(db), updates);
}

export async function startRoom(roomCode) {
  initFirebase();
  const code = normalizeRoomCode(roomCode);
  const room = await getRoom(code);
  if (!room?.meta) throw new Error('Không tìm thấy phòng.');

  const players = room.players || {};
  if (Object.keys(players).length === 0) throw new Error('Phòng chưa có học sinh.');
  if (Object.values(players).some((player) => !player.teamId)) {
    throw new Error('Hãy chia nhóm cho tất cả học sinh trước khi bắt đầu.');
  }

  const countdownLeadMs = 4000;
  const scheduledStartAt = getApproxServerNow() + countdownLeadMs;
  const updates = {
    [`rooms/${code}/meta/status`]: 'playing',
    [`rooms/${code}/meta/startedAt`]: scheduledStartAt,
    [`rooms/${code}/meta/endedAt`]: null,
    [`rooms/${code}/meta/pauseStartedAt`]: null,
    [`rooms/${code}/meta/pausedTotalMs`]: 0,
    [`rooms/${code}/meta/sessionSeed`]: Math.floor(Math.random() * 2147483647),
    [`rooms/${code}/meta/roundNumber`]: (Number(room.meta.roundNumber) || 0) + 1,
  };

  Object.keys(players).forEach((playerId) => {
    const base = `rooms/${code}/players/${playerId}`;
    updates[`${base}/score`] = 0;
    updates[`${base}/correct`] = 0;
    updates[`${base}/wrong`] = 0;
    updates[`${base}/answered`] = 0;
    updates[`${base}/avgResponseMs`] = 0;
    updates[`${base}/qpm`] = 0;
    updates[`${base}/streak`] = 0;
    updates[`${base}/comboBonuses`] = 0;
    updates[`${base}/mistakeCounts`] = null;
    updates[`${base}/finished`] = false;
    updates[`${base}/lastSeen`] = serverTimestamp();
  });

  await update(ref(db), updates);
}

export async function pauseRoom(roomCode) {
  initFirebase();
  const code = normalizeRoomCode(roomCode);
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'paused',
    pauseStartedAt: serverTimestamp(),
  });
}

export async function resumeRoom(roomCode) {
  initFirebase();
  const code = normalizeRoomCode(roomCode);
  const snapshot = await get(ref(db, `rooms/${code}/meta`));
  const meta = snapshot.val();
  if (!meta || meta.status !== 'paused') return;

  const pausedAt = Number(meta.pauseStartedAt) || getApproxServerNow();
  const extraPause = Math.max(0, getApproxServerNow() - pausedAt);
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'playing',
    pausedTotalMs: (Number(meta.pausedTotalMs) || 0) + extraPause,
    pauseStartedAt: null,
  });
}

export async function endRoom(roomCode) {
  initFirebase();
  const code = normalizeRoomCode(roomCode);
  await update(ref(db, `rooms/${code}/meta`), {
    status: 'ended',
    endedAt: serverTimestamp(),
  });
}

export async function updatePlayerStats(roomCode, playerId, stats) {
  initFirebase();
  const code = normalizeRoomCode(roomCode);
  const playerRef = ref(db, `rooms/${code}/players/${playerId}`);
  await update(playerRef, {
    score: Number(stats.score) || 0,
    correct: Number(stats.correct) || 0,
    wrong: Number(stats.wrong) || 0,
    answered: Number(stats.answered) || 0,
    avgResponseMs: Number(stats.avgResponseMs) || 0,
    qpm: Number(stats.qpm) || 0,
    streak: Number(stats.streak) || 0,
    comboBonuses: Number(stats.comboBonuses) || 0,
    mistakeCounts: stats.mistakeCounts || {},
    connected: true,
    finished: Boolean(stats.finished),
    lastSeen: serverTimestamp(),
  });
}

export async function markPlayerConnected(roomCode, playerId, connected) {
  initFirebase();
  const code = normalizeRoomCode(roomCode);
  await update(ref(db, `rooms/${code}/players/${playerId}`), {
    connected: Boolean(connected),
    lastSeen: serverTimestamp(),
  });
}

export function destroyFirebaseListeners() {
  if (offsetUnsubscribe) offsetUnsubscribe();
  offsetUnsubscribe = null;
}
