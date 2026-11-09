export type RadicalPositionType = 
  | 'hen'      // 偏 - Left
  | 'tsukuri'  // 旁 - Right
  | 'kanmuri'  // 冠 - Top
  | 'ashi'     // 脚 - Bottom
  | 'kamae'    // 構 - Enclosure
  | 'tare'     // 垂 - Top-left
  | 'nyo'      // 繞 - Bottom-left
  | 'center';  // Trung tâm / Khác

export interface RadicalInfo {
  number: number;           // 1 to 214
  character: string;        // e.g. '言'
  variant?: string;         // e.g. '訁'
  hanViet: string;          // e.g. 'NGÔN'
  hiragana?: string;        // e.g. 'げん'
  meaning: string;          // e.g. 'Lời nói'
  strokeCount: number;      // e.g. 7
  positionType?: RadicalPositionType;
  positionName?: string;    // e.g. 'Hen (Bên trái)'
  examples: string[];       // e.g. ['語', '話', '読', '試']
}

export interface RadicalComponent {
  radical: string;
  variant?: string;
  hanViet: string;
  meaning: string;
  strokeCount: number;          // Số nét chuẩn Khang Hy để hiển thị
  actualPathCount?: number;      // Số thẻ <path> thực tế đếm từ SVG (cho đồ họa / tô màu)
  pathIndices?: number[];       // Danh sách số thứ tự nét của component trong file SVG (1, 2, ...)
  positionType?: RadicalPositionType;
  positionName?: string;
  isPrimaryRadical?: boolean;   // true nếu thẻ <g> có thuộc tính kvg:radical="general"
  depth?: number;               // 1 = cấp 1 trực tiếp, 2 = cấp 2, 3 = cấp 3
  subComponents?: RadicalComponent[]; // Các thành phần con phân rã sâu hơn
}

export interface KanjiDecomposition {
  kanji: string;
  hanViet: string;
  primaryRadical: string;       // Tên bộ thủ chính xác định qua kvg:radical="general"
  isSelfRadical?: boolean;      // true nếu bản thân chữ là một bộ thủ độc lập (như 見, 門, 木)
  components: RadicalComponent[]; // Danh sách thành phần (tương thích các view hiện có)
  directComponents?: RadicalComponent[]; // Thành phần trực tiếp cấp 1
  mnemonicStory: string;
}
