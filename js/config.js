// ============================================================
// FIREBASE CONFIG
// Sau khi tạo Firebase Web App, thay các giá trị bên dưới bằng
// cấu hình Firebase của bạn. Chế độ CÁ NHÂN vẫn chạy dù chưa cấu hình.
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyD9WZDpws8g4d1ifJVqsKnXcpResQ8qaUg",
  authDomain: "dap-chuot-kien-thuc.firebaseapp.com",
  databaseURL: "https://dap-chuot-kien-thuc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "dap-chuot-kien-thuc",
  storageBucket: "dap-chuot-kien-thuc.firebasestorage.app",
  messagingSenderId: "973013634978",
  appId: "1:973013634978:web:5701ca58ad5ba9bfdeecfb"
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
