# TEST REPORT — V1.5.4

## Lỗi đã sửa
- **Root cause:** câu DG18 trong `js/question-banks.js` dùng chuỗi JavaScript bao bởi dấu nháy đơn nhưng bên trong có ký tự đạo hàm `u'`, làm parser ES Module báo `SyntaxError: Unexpected token '}'`.
- Hậu quả: `index.html` không import được `question-banks.js`; toàn bộ script module trang chủ không chạy; sự kiện click cho nút `#showPersonal` không được gắn.
- Đã sửa chuỗi đáp án nhiễu DG18 sang dấu nháy kép an toàn.

## Kiểm tra đã thực hiện
1. **ES Module syntax:** chuyển từng file `js/*.js` sang ngữ cảnh `.mjs` và chạy `node --check` — PASS toàn bộ.
2. **Import runtime module thuần:** import `question-banks.js`, `engine.js`, `game-view.js` bằng Node ESM — PASS.
3. **Ngân hàng câu hỏi:** 7 bộ, tổng 116 câu; ID không trùng; mỗi câu có đáp án, distractors, level hợp lệ; không có đáp án đúng trùng distractor — PASS.
4. **Chọn nhiều chủ đề:** kiểm tra `basic / normal / challenge`, nhiều mốc số câu đến `Tất cả`; số lượng tạo ra đúng, không lặp câu trong cùng tập — PASS.
5. **Điểm/combo:** đúng +10; sai -5; 3 câu đúng liên tiếp cho thêm +10; sai reset streak — PASS.
6. **Chia đội:** 37 học sinh / 4 đội => 10–9–9–9, chênh tối đa 1 — PASS.
7. **HTML ↔ JS:** kiểm tra các ID được `getElementById/byId` tham chiếu đều tồn tại trong đúng trang — PASS.
8. **Local assets:** các liên kết `./css/...`, `./js/...`, HTML nội bộ đều tồn tại — PASS.
9. **Inline module index:** trích script module trong `index.html` và kiểm tra syntax — PASS.

## Giới hạn kiểm thử
Môi trường Chromium nội bộ chặn truy cập localhost/file URL bởi policy quản trị, nên không thể chạy E2E click thực tế trong Chromium tại đây. Tuy nhiên lỗi khiến nút không click đã được tái hiện trực tiếp bằng ES Module parser và đã được loại bỏ; toàn bộ chuỗi import liên quan đã pass kiểm tra ESM sau sửa.
