# Đập Chuột Kiến Thức V1.8.3

## Quản lý giáo viên theo tên/email

V1.8.3 hoàn thiện cơ chế phân quyền giáo viên để chủ game không cần nhớ UID.

- Chủ game `hien.ntt2@greenfield.edu.vn` vẫn vào trực tiếp bằng Google.
- Giáo viên mới chỉ gửi yêu cầu **một lần đầu tiên**.
- Khi chủ game bấm **Duyệt**, Firebase lưu đầy đủ:
  - UID
  - họ tên Google
  - email Google
  - trạng thái `active`
  - thời điểm duyệt
- Các lần sau giáo viên đã được duyệt tự vào, không cần duyệt lại.
- Chủ game có bảng **Quản lý giáo viên** ngay trong trang tạo phòng:
  - xem tên + email;
  - Thu hồi quyền;
  - Cấp lại quyền;
  - Xóa hẳn khỏi danh sách.
- `Thu hồi quyền` đặt `active=false` nên giáo viên không tự gửi yêu cầu lại mỗi lần đăng nhập.
- `Xóa` xóa hẳn bản ghi; nếu giáo viên đăng nhập lại sau đó, họ có thể gửi yêu cầu mới.
- Tương thích bản ghi cũ `teachers/<uid> = true` để không làm hỏng dữ liệu V1.8/V1.8.2.
- Học sinh vẫn không cần tài khoản.
- Patch không chứa `js/config.js`, nên không ghi đè Firebase config hiện tại.

## Cấu trúc Firebase mới

```text
teachers
  <uid>
    active: true
    displayName: "Nguyễn Văn A"
    email: "a@school.edu.vn"
    approvedAt: ...
```

Sau khi copy patch lên GitHub/Render, cần copy nội dung `database.rules.json` vào Firebase Console → Realtime Database → Rules → Publish.
