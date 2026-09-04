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

export async function submitTeacherAccessRequest(user) {
  initFirebase();
  if (!user?.uid) throw new Error('Không có UID tài khoản Google.');
  const requestRef = ref(db, `teacherRequests/${user.uid}`);
  await set(requestRef, {
    email: String(user.email || '').trim().toLowerCase(),
    displayName: user.displayName || 'Giáo viên',
    requestedAt: serverTimestamp(),
  });
}

export function listenTeacherAccessRequests(callback) {
  initFirebase();
  return onValue(ref(db, 'teacherRequests'), (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  });
}

export function listenTeacherDirectory(callback) {
  initFirebase();
  return onValue(ref(db, 'teachers'), (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  });
}

export async function approveTeacherAccess(uid) {
  initFirebase();
  if (!uid) throw new Error('Thiếu UID giáo viên.');

  const requestSnapshot = await get(ref(db, `teacherRequests/${uid}`));
  const request = requestSnapshot.exists() ? requestSnapshot.val() : {};
  const email = String(request?.email || '').trim().toLowerCase();
  const displayName = String(request?.displayName || 'Giáo viên').trim() || 'Giáo viên';

  await update(ref(db), {
    [`teachers/${uid}`]: {
      active: true,
      email,
      displayName,
      approvedAt: serverTimestamp(),
    },
    [`teacherRequests/${uid}`]: null,
  });
}

export async function setTeacherAccessActive(uid, active) {
  initFirebase();
  if (!uid) throw new Error('Thiếu UID giáo viên.');
  const snapshot = await get(ref(db, `teachers/${uid}`));
  if (!snapshot.exists()) throw new Error('Không tìm thấy giáo viên này.');
  const value = snapshot.val();

  // Tự nâng cấp bản ghi V1.8/V1.8.2 cũ dạng boolean sang object quản lý đầy đủ.
  if (typeof value === 'boolean') {
    await set(ref(db, `teachers/${uid}`), {
      active: Boolean(active),
      email: '',
      displayName: 'Bản ghi cũ',
      approvedAt: serverTimestamp(),
    });
    return;
  }

  await update(ref(db, `teachers/${uid}`), { active: Boolean(active) });
}

export async function removeTeacherAccess(uid) {
  initFirebase();
  if (!uid) throw new Error('Thiếu UID giáo viên.');
  await set(ref(db, `teachers/${uid}`), null);
}

export async function rejectTeacherAccess(uid) {
  initFirebase();
  if (!uid) throw new Error('Thiếu UID giáo viên.');
  await set(ref(db, `teacherRequests/${uid}`), null);
}

export async function getTeacherAccess(user, { retries = 3 } = {}) {
  initFirebase();
  if (!user?.uid) {
    return {
      approved: false,
      uid: null,
      path: null,
      exists: false,
      value: null,
      valueType: 'null',
      attempts: 0,
      source: 'none',
      error: new Error('Không có UID của tài khoản Google.'),
    };
  }

  const path = `teachers/${user.uid}`;
  let lastError = null;
  let lastToken = null;
  const maxAttempts = Math.max(1, Number(retries) || 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // Buộc Firebase làm mới ID token trước khi đọc Realtime Database.
      // Điều này tránh race-condition ngay sau khi Google Sign-In vừa hoàn tất.
      lastToken = await user.getIdToken(true);
      if (attempt > 1) {
        await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
      }

      const snapshot = await get(ref(db, path));
      const value = snapshot.val();
      const approved = value === true || Boolean(value && typeof value === 'object' && value.active === true);
      return {
        approved,
        uid: user.uid,
        path,
        exists: snapshot.exists(),
        value,
        valueType: value === null ? 'null' : typeof value,
        attempts: attempt,
        source: 'firebase-sdk',
        error: null,
      };
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
      }
    }
  }

  // Fallback chẩn đoán qua REST bằng chính ID token vừa refresh.
  // Nếu SDK gặp race/cache bất thường, REST vẫn cho biết server thực tế trả gì.
  try {
    lastToken = lastToken || await user.getIdToken(true);
    const baseUrl = String(firebaseConfig.databaseURL || '').replace(/\/$/, '');
    const url = `${baseUrl}/${encodeURIComponent('teachers')}/${encodeURIComponent(user.uid)}.json?auth=${encodeURIComponent(lastToken)}`;
    const response = await fetch(url, { cache: 'no-store' });
    const text = await response.text();
    let value = null;
    try { value = text ? JSON.parse(text) : null; } catch { value = text; }

    if (response.ok) {
      const approved = value === true || Boolean(value && typeof value === 'object' && value.active === true);
      return {
        approved,
        uid: user.uid,
        path,
        exists: value !== null,
        value,
        valueType: value === null ? 'null' : typeof value,
        attempts: maxAttempts,
        source: 'rest-fallback',
        error: null,
      };
    }

    const restError = new Error(`REST ${response.status}: ${text || response.statusText}`);
    restError.code = `rest/${response.status}`;
    return {
      approved: false,
      uid: user.uid,
      path,
      exists: false,
      value,
      valueType: value === null ? 'null' : typeof value,
      attempts: maxAttempts,
      source: 'rest-fallback',
      error: restError,
      sdkError: lastError,
    };
  } catch (restFailure) {
    return {
      approved: false,
      uid: user.uid,
      path,
      exists: false,
      value: null,
      valueType: 'unknown',
      attempts: maxAttempts,
      source: 'failed',
      error: restFailure || lastError,
      sdkError: lastError,
    };
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
