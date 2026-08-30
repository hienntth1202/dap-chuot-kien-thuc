# Đập Chuột Kiến Thức V1.8

## V1.8 — Teacher Access Control

- Khu vực giáo viên bắt buộc đăng nhập Google.
- Chỉ tài khoản có Firebase Authentication UID được cấp quyền trong `teachers/<UID> = true` mới được tạo/điều khiển phòng.
- Tài khoản chưa được duyệt sẽ thấy UID để gửi cho chủ game, nhưng không thấy màn tạo phòng.
- Có nút đăng xuất ở thanh trên cùng sau khi được cấp quyền.
- Học sinh vẫn vào bằng mã phòng/QR và không cần tài khoản.
- Firebase Rules mới chặn người không được duyệt tạo/sửa `meta` phòng; học sinh vẫn có thể ghi dữ liệu ở `players` của phòng đã tồn tại.
- V1.8 giữ nguyên cuộc đua mèo bắt chuột V1.6 và các chủ đề nguyên hàm V1.7.

## Cấp quyền giáo viên

1. Bật Google trong Firebase Authentication.
2. Thêm domain Render vào Authentication > Settings > Authorized domains: `dap-chuot-kien-thuc.onrender.com`.
3. Deploy V1.8.
4. Giáo viên mở `teacher.html`, đăng nhập Google. Nếu chưa được duyệt, trang sẽ hiện UID.
5. Trong Realtime Database > Data, tạo `teachers/<UID> = true` (Boolean).
6. Dán rules từ `database.rules.json` vào Realtime Database > Rules và Publish.

> Lưu ý: UID là khóa dùng cho Security Rules. Email chỉ dùng để nhận biết tài khoản; không dùng email đã thay dấu chấm làm khóa cấp quyền ở V1.8.

## Firebase config

Bản UPDATE không chứa `js/config.js`, vì vậy không ghi đè cấu hình Firebase hiện tại của giáo viên.
