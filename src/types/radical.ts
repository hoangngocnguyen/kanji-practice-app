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
  strokeCount: number;
  positionType?: RadicalPositionType;
  positionName?: string;
}

export interface KanjiDecomposition {
  kanji: string;
  hanViet: string;
  primaryRadical: string;
  components: RadicalComponent[];
  mnemonicStory: string;
}
