import React from 'react';

export type GridType = 'mi' | 'tian' | 'box';

interface KanjiGridOverlayProps {
  className?: string;
  dashed?: boolean;
  type?: GridType;
}

/**
 * Hiển thị khung lưới chữ Điền / chữ Mễ (Practice Grid) chuẩn thư pháp Nhật Bản.
 * Đường nét đứt siêu mảnh, tinh tế (delicate hairline), dịu mắt, không đè lấp chữ Hán.
 */
export const KanjiGridOverlay: React.FC<KanjiGridOverlayProps> = ({
  className = '',
  dashed = true,
  type = 'mi',
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
        {/* Khung viền ngoài nét mảnh tinh xảo */}
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="5"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="0.8"
        />

        {/* 2 Đường chéo phụ (Chữ Mễ 米字格) nét mờ siêu mảnh */}
        {type === 'mi' && (
          <>
            <line
              x1="5"
              y1="5"
              x2="95"
              y2="95"
              stroke="#f1f5f9"
              strokeWidth="0.5"
              strokeDasharray="2 3"
            />
            <line
              x1="95"
              y1="5"
              x2="5"
              y2="95"
              stroke="#f1f5f9"
              strokeWidth="0.5"
              strokeDasharray="2 3"
            />
          </>
        )}

        {/* Trục ngang & dọc chữ Điền (田字格) nét đứt thanh mảnh */}
        {type !== 'box' && (
          <>
            {/* Trục ngang giữa */}
            <line
              x1="3"
              y1="50"
              x2="97"
              y2="50"
              stroke="#cbd5e1"
              strokeWidth="0.7"
              strokeDasharray={dashed ? '2.5 3' : 'none'}
              opacity="0.85"
            />

            {/* Trục dọc giữa */}
            <line
              x1="50"
              y1="3"
              x2="50"
              y2="97"
              stroke="#cbd5e1"
              strokeWidth="0.7"
              strokeDasharray={dashed ? '2.5 3' : 'none'}
              opacity="0.85"
            />

            {/* Tâm giao nhau tinh tế */}
            <circle cx="50" cy="50" r="0.9" fill="#94a3b8" opacity="0.6" />
          </>
        )}
      </svg>
    </div>
  );
};

