# TEST REPORT — V1.5.1

## Thay đổi được kiểm tra
- Các ngân hàng đạo hàm dùng câu dẫn: `Đạo hàm của hàm số sau là:`
- Công thức lượng giác và Mũ–Logarit dùng câu dẫn: `Chọn công thức đúng:`
- `GameView` đọc câu dẫn động theo từng câu/ngân hàng, không hard-code một loại toán cho toàn game.
- Khi ghép nhiều chủ đề, mỗi câu giữ `instruction` của ngân hàng nguồn.
- `findQuestionById()` cũng trả lại `instruction`, phục vụ thống kê/xem lại sau này.

## Kiểm tra kỹ thuật
- `node --check js/question-banks.js`: PASS
- `node --check js/game-view.js`: PASS
- Kiểm tra đủ instruction cho 6 ngân hàng hiện có: PASS
- Kiểm tra `data-question-label` và cập nhật động ở `nextQuestion()`: PASS

## Thiết kế mở rộng
Một ngân hàng nguyên hàm trong tương lai chỉ cần khai báo, ví dụ:

```js
instruction: 'Nguyên hàm của hàm số sau là:'
```

Game engine không cần sửa lại.
