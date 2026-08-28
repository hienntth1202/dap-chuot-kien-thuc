# Đập Chuột Kiến Thức V1.6


## V1.6 — Cuộc đua mèo bắt chuột

- Thiết kế lại phần kết quả đội trên màn hình giáo viên thành **Cuộc đua bắt chuột**.
- Mỗi đội có một mèo đại diện chạy trên đường đua realtime; vị trí mèo tỉ lệ với tổng điểm đội.
- Đội dẫn đầu có nhãn **ĐANG DẪN ĐẦU** và vương miện.
- Cuối đường đua có chuột, phô mai và cờ đích để tạo cảm giác thi đấu rõ hơn.
- Mỗi làn hiển thị số thành viên, số câu đúng, độ chính xác, phản hồi trung bình và tốc độ câu/phút của đội.
- Khi điểm đội tăng, làn đua có hiệu ứng nhấn và mèo trượt tới vị trí mới.
- Khi giáo viên chọn **Ẩn bảng điểm**, điểm và vị trí thực của mèo cũng được che để giữ bất ngờ.
- Frenzy Mode 30 giây cuối tiếp tục tác động lên phần đường đua.
- Không thay đổi Firebase, logic điểm, combo, câu hỏi, QR, chia đội hay gameplay học sinh.

## Hotfix quan trọng
- Sửa lỗi ES Module trong `js/question-banks.js` ở câu DG18 `(k/u)'`.
- Lỗi cũ làm `question-banks.js` không tải được, kéo theo script trang chủ dừng và nút **Chơi cá nhân** không phản hồi.
- Không thay đổi luật chơi, điểm, giao diện mobile hay bộ 18 công thức tổng quát ngoài việc sửa cú pháp.

Web game Toán nhẹ, chạy bằng HTML/CSS/JavaScript. Chế độ cá nhân không cần backend. Chế độ lớp dùng Firebase Realtime Database để đồng bộ phòng, đội và điểm.


## Điểm mới V1.5.4

- Thêm chủ đề **Công thức đạo hàm tổng quát** gồm 18 công thức từ bảng công thức giáo viên cung cấp.
- Bao gồm: quy tắc tổng, tích, thương, nhân hằng số, `(k/u)'`, đạo hàm hằng số, lũy thừa `x^α` và `u^α`, căn bậc hai, nghịch đảo, căn bậc `n`, sin/cos của `x` và của `u`.
- Chủ đề mới có thể chơi riêng hoặc tích chọn cùng các chủ đề khác trong chế độ ôn tập nhiều chủ đề.
- Các công thức tổng quát dùng câu dẫn riêng: **“Chọn công thức đạo hàm tổng quát đúng:”** để học sinh phân biệt với câu tính đạo hàm của một hàm số cụ thể.

## Điểm mới V1.5.2

### Mobile UI V1.5.2
- Công thức trên bảng đáp án lớn hơn rõ rệt trên điện thoại.
- Bảng đáp án cao hơn để dễ đọc và dễ chạm.
- Công thức dài tự co theo chiều rộng khung, công thức ngắn vẫn giữ cỡ lớn.
- Dòng luật chơi phía dưới được thu gọn trên màn hình nhỏ.
- Không thay đổi logic game, điểm, combo, thời gian đổi hang hoặc Firebase.


1. Giáo viên và học sinh cá nhân có thể chọn **nhiều chủ đề cùng lúc**.
2. Khi chọn nhiều chủ đề, game **chia số câu tương đối đều** giữa các chủ đề; cùng phòng dùng cùng tập câu, nhưng thứ tự mỗi học sinh khác nhau.
3. Màn hình giáo viên có **QR vào phòng**; học sinh quét QR rồi chỉ cần nhập tên.
4. Trước mỗi vòng có **đếm ngược 3–2–1–CHIẾN**.
5. Random nhóm có màn hình **công bố đội** trên điện thoại học sinh.
6. Bảng giáo viên có **Team Energy realtime** và thông báo khi một thành viên đạt combo.
7. Combo 3 câu đúng liên tiếp vẫn thưởng +10, nhưng có animation/âm thanh rõ hơn.
8. **30 giây cuối = Frenzy Mode**: giao diện căng hơn; máy giáo viên có nhịp báo 10 giây cuối; nhạc nền tăng tốc nhẹ nếu đang phát.
9. Giáo viên có nút **Ẩn/hiện bảng điểm** để tạo bất ngờ cuối trận.
10. Cuối trận có màn **công bố đội thắng + top 3 đội**.
11. Giáo viên thấy **3 câu cả lớp sai nhiều nhất** trong vòng vừa chơi.
12. Có **Chơi lại** và **Chơi lại + Random đội**, không cần học sinh nhập lại mã phòng.
13. Có **Preset tiết học** lưu bằng localStorage trên máy giáo viên: chủ đề, độ khó, thời gian, số câu, số đội.
14. Giữ nguyên các chức năng V1.4.1: xem lại câu sai trên từng máy, tiếng chuột chít-chít, nhạc nền giáo viên, câu khó hiện lâu hơn, chuột đổi hang liên tục, tốc độ phản hồi/câu-phút.

## Cấu trúc

- `index.html`: trang chủ + cài đặt chơi cá nhân.
- `personal.html`: game cá nhân.
- `teacher.html`: tạo phòng, QR, random đội, dashboard realtime.
- `student.html`: học sinh vào phòng và chơi.
- `js/question-banks.js`: kho câu hỏi. Đây là file chính để mở rộng nội dung về sau.
- `js/game-view.js`: gameplay đập chuột.
- `js/engine.js`: điểm, combo, random, chia đội.
- `js/firebase-service.js`: đồng bộ lớp học.
- `js/config.js`: cấu hình Firebase của giáo viên.
- `css/styles.css`: giao diện và animation.
- `database.rules.json`: rules Firebase đơn giản cho V1.

## Chạy thử cá nhân

Mở thư mục bằng VS Code → Live Server → `index.html` → Chơi cá nhân. Không cần Firebase.

## Chế độ lớp

Cần cấu hình Firebase trong `js/config.js`. Sau đó mở `teacher.html`, tạo phòng, học sinh dùng `student.html` hoặc quét QR.

### Lưu ý QR khi chạy trên máy cục bộ

Nếu địa chỉ trang giáo viên là `127.0.0.1` hoặc `localhost`, QR sẽ chứa địa chỉ cục bộ của chính máy giáo viên nên điện thoại khác thường không truy cập được. QR phát huy đúng khi website đã deploy lên Render/GitHub Pages hoặc khi bạn dùng một địa chỉ mạng LAN mà điện thoại truy cập được.

## Dữ liệu học sinh

V1 không dùng tài khoản và không nên lưu dữ liệu nhạy cảm. Nên yêu cầu học sinh nhập tên ngắn/tên gọi trong lớp. Lịch sử câu sai chi tiết chỉ giữ trên máy học sinh; Firebase chỉ nhận một bản đồ đếm số lần sai theo mã câu để giáo viên tạo Top 3 câu cả lớp cần ôn.


## V1.5.2
- Nhãn câu hỏi theo loại kiến thức. Các chủ đề đạo hàm hiển thị “Đạo hàm của hàm số sau là:”.
- Kiến trúc hỗ trợ từng câu/từng ngân hàng có `instruction`, để sau này thêm nguyên hàm với nhãn riêng mà không sửa game engine.