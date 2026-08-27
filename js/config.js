// ============================================================
// FIREBASE CONFIG
// Sau khi tạo Firebase Web App, thay các giá trị bên dưới bằng
// cấu hình Firebase của bạn. Chế độ CÁ NHÂN vẫn chạy dù chưa cấu hình.
// ============================================================

export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  databaseURL: 'https://YOUR_DATABASE_NAME.REGION.firebasedatabase.app',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

export function hasFirebaseConfig() {
  return Boolean(
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes('YOUR_') &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes('YOUR_') &&
    firebaseConfig.databaseURL &&
    !firebaseConfig.databaseURL.includes('YOUR_')
  );
}
