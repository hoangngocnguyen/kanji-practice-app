import React from 'react';

interface KanjiGridOverlayProps {
  className?: string;
  dashed?: boolean;
}

/**
 * Hiển thị khung lưới chữ điền / chữ Mễ (Practice Grid) chuẩn thư pháp Nhật Bản
 * Sử dụng SVG vector sắc nét, đường nét đứt rõ ràng (#94a3b8 / #cbd5e1),
 * tự động co giãn theo kích thước khung chứa.
 */
export const KanjiGridOverlay: React.FC<KanjiGridOverlayProps> = ({
  className = '',
  dashed = true,
}) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none z-10 flex items-center justify-center p-1.5 sm:p-2 ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Khung viền ngoài chữ Điền */}
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="6"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />

        {/* 2 Đường chéo phụ (Chữ Mễ 米字格) nét mờ */}
        <line
          x1="5"
          y1="5"
          x2="95"
          y2="95"
          stroke="#e2e8f0"
          strokeWidth="0.8"
          strokeDasharray="2 3"
        />
        <line
          x1="95"
          y1="5"
          x2="5"
          y2="95"
          stroke="#e2e8f0"
          strokeWidth="0.8"
          strokeDasharray="2 3"
        />

        {/* Trục ngang giữa (Chữ Điền 田字格) */}
        <line
          x1="3"
          y1="50"
          x2="97"
          y2="50"
          stroke="#94a3b8"
          strokeWidth="1.4"
          strokeDasharray={dashed ? '3 3' : 'none'}
        />

        {/* Trục dọc giữa */}
        <line
          x1="50"
          y1="3"
          x2="50"
          y2="97"
          stroke="#94a3b8"
          strokeWidth="1.4"
          strokeDasharray={dashed ? '3 3' : 'none'}
        />

        {/* Tâm giao nhau */}
        <circle cx="50" cy="50" r="1.5" fill="#94a3b8" />
      </svg>
    </div>
  );
};
