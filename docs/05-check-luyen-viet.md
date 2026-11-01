# 05. Cơ Chế Chấm Điểm & Luyện Viết Tay (Canvas Stroke Matching)

## 1. Môi Trường Luyện Viết Tay (HTML5 Interactive Canvas)

Chế độ **Tập Viết Tay & Kiểm Tra Nét Vẽ (Practice Modal)** cho phép người học dùng chuột hoặc ngón tay (màn hình cảm ứng di động) để vẽ đè lên khung ô lưới Kanji.

---

## 2. Bắt Sự Kiện Con Trỏ (Mouse & Touch Event Lifecycle)

Canvas lắng nghe đồng thời cả sự kiện chuột và cảm ứng đa điểm:
- `onMouseDown` / `onTouchStart`: Khởi tạo tọa độ bắt đầu nét vẽ $P_0(x_0, y_0)$.
- `onMouseMove` / `onTouchMove`: Thu thập chuỗi điểm đường cong $P = [P_0, P_1, P_2, \dots, P_n]$.
- `onMouseUp` / `onTouchEnd`: Kết thúc nét vẽ và chuyển chuỗi điểm $P$ qua thuật toán chấm điểm `evaluateUserStroke`.

---

## 3. Thuật Toán So Sánh Đường Cong & Chấm Điểm (Stroke Geometry Matching)

Khi người dùng hoàn thành 1 nét vẽ, thuật toán so sánh nét vẽ của người dùng $U = [U_0, \dots, U_m]$ với đường nét mẫu SVG chuẩn $S = [S_0, \dots, S_k]$ dựa trên 3 chỉ số hình học:

```
                  ┌──────────────────────────────────────────────┐
                  │ 1. Khoảng Cách Điểm Đầu (Start Proximity)    │
                  │    d_start = || U_0 - S_0 ||                 │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ 2. Vector Hướng Nét (Direction Cosine Sim)   │
                  │    cos(θ) = (v_U · v_S) / (||v_U|| ||v_S||)  │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ 3. Tỉ Lệ Độ Dài Đường Vẽ (Length Alignment)   │
                  │    r_len = min(length_U, length_S) / max(...)│
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │  Tổng Điểm Score (%) = 0.4*D + 0.4*V + 0.2*L │
                  └──────────────────────────────────────────────┘
```

### Công Thức Chi Tiết:
1. **Khoảng cách điểm bắt đầu ($D_s$)**: Nếu nét người dùng bắt đầu xa chấm xanh chỉ dẫn ($> 35\text{px}$), điểm sẽ bị trừ nặng.
2. **Hướng nét vẽ ($V_d$)**: So sánh góc giữa vector nối điểm đầu-cuối người dùng $\vec{v}_U = U_n - U_0$ và vector mẫu $\vec{v}_S = S_k - S_0$. Nếu người dùng vẽ ngược hướng (vd: từ phải sang trái thay vì trái sang phải), điểm hướng sẽ bằng $0\%$.
3. **Thang điểm đạt Pass**:
   - Nếu $Score \ge 70\%$: Nét vẽ được chấp nhận (**Pass**), hiển thị phản hồi xanh lá *"Nét vẽ đẹp & đúng hướng!"*, tự động chuyển sang nét tiếp theo.
   - Nếu $Score < 70\%$: Hiển thị phản hồi đỏ *"Sai hướng hoặc điểm bắt đầu chưa chuẩn"*, yêu cầu người dùng thử lại.

---

## 4. Chế Độ Luyện Tập (Guided vs. Freehand)

* **Chế độ Hướng dẫn (Guided Mode)**: Bật chấm xanh chỉ dẫn vị trí bắt đầu, yêu cầu vẽ đúng thứ tự nét $1 \to N$ và tính tổng điểm hoàn thành cả chữ Kanji.
* **Chế độ Viết tự do (Freehand Mode)**: Tùy chọn 7 màu mực (Xanh bích, Đỏ chu sa, Đen mực tàu,...), không chấm điểm, dành cho người dùng tự do luyện viết nét tay.
