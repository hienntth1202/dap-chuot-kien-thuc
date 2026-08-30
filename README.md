# Đập Chuột Kiến Thức V1.8.1

## Hotfix Teacher Access

V1.8.1 tập trung sửa và chẩn đoán chính xác lỗi giáo viên đã thêm UID nhưng trang vẫn báo chưa được cấp quyền.

### Thay đổi
- Buộc làm mới Firebase ID token trước khi đọc `teachers/<UID>`.
- Tự retry tối đa 4 lần để tránh race-condition sau Google Sign-In.
- Nút **Kiểm tra lại quyền** không cần đăng xuất/đăng nhập lại.
- Hiển thị chẩn đoán thực tế từ Firebase: path, exists, value, type, số lần thử và error code.
- Phân biệt rõ 4 lỗi: permission denied, không tìm thấy UID, Value là chuỗi `"true"`, Value Boolean `false`.
- Nút **Copy chẩn đoán** để gửi nguyên trạng lỗi.
- Không chứa `js/config.js`; không ghi đè Firebase config hiện tại.

### Cấu trúc quyền chuẩn
```
teachers
  <FIREBASE_AUTH_UID>: true   // Boolean
```

Rules vẫn dùng UID của Firebase Authentication.
