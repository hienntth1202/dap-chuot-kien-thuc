# TEST REPORT — V1.8.1

## Kiểm tra tĩnh
- `js/teacher.js`: syntax check.
- `js/firebase-service.js`: syntax check.
- `database.rules.json`: JSON hợp lệ.
- `teacher.html`: các ID chẩn đoán mới không trùng.

## Luồng kiểm tra quyền
1. Google Auth trả về user + UID.
2. `getIdToken(true)` buộc refresh token.
3. Đọc đúng `teachers/<UID>`.
4. Retry tối đa 4 lần khi Firebase trả lỗi.
5. Chỉ Boolean `true` được coi là approved.
6. Nếu không approved, UI hiện chính xác `exists/value/type/error`.
7. Có nút kiểm tra lại quyền và copy chẩn đoán.

## Không thay đổi
- Gameplay, điểm/combo.
- Học sinh không cần đăng nhập.
- QR/mã phòng.
- Cuộc đua mèo.
- Nguyên hàm V1.7.
- `js/config.js` không nằm trong patch.
