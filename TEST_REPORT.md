# TEST REPORT — V1.8

## Kiểm tra tĩnh
- `js/teacher.js`: JavaScript syntax OK (`node --check`).
- `js/firebase-service.js`: JavaScript syntax OK (`node --check`).
- `database.rules.json`: JSON hợp lệ.
- `teacher.html`: không có ID trùng.

## Luồng quyền dự kiến
1. Chưa đăng nhập: chỉ hiện màn đăng nhập Google; tạo phòng bị ẩn.
2. Đăng nhập nhưng UID không tồn tại tại `teachers/<UID>`: hiện thông báo chưa được cấp quyền + UID; tạo phòng bị ẩn.
3. UID có giá trị Boolean `true`: hiện màn tạo phòng và cho phép điều khiển phòng.
4. Firebase Rules: tạo/sửa cấp phòng yêu cầu `auth.uid` có trong `teachers`; nhánh `players` của phòng đã tồn tại vẫn cho học sinh ghi để giữ mô hình không-login.
5. Đăng xuất: dừng listeners của giáo viên, ẩn dashboard và quay lại màn đăng nhập.

## Không thay đổi
- Luật điểm và combo.
- QR/mã phòng cho học sinh.
- Gameplay học sinh.
- Cuộc đua mèo bắt chuột.
- Kho câu nguyên hàm V1.7.
- `js/config.js` không nằm trong patch.
