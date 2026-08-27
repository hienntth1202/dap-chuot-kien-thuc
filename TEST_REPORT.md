# TEST REPORT — V1.5.3

## Mục tiêu thay đổi
- Bổ sung 18 công thức đạo hàm tổng quát theo bảng công thức giáo viên cung cấp.
- Giữ nguyên toàn bộ gameplay/mobile UI V1.5.2.
- Chủ đề mới phải dùng được độc lập và khi trộn nhiều chủ đề.

## Kiểm tra đã chạy
- PASS: cú pháp JavaScript toàn bộ project.
- PASS: đủ 18 mã câu DG01–DG18, không trùng ID.
- PASS: các công thức tổng, tích, thương, nhân hằng số, k/u, hằng số, lũy thừa, căn, nghịch đảo, căn bậc n, sin/cos đều có trong ngân hàng.
- PASS: chủ đề mới khai báo `instruction` riêng và tự xuất hiện trong danh sách chủ đề qua `listQuestionBanks()`.
- PASS: cơ chế nhiều chủ đề có thể cân bằng câu từ ngân hàng mới mà không cần sửa game engine.
- PASS: không thay đổi logic điểm, combo, thời gian đổi hang, âm thanh, Firebase hoặc mobile UI.

## Ghi chú nội dung
Các công thức được nhập theo đúng cấu trúc trong ảnh giáo viên cung cấp. Điều kiện `v ≠ 0`, `α ∈ R`, `n ∈ N*`, `n > 1` và giả thiết hằng số được hiển thị tại các câu liên quan để tránh mơ hồ.
