import { RadicalInfo, KanjiDecomposition, RadicalPositionType, RadicalComponent } from '../types/radical';
import { parseKanjiVgSvgXml as extractSubElementsFromSvg, findRadicalInfo } from '../utils/kanjiSubElementParser';
import { SINO_VIETNAMESE_MAP } from './kanjiDictionary';

/**
 * Danh sách 214 Bộ thủ Khang Hy (Kangxi Radicals) đầy đủ 100% chuẩn xác
 * Tên Hán Việt, Số nét, Nghĩa tiếng Việt chi tiết tượng hình và Ví dụ tiêu biểu
 */
export const RADICALS_LIST: RadicalInfo[] = [
  {
    "number": 1,
    "character": "一",
    "hanViet": "NHẤT",
    "hiragana": "いち",
    "meaning": "Số một, duy nhất, khởi nguyên vạn vật, đồng nhất",
    "strokeCount": 1,
    "examples": [
      "一",
      "七",
      "三",
      "下",
      "不",
      "世"
    ]
  },
  {
    "number": 2,
    "character": "丨",
    "hanViet": "CỔN",
    "hiragana": "ぼう",
    "meaning": "Nét sổ thẳng đứng từ trên xuống, thông suốt",
    "strokeCount": 1,
    "examples": [
      "中",
      "串",
      "丸"
    ]
  },
  {
    "number": 3,
    "character": "丶",
    "hanViet": "CHỦ",
    "hiragana": "てん",
    "meaning": "Điểm, nét chấm đánh dấu, chủ thể, ngọn lửa nhỏ",
    "strokeCount": 1,
    "examples": [
      "丸",
      "丹",
      "主"
    ]
  },
  {
    "number": 4,
    "character": "丿",
    "hanViet": "PHIỆT",
    "hiragana": "の",
    "meaning": "Nét phẩy vuốt nghiêng qua trái, buông xuống",
    "strokeCount": 1,
    "examples": [
      "久",
      "乗",
      "乃",
      "乏"
    ]
  },
  {
    "number": 5,
    "character": "乙",
    "variant": "乚",
    "hanViet": "ẤT",
    "hiragana": "おつ",
    "meaning": "Can thứ hai (Ất), mầm non uốn cong trồi lên",
    "strokeCount": 1,
    "examples": [
      "九",
      "乞",
      "乾",
      "乱"
    ]
  },
  {
    "number": 6,
    "character": "亅",
    "hanViet": "QUYẾT",
    "hiragana": "はねぼう",
    "meaning": "Nét móc đứng ngược lên, hình cái móc câu",
    "strokeCount": 1,
    "examples": [
      "了",
      "予",
      "事"
    ]
  },
  {
    "number": 7,
    "character": "二",
    "hanViet": "NHỊ",
    "hiragana": "に",
    "meaning": "Số hai, trời và đất, nhị nguyên, phân chia",
    "strokeCount": 2,
    "examples": [
      "二",
      "井",
      "五",
      "仁",
      "元"
    ]
  },
  {
    "number": 8,
    "character": "亠",
    "hanViet": "ĐẦU",
    "hiragana": "なべぶた",
    "positionType": "kanmuri",
    "positionName": "Đầu (Phía trên)",
    "meaning": "Cái nắp nồi, phần chóp trên cùng của vật thể",
    "strokeCount": 2,
    "examples": [
      "亡",
      "交",
      "京",
      "夜",
      "市"
    ]
  },
  {
    "number": 9,
    "character": "人",
    "variant": "亻",
    "hanViet": "NHÂN",
    "hiragana": "にんべん",
    "positionType": "hen",
    "positionName": "Nhân đứng (Bên trái)",
    "meaning": "Con người, hành vi nhân cách, hoạt động của người",
    "strokeCount": 2,
    "examples": [
      "人",
      "休",
      "体",
      "働",
      "化",
      "代",
      "作",
      "使",
      "信",
      "任"
    ]
  },
  {
    "number": 10,
    "character": "儿",
    "hanViet": "NHI",
    "hiragana": "ひとあし",
    "positionType": "ashi",
    "positionName": "Nhân đi / Nhi (Phía dưới)",
    "meaning": "Tượng hình người đang đứng/bước đi, đứa trẻ, đôi chân",
    "strokeCount": 2,
    "examples": [
      "見",
      "元",
      "兄",
      "光",
      "免",
      "党",
      "克",
      "兜"
    ]
  },
  {
    "number": 11,
    "character": "入",
    "hanViet": "NHẬP",
    "hiragana": "いる",
    "meaning": "Đi vào trong, thâm nhập, dung nạp",
    "strokeCount": 2,
    "examples": [
      "入",
      "内",
      "全",
      "両"
    ]
  },
  {
    "number": 12,
    "character": "八",
    "variant": "丷",
    "hanViet": "BÁT",
    "hiragana": "はち",
    "meaning": "Số tám, hai nét tách rời: Phân tán, chia rẽ hai bên",
    "strokeCount": 2,
    "examples": [
      "八",
      "公",
      "六",
      "共",
      "兵",
      "具",
      "兼"
    ]
  },
  {
    "number": 13,
    "character": "冂",
    "hanViet": "QUYNH",
    "hiragana": "けいがまえ",
    "positionType": "kamae",
    "positionName": "Quynh (Vùng biên)",
    "meaning": "Vùng biên giới xa xôi hoang dã, khung viền ngoài",
    "strokeCount": 2,
    "examples": [
      "冊",
      "再",
      "同",
      "岡",
      "円"
    ]
  },
  {
    "number": 14,
    "character": "冖",
    "hanViet": "MỊCH",
    "hiragana": "わかんむり",
    "positionType": "kanmuri",
    "positionName": "Mịch (Khăn trùm)",
    "meaning": "Khăn vải trùm lên đầu, che đậy, bao phủ kín",
    "strokeCount": 2,
    "examples": [
      "冗",
      "冠",
      "写",
      "軍",
      "冤"
    ]
  },
  {
    "number": 15,
    "character": "冫",
    "hanViet": "BĂNG",
    "hiragana": "にすい",
    "positionType": "hen",
    "positionName": "Băng (Hai chấm nước)",
    "meaning": "Băng tuyết, giá rét, lạnh lẽo, đông cứng",
    "strokeCount": 2,
    "examples": [
      "冬",
      "冷",
      "次",
      "凍",
      "准",
      "凄",
      "凉"
    ]
  },
  {
    "number": 16,
    "character": "几",
    "hanViet": "KỶ",
    "hiragana": "つくえ",
    "meaning": "Cái bàn gỗ nhỏ, chỗ dựa nghỉ ngơi",
    "strokeCount": 2,
    "examples": [
      "凡",
      "処",
      "凧",
      "凪",
      "凱"
    ]
  },
  {
    "number": 17,
    "character": "凵",
    "hanViet": "KHẢM",
    "hiragana": "うけばこ",
    "positionType": "ashi",
    "meaning": "Cái hố sâu dưới đất, cái khay há miệng đựng vật",
    "strokeCount": 2,
    "examples": [
      "凶",
      "出",
      "函",
      "画"
    ]
  },
  {
    "number": 18,
    "character": "刀",
    "variant": "刂",
    "hanViet": "ĐAO",
    "hiragana": "りっとう",
    "positionType": "tsukuri",
    "positionName": "Đao đứng (Bên phải)",
    "meaning": "Con dao, thanh gươm, hành động cắt tỉa, phân định",
    "strokeCount": 2,
    "examples": [
      "切",
      "刈",
      "刊",
      "刑",
      "列",
      "初",
      "別",
      "利",
      "刷",
      "分",
      "前",
      "剣"
    ]
  },
  {
    "number": 19,
    "character": "力",
    "hanViet": "LỰC",
    "hiragana": "ちから",
    "meaning": "Sức mạnh bắp thịt cánh tay, nghị lực, năng lượng",
    "strokeCount": 2,
    "examples": [
      "力",
      "加",
      "助",
      "努",
      "励",
      "勝",
      "男",
      "動",
      "勢",
      "勤"
    ]
  },
  {
    "number": 20,
    "character": "勹",
    "hanViet": "BAO",
    "hiragana": "つつみがまえ",
    "positionType": "kamae",
    "positionName": "Bao (Bao bọc)",
    "meaning": "Bọc lại, ôm ấp che chở, bao gói đồ đạc",
    "strokeCount": 2,
    "examples": [
      "包",
      "勾",
      "匂",
      "旬",
      "勿",
      "句"
    ]
  },
  {
    "number": 21,
    "character": "匕",
    "hanViet": "CHỦY",
    "hiragana": "ひのさじ",
    "meaning": "Cái thìa múc cơm, con dao găm nhỏ",
    "strokeCount": 2,
    "examples": [
      "北",
      "匙",
      "頃",
      "能",
      "疑"
    ]
  },
  {
    "number": 22,
    "character": "匚",
    "hanViet": "PHƯƠNG",
    "hiragana": "はこがまえ",
    "positionType": "kamae",
    "meaning": "Cái tráp, tủ đựng đồ nằm ngang",
    "strokeCount": 2,
    "examples": [
      "匠",
      "匡",
      "医",
      "匿"
    ]
  },
  {
    "number": 23,
    "character": "匸",
    "hanViet": "HỆ",
    "hiragana": "かくしがまえ",
    "positionType": "kamae",
    "meaning": "Che giấu, cất kín một góc kín đáo",
    "strokeCount": 2,
    "examples": [
      "匹",
      "区"
    ]
  },
  {
    "number": 24,
    "character": "十",
    "hanViet": "THẬP",
    "hiragana": "じゅう",
    "meaning": "Số mười, hoàn chỉnh thập toàn thập mỹ, bốn phương",
    "strokeCount": 2,
    "examples": [
      "十",
      "千",
      "午",
      "半",
      "卒",
      "博",
      "協"
    ]
  },
  {
    "number": 25,
    "character": "卜",
    "hanViet": "BÓI",
    "hiragana": "ぼくのト",
    "meaning": "Vết nứt trên mai rùa khi bói toán, dự đoán điềm",
    "strokeCount": 2,
    "examples": [
      "卜",
      "占",
      "卦",
      "臥"
    ]
  },
  {
    "number": 26,
    "character": "卩",
    "variant": "㔾",
    "hanViet": "TIẾT",
    "hiragana": "ふしづくり",
    "positionType": "tsukuri",
    "meaning": "Đốt tre nứa, tư thế người quỳ gối phục tùng, ấn tín",
    "strokeCount": 2,
    "examples": [
      "印",
      "危",
      "卵",
      "即",
      "卷",
      "卿"
    ]
  },
  {
    "number": 27,
    "character": "厂",
    "hanViet": "HÁN",
    "hiragana": "がんだれ",
    "positionType": "tare",
    "positionName": "Hán (Vách đá)",
    "meaning": "Vách núi đá dựng đứng, sườn đồi dốc che mưa gió",
    "strokeCount": 2,
    "examples": [
      "厄",
      "原",
      "厚",
      "厳",
      "歴",
      "圧"
    ]
  },
  {
    "number": 28,
    "character": "厶",
    "hanViet": "TƯ",
    "hiragana": "む",
    "meaning": "Sở hữu riêng tư, bản thân, góc nhìn cá nhân",
    "strokeCount": 2,
    "examples": [
      "去",
      "参",
      "私",
      "能",
      "弁"
    ]
  },
  {
    "number": 29,
    "character": "又",
    "hanViet": "HỰU",
    "hiragana": "また",
    "meaning": "Bàn tay phải cầm nắm hành động, lặp lại lần nữa",
    "strokeCount": 2,
    "examples": [
      "又",
      "友",
      "双",
      "反",
      "取",
      "受",
      "段"
    ]
  },
  {
    "number": 30,
    "character": "口",
    "hanViet": "KHẨU",
    "hiragana": "くち",
    "meaning": "Cái miệng, ăn uống, lời nói, cổng vào, nhân khẩu",
    "strokeCount": 3,
    "examples": [
      "口",
      "古",
      "可",
      "名",
      "君",
      "味",
      "命",
      "和",
      "品",
      "員",
      "問",
      "語"
    ]
  },
  {
    "number": 31,
    "character": "囗",
    "hanViet": "VI",
    "hiragana": "くにがまえ",
    "positionType": "kamae",
    "positionName": "Vi (Vây quanh)",
    "meaning": "Tường thành bao bọc 4 phía, biên giới khép kín",
    "strokeCount": 3,
    "examples": [
      "四",
      "回",
      "因",
      "困",
      "図",
      "固",
      "国",
      "園",
      "國"
    ]
  },
  {
    "number": 32,
    "character": "土",
    "hanViet": "THỔ",
    "hiragana": "つち",
    "meaning": "Đất đai, thổ nhưỡng, chất đất trồng trọt và xây dựng",
    "strokeCount": 3,
    "examples": [
      "土",
      "在",
      "地",
      "坂",
      "型",
      "城",
      "域",
      "基",
      "場",
      "寺"
    ]
  },
  {
    "number": 33,
    "character": "士",
    "hanViet": "SĨ",
    "hiragana": "さむらい",
    "meaning": "Kẻ sĩ, người có học thức và đạo đức, quan chức, chiến sĩ",
    "strokeCount": 3,
    "examples": [
      "士",
      "壮",
      "売",
      "変",
      "吉",
      "壱"
    ]
  },
  {
    "number": 34,
    "character": "夂",
    "hanViet": "TRUY",
    "hiragana": "ふゆがしら",
    "positionType": "kanmuri",
    "meaning": "Đi chậm chạp từ phía sau tới, theo sau",
    "strokeCount": 3,
    "examples": [
      "処",
      "条",
      "冬",
      "各",
      "変"
    ]
  },
  {
    "number": 35,
    "character": "夊",
    "hanViet": "TUY",
    "hiragana": "すいにょう",
    "positionType": "nyo",
    "meaning": "Bước chân đi chậm rãi, kéo lê bước chân",
    "strokeCount": 3,
    "examples": [
      "夏",
      "夋"
    ]
  },
  {
    "number": 36,
    "character": "夕",
    "hanViet": "TỊCH",
    "hiragana": "ゆうべ",
    "meaning": "Buổi chiều tà, hoàng hôn, vầng trăng khuyết mới mọc",
    "strokeCount": 3,
    "examples": [
      "夕",
      "外",
      "多",
      "夜",
      "名",
      "夢"
    ]
  },
  {
    "number": 37,
    "character": "大",
    "hanViet": "ĐẠI",
    "hiragana": "だい",
    "meaning": "Người dang rộng hai tay hai chân: To lớn, vĩ đại, tôn kính",
    "strokeCount": 3,
    "examples": [
      "大",
      "天",
      "太",
      "夫",
      "央",
      "失",
      "奇",
      "奥",
      "奪"
    ]
  },
  {
    "number": 38,
    "character": "女",
    "hanViet": "NỮ",
    "hiragana": "おんな",
    "positionType": "hen",
    "meaning": "Phụ nữ, người con gái, sự dịu dàng, khéo léo",
    "strokeCount": 3,
    "examples": [
      "女",
      "好",
      "妹",
      "妻",
      "姉",
      "始",
      "姓",
      "威",
      "娘",
      "婚",
      "妙"
    ]
  },
  {
    "number": 39,
    "character": "子",
    "hanViet": "TỬ",
    "hiragana": "こ",
    "meaning": "Đứa trẻ sơ sinh, con cái, thế hệ sau, sự sinh sôi",
    "strokeCount": 3,
    "examples": [
      "子",
      "孔",
      "字",
      "存",
      "学",
      "季",
      "孤",
      "孫",
      "孝"
    ]
  },
  {
    "number": 40,
    "character": "宀",
    "hanViet": "MIÊN",
    "hiragana": "うかんむり",
    "positionType": "kanmuri",
    "positionName": "Miên (Mái nhà)",
    "meaning": "Mái nhà có vách che chở, chốn an cư, gia đình",
    "strokeCount": 3,
    "examples": [
      "宅",
      "宇",
      "安",
      "完",
      "宗",
      "官",
      "定",
      "宜",
      "客",
      "室",
      "宮",
      "家",
      "宿"
    ]
  },
  {
    "number": 41,
    "character": "寸",
    "hanViet": "THỐN",
    "hiragana": "すん",
    "positionType": "tsukuri",
    "meaning": "Đơn vị đo một tấc (khoảng cách mạch tay), mực thước, khuôn phép",
    "strokeCount": 3,
    "examples": [
      "寸",
      "寺",
      "対",
      "封",
      "専",
      "射",
      "尊",
      "導"
    ]
  },
  {
    "number": 42,
    "character": "小",
    "variant": "⺌ / ⺍",
    "hanViet": "TIỂU",
    "hiragana": "しょう",
    "meaning": "Nhỏ bé, ít ỏi, mảnh mai, chi tiết vụn vặt",
    "strokeCount": 3,
    "examples": [
      "小",
      "少",
      "劣",
      "当",
      "光",
      "肖",
      "尖"
    ]
  },
  {
    "number": 43,
    "character": "尢",
    "variant": "尣",
    "hanViet": "UỐNG",
    "hiragana": "だいのまげあし",
    "meaning": "Chân yếu, tật nguyền ở chân, què quặt",
    "strokeCount": 3,
    "examples": [
      "尤",
      "就",
      "尬"
    ]
  },
  {
    "number": 44,
    "character": "尸",
    "hanViet": "THI",
    "hiragana": "しかばね",
    "positionType": "tare",
    "meaning": "Tư thế người ngồi tĩnh lặng, thân xác, ranh giới gian phòng",
    "strokeCount": 3,
    "examples": [
      "尺",
      "尼",
      "尾",
      "局",
      "居",
      "屋",
      "展",
      "属",
      "層"
    ]
  },
  {
    "number": 45,
    "character": "屮",
    "hanViet": "TRIỆT",
    "hiragana": "てつ",
    "meaning": "Mầm non cây cỏ vừa nhú đâm chồi khỏi lòng đất",
    "strokeCount": 3,
    "examples": [
      "屯",
      "出"
    ]
  },
  {
    "number": 46,
    "character": "山",
    "hanViet": "SƠN",
    "hiragana": "やま",
    "meaning": "Ngọn núi cao với ba đỉnh chóp, sự tĩnh lặng kiên cố",
    "strokeCount": 3,
    "examples": [
      "山",
      "岐",
      "岩",
      "岸",
      "島",
      "崖",
      "崩",
      "岳",
      "嵐"
    ]
  },
  {
    "number": 47,
    "character": "巛",
    "variant": "川",
    "hanViet": "XUYÊN",
    "hiragana": "かわ",
    "meaning": "Dòng sông uốn lượn chảy xuôi, dòng chảy nước",
    "strokeCount": 3,
    "examples": [
      "川",
      "州",
      "巡",
      "巣",
      "順"
    ]
  },
  {
    "number": 48,
    "character": "工",
    "hanViet": "CÔNG",
    "hiragana": "たくみ",
    "meaning": "Thước thợ mộc: Kỹ nghệ thủ công, xây dựng, công việc",
    "strokeCount": 3,
    "examples": [
      "工",
      "左",
      "巧",
      "巨",
      "差",
      "功"
    ]
  },
  {
    "number": 49,
    "character": "己",
    "variant": "已 / 巳",
    "hanViet": "KỶ",
    "hiragana": "おのれ",
    "meaning": "Sợi chỉ cuộn gọn gàng, bản thân, can Kỷ",
    "strokeCount": 3,
    "examples": [
      "己",
      "已",
      "巳",
      "巴",
      "改",
      "忌",
      "記",
      "配"
    ]
  },
  {
    "number": 50,
    "character": "巾",
    "hanViet": "CÂN",
    "hiragana": "はば",
    "meaning": "Khăn vải dệt treo rủ xuống, trang phục dệt may",
    "strokeCount": 3,
    "examples": [
      "巾",
      "市",
      "布",
      "帆",
      "希",
      "席",
      "帯",
      "常",
      "帽",
      "幕"
    ]
  },
  {
    "number": 51,
    "character": "干",
    "hanViet": "CAN",
    "hiragana": "ほし",
    "meaning": "Cái khiên che đỡ, cọc chống, can thiệp, khô ráo",
    "strokeCount": 3,
    "examples": [
      "干",
      "平",
      "年",
      "幸",
      "幹"
    ]
  },
  {
    "number": 52,
    "character": "幺",
    "hanViet": "YÊU",
    "hiragana": "いとがしら",
    "meaning": "Sợi tơ tằm ngắn nhỏ mới kéo, bé bỏng non nớt",
    "strokeCount": 3,
    "examples": [
      "幻",
      "幼",
      "幽",
      "幾"
    ]
  },
  {
    "number": 53,
    "character": "广",
    "hanViet": "NGHIỄM",
    "hiragana": "まだれ",
    "positionType": "tare",
    "positionName": "Nghiễm (Mái nhà sườn đồi)",
    "meaning": "Mái nhà rộng xây tựa vào vách núi, nhà kho, dinh thự",
    "strokeCount": 3,
    "examples": [
      "庁",
      "広",
      "庄",
      "床",
      "底",
      "店",
      "府",
      "度",
      "座",
      "庫",
      "庭",
      "康"
    ]
  },
  {
    "number": 54,
    "character": "廴",
    "hanViet": "DẪN",
    "hiragana": "いんにょう",
    "positionType": "nyo",
    "positionName": "Dẫn (Bước dài)",
    "meaning": "Bước chân sải dài liên tục, dẫn dắt, kéo dài",
    "strokeCount": 3,
    "examples": [
      "延",
      "廷",
      "建",
      "廻"
    ]
  },
  {
    "number": 55,
    "character": "弋",
    "hanViet": "DẶC",
    "hiragana": "しぐるみ",
    "meaning": "Mũi tên có buộc dây săn bắn chim, cái cọc cắm tiêu",
    "strokeCount": 3,
    "examples": [
      "式",
      "弐",
      "弑"
    ]
  },
  {
    "number": 56,
    "character": "弓",
    "hanViet": "CUNG",
    "hiragana": "ゆみ",
    "meaning": "Cây cung uốn cong bật bắn tên, độ co giãn dẻo dai",
    "strokeCount": 3,
    "examples": [
      "弓",
      "引",
      "弘",
      "弟",
      "弦",
      "弱",
      "張",
      "強",
      "弾"
    ]
  },
  {
    "number": 57,
    "character": "彐",
    "variant": "彑",
    "hanViet": "KỆ",
    "hiragana": "けいがしら",
    "meaning": "Mõm con heo rừng ủi đất",
    "strokeCount": 3,
    "examples": [
      "当",
      "録",
      "彗",
      "尋",
      "帰"
    ]
  },
  {
    "number": 58,
    "character": "彡",
    "hanViet": "SAM",
    "hiragana": "さんづくり",
    "positionType": "tsukuri",
    "meaning": "Lông tóc dài mượt mà, hoa văn sắc nét óng ả",
    "strokeCount": 3,
    "examples": [
      "形",
      "彦",
      "彩",
      "彫",
      "影",
      "杉",
      "須"
    ]
  },
  {
    "number": 59,
    "character": "彳",
    "hanViet": "XÍCH",
    "hiragana": "ぎょうにんべん",
    "positionType": "hen",
    "positionName": "Xích (Bước chân ngắn trái)",
    "meaning": "Bước chân trái, bước đi chậm rãi, hành trình, cự ly",
    "strokeCount": 3,
    "examples": [
      "待",
      "役",
      "彼",
      "往",
      "征",
      "律",
      "後",
      "徐",
      "径",
      "徒",
      "得",
      "徳",
      "微",
      "徹",
      "徴"
    ]
  },
  {
    "number": 60,
    "character": "心",
    "variant": "忄 / ⺗",
    "hanViet": "TÂM",
    "hiragana": "りっしんべん",
    "positionType": "hen",
    "positionName": "Tâm (Trái tim / Tâm đứng)",
    "meaning": "Trái tim con người, cảm xúc tình cảm, ý thức, tấm lòng",
    "strokeCount": 4,
    "examples": [
      "心",
      "必",
      "志",
      "忘",
      "忙",
      "快",
      "思",
      "情",
      "感",
      "想",
      "愛",
      "態",
      "悪"
    ]
  },
  {
    "number": 61,
    "character": "戈",
    "hanViet": "QUA",
    "hiragana": "かのほこ",
    "positionType": "tsukuri",
    "meaning": "Cây giáo mác có lưỡi ngang, vũ khí chiến tranh",
    "strokeCount": 4,
    "examples": [
      "戊",
      "成",
      "我",
      "戒",
      "戦"
    ]
  },
  {
    "number": 62,
    "character": "戸",
    "hanViet": "HỘ",
    "hiragana": "とびらのと",
    "positionType": "tare",
    "meaning": "Cánh cửa đơn một cánh, căn nhà, hộ gia đình",
    "strokeCount": 4,
    "examples": [
      "戸",
      "戻",
      "房",
      "所",
      "扇",
      "扉"
    ]
  },
  {
    "number": 63,
    "character": "手",
    "variant": "扌",
    "hanViet": "THỦ",
    "hiragana": "てへん",
    "positionType": "hen",
    "positionName": "Thủ (Bàn tay)",
    "meaning": "Bàn tay con người, các thao tác nắm cầm kéo giữ",
    "strokeCount": 4,
    "examples": [
      "持",
      "打",
      "払",
      "投",
      "技",
      "押",
      "拾",
      "指",
      "接",
      "提",
      "損",
      "操"
    ]
  },
  {
    "number": 64,
    "character": "支",
    "hanViet": "CHI",
    "hiragana": "しにょう",
    "meaning": "Cành cây cầm trên tay, chi nhánh, nâng đỡ ủng hộ",
    "strokeCount": 4,
    "examples": [
      "支",
      "翅"
    ]
  },
  {
    "number": 65,
    "character": "攴",
    "variant": "攵",
    "hanViet": "PHỐC",
    "hiragana": "ぼくづくり",
    "positionType": "tsukuri",
    "positionName": "Phốc (Đánh khẽ)",
    "meaning": "Tay cầm que gõ nhẹ, thúc giục rèn luyện, hành động sửa chữa",
    "strokeCount": 4,
    "examples": [
      "改",
      "攻",
      "放",
      "政",
      "故",
      "教",
      "救",
      "敏",
      "散",
      "数"
    ]
  },
  {
    "number": 66,
    "character": "文",
    "hanViet": "VĂN",
    "hiragana": "ぶん",
    "meaning": "Hoa văn xăm mình cổ xưa, chữ viết, văn hóa, văn học",
    "strokeCount": 4,
    "examples": [
      "文",
      "斉",
      "斑",
      "対"
    ]
  },
  {
    "number": 67,
    "character": "斗",
    "hanViet": "ĐẨU",
    "hiragana": "ますづくり",
    "meaning": "Cái đấu đong thóc gạo, chòm sao Bắc Đẩu",
    "strokeCount": 4,
    "examples": [
      "料",
      "斜",
      "斡"
    ]
  },
  {
    "number": 68,
    "character": "斤",
    "hanViet": "CÂN",
    "hiragana": "おのづくり",
    "positionType": "tsukuri",
    "meaning": "Chiếc rìu chặt gỗ, đơn vị đo cân lường thời xưa",
    "strokeCount": 4,
    "examples": [
      "斥",
      "斧",
      "断",
      "斯",
      "新"
    ]
  },
  {
    "number": 69,
    "character": "方",
    "hanViet": "PHƯƠNG",
    "hiragana": "ほうへん",
    "positionType": "hen",
    "meaning": "Hai chiếc thuyền ghép đôi: Phương hướng, phương pháp, vuông vức",
    "strokeCount": 4,
    "examples": [
      "方",
      "於",
      "施",
      "旅",
      "旋",
      "族",
      "旗"
    ]
  },
  {
    "number": 70,
    "character": "无",
    "variant": "旡",
    "hanViet": "VÔ",
    "hiragana": "なし",
    "meaning": "Không có, phủ định, trống rỗng",
    "strokeCount": 4,
    "examples": [
      "既"
    ]
  },
  {
    "number": 71,
    "character": "日",
    "hanViet": "NHẬT",
    "hiragana": "にち",
    "meaning": "Mặt trời rực sáng, ngày tháng, thời gian, ánh ban ngày",
    "strokeCount": 4,
    "examples": [
      "日",
      "早",
      "旬",
      "明",
      "易",
      "昔",
      "星",
      "春",
      "昨",
      "昼",
      "時",
      "晩",
      "晴",
      "暖",
      "暗"
    ]
  },
  {
    "number": 72,
    "character": "曰",
    "hanViet": "VIẾT",
    "hiragana": "ひらび",
    "meaning": "Miệng mở ra thốt lời: Nói rằng, bảo rằng",
    "strokeCount": 4,
    "examples": [
      "曰",
      "曲",
      "更",
      "書",
      "曹",
      "曾",
      "替"
    ]
  },
  {
    "number": 73,
    "character": "月",
    "variant": "⺼",
    "hanViet": "NGUYỆT / NHỤC",
    "hiragana": "つきへん",
    "positionType": "hen",
    "positionName": "Nguyệt / Nhục (Trăng / Thịt)",
    "meaning": "Vầng trăng sáng ban đêm hoặc biến thể của bộ Nhục (thịt bắp, cơ thể người)",
    "strokeCount": 4,
    "examples": [
      "月",
      "期",
      "服",
      "朝",
      "朗",
      "望",
      "肌",
      "肝",
      "育",
      "肺",
      "胃",
      "胆",
      "胸",
      "脂",
      "脳"
    ]
  },
  {
    "number": 74,
    "character": "木",
    "hanViet": "MỘC",
    "hiragana": "きへん",
    "positionType": "hen",
    "positionName": "Mộc (Cây cối)",
    "meaning": "Cây thân gỗ đâm rễ tỏa cành, thực vật gỗ, cây cối",
    "strokeCount": 4,
    "examples": [
      "木",
      "本",
      "杉",
      "村",
      "林",
      "松",
      "板",
      "枚",
      "枝",
      "枯",
      "柄",
      "校",
      "根",
      "森",
      "植",
      "極",
      "機",
      "樹"
    ]
  },
  {
    "number": 75,
    "character": "欠",
    "hanViet": "KHIẾM",
    "hiragana": "あくび",
    "positionType": "tsukuri",
    "meaning": "Người há miệng ngáp: Thiếu thốn, hụt hẫng, khuyết điểm",
    "strokeCount": 4,
    "examples": [
      "次",
      "欲",
      "欺",
      "款",
      "歌",
      "歓"
    ]
  },
  {
    "number": 76,
    "character": "止",
    "hanViet": "CHỈ",
    "hiragana": "とめる",
    "meaning": "Bàn chân đứng yên một chỗ: Dừng lại, đình chỉ, ngăn chặn",
    "strokeCount": 4,
    "examples": [
      "止",
      "正",
      "此",
      "歩",
      "武",
      "歳",
      "歴"
    ]
  },
  {
    "number": 77,
    "character": "歹",
    "variant": "歺",
    "hanViet": "ĐÃI",
    "hiragana": "いちたへん",
    "positionType": "hen",
    "meaning": "Xương tàn mục nát: Cái chết, tai họa, tàn lụi",
    "strokeCount": 4,
    "examples": [
      "死",
      "殆",
      "殉",
      "殊",
      "残",
      "殖"
    ]
  },
  {
    "number": 78,
    "character": "殳",
    "hanViet": "THÙ",
    "hiragana": "るまた",
    "positionType": "tsukuri",
    "meaning": "Cây gậy tre dùng để đập đánh, hành động xua đuổi",
    "strokeCount": 4,
    "examples": [
      "段",
      "殷",
      "殺",
      "殻",
      "殿"
    ]
  },
  {
    "number": 79,
    "character": "毋",
    "variant": "母",
    "hanViet": "VÔ / MẪU",
    "hiragana": "はは",
    "meaning": "Người mẹ cho con bú (Mẫu) hoặc Chớ, đừng (Vô)",
    "strokeCount": 4,
    "examples": [
      "母",
      "毎",
      "毒"
    ]
  },
  {
    "number": 80,
    "character": "比",
    "hanViet": "TỶ",
    "hiragana": "くらべる",
    "meaning": "Hai người đứng liền kề: So sánh, kề cận, tỉ lệ",
    "strokeCount": 4,
    "examples": [
      "比",
      "皆",
      "昆",
      "毘"
    ]
  },
  {
    "number": 81,
    "character": "毛",
    "hanViet": "MAO",
    "hiragana": "け",
    "meaning": "Lông thú, tóc mai, sợi tơ mao mềm mịn",
    "strokeCount": 4,
    "examples": [
      "毛",
      "毬",
      "毫"
    ]
  },
  {
    "number": 82,
    "character": "氏",
    "hanViet": "THỊ",
    "hiragana": "うじ",
    "meaning": "Dòng họ, thị tộc, người sáng lập chi họ",
    "strokeCount": 4,
    "examples": [
      "氏",
      "民",
      "氓"
    ]
  },
  {
    "number": 83,
    "character": "气",
    "hanViet": "KHÍ",
    "hiragana": "きがまえ",
    "positionType": "kamae",
    "meaning": "Hơi sương mây bốc lên, khí oxy, năng lượng sinh khí",
    "strokeCount": 4,
    "examples": [
      "気",
      "氛",
      "汽"
    ]
  },
  {
    "number": 84,
    "character": "水",
    "variant": "氵 / 氺",
    "hanViet": "THỦY",
    "hiragana": "さんずい",
    "positionType": "hen",
    "positionName": "Thủy (Ba chấm nước)",
    "meaning": "Nước, sông hồ biển cả, chất lỏng, sự trôi chảy",
    "strokeCount": 4,
    "examples": [
      "水",
      "江",
      "池",
      "決",
      "油",
      "波",
      "注",
      "泳",
      "洋",
      "洗",
      "流",
      "海",
      "消",
      "涼",
      "深",
      "清",
      "温",
      "港",
      "湖",
      "満"
    ]
  },
  {
    "number": 85,
    "character": "火",
    "variant": "灬",
    "hanViet": "HỎA",
    "hiragana": "ひへん",
    "positionType": "hen",
    "positionName": "Hỏa (Lửa / Bốn chấm lửa)",
    "meaning": "Ngọn lửa bốc cháy, hơi nóng nhiệt độ, nấu nướng, thiêu đốt",
    "strokeCount": 4,
    "examples": [
      "火",
      "灯",
      "灰",
      "災",
      "炎",
      "炊",
      "炭",
      "点",
      "烈",
      "熱",
      "然",
      "照",
      "熟",
      "燃"
    ]
  },
  {
    "number": 86,
    "character": "爪",
    "variant": "爫",
    "hanViet": "TRẢO",
    "hiragana": "つめ",
    "positionType": "kanmuri",
    "meaning": "Móng vuốt thú dữ, bàn tay cào chụp từ trên xuống",
    "strokeCount": 4,
    "examples": [
      "争",
      "妥",
      "受",
      "爰",
      "采",
      "愛"
    ]
  },
  {
    "number": 87,
    "character": "父",
    "hanViet": "PHỤ",
    "hiragana": "ちち",
    "positionType": "kanmuri",
    "meaning": "Bàn tay cầm roi dạy bảo: Người cha, bậc tôn trưởng",
    "strokeCount": 4,
    "examples": [
      "父",
      "爺",
      "釜"
    ]
  },
  {
    "number": 88,
    "character": "爻",
    "hanViet": "HÀO",
    "hiragana": "こう",
    "meaning": "Các vạch âm dương đan chéo nhau trong quẻ Kinh Dịch",
    "strokeCount": 4,
    "examples": [
      "爽",
      "爾"
    ]
  },
  {
    "number": 89,
    "character": "爿",
    "variant": "丬",
    "hanViet": "TƯỜNG",
    "hiragana": "しょうへん",
    "positionType": "hen",
    "meaning": "Tấm ván gỗ xẻ đôi bên trái, cái giường ngủ",
    "strokeCount": 4,
    "examples": [
      "床",
      "壮",
      "状",
      "将"
    ]
  },
  {
    "number": 90,
    "character": "片",
    "hanViet": "PHIẾN",
    "hiragana": "かたへん",
    "positionType": "hen",
    "meaning": "Mảnh ván gỗ xẻ bên phải, phiến đá, mỏng manh một phía",
    "strokeCount": 4,
    "examples": [
      "片",
      "版",
      "牌"
    ]
  },
  {
    "number": 91,
    "character": "牙",
    "hanViet": "NHA",
    "hiragana": "きば",
    "meaning": "Răng nanh nhọn cắn xé của loài thú",
    "strokeCount": 4,
    "examples": [
      "牙",
      "邪",
      "雅"
    ]
  },
  {
    "number": 92,
    "character": "牛",
    "variant": "牜",
    "hanViet": "NGƯU",
    "hiragana": "うしへん",
    "positionType": "hen",
    "positionName": "Ngưu (Con trâu/bò)",
    "meaning": "Con trâu, con bò, sức kéo nông nghiệp, vật hiến tế",
    "strokeCount": 4,
    "examples": [
      "特",
      "牛",
      "牢",
      "牧",
      "物",
      "牲",
      "牽",
      "犠"
    ]
  },
  {
    "number": 93,
    "character": "犬",
    "variant": "犭",
    "hanViet": "KHUYỂN",
    "hiragana": "けものへん",
    "positionType": "hen",
    "positionName": "Khuyển (Chó / Thú)",
    "meaning": "Con chó, loài dã thú hoang dã",
    "strokeCount": 4,
    "examples": [
      "犬",
      "犯",
      "状",
      "狂",
      "狩",
      "独",
      "狭",
      "猛",
      "猟",
      "猫"
    ]
  },
  {
    "number": 94,
    "character": "玄",
    "hanViet": "HUYỀN",
    "hiragana": "げん",
    "meaning": "Màu đen sâu thẳm, huyền ảo, huyền bí",
    "strokeCount": 5,
    "examples": [
      "玄",
      "弦",
      "率"
    ]
  },
  {
    "number": 95,
    "character": "玉",
    "variant": "王",
    "hanViet": "NGỌC",
    "hiragana": "たま",
    "positionType": "hen",
    "positionName": "Ngọc (Đá quý / Vua)",
    "meaning": "Viên đá ngọc quý sáng, sự tôn quý của bậc vương giả",
    "strokeCount": 5,
    "examples": [
      "王",
      "玉",
      "宝",
      "珍",
      "珠",
      "球",
      "現",
      "理",
      "望",
      "環"
    ]
  },
  {
    "number": 96,
    "character": "瓜",
    "hanViet": "QUA",
    "hiragana": "うり",
    "meaning": "Dây bầu leo đậu quả dưa tròn trịa",
    "strokeCount": 5,
    "examples": [
      "瓜",
      "瓢",
      "瓣"
    ]
  },
  {
    "number": 97,
    "character": "瓦",
    "hanViet": "NGÕA",
    "hiragana": "かわら",
    "meaning": "Viên ngói nung bằng đất sét để lợp mái nhà",
    "strokeCount": 5,
    "examples": [
      "瓦",
      "瓶",
      "甄"
    ]
  },
  {
    "number": 98,
    "character": "甘",
    "hanViet": "CAM",
    "hiragana": "あまい",
    "meaning": "Vị ngọt trong vòm họng, sự êm dịu dễ chịu",
    "strokeCount": 5,
    "examples": [
      "甘",
      "甚",
      "甜"
    ]
  },
  {
    "number": 99,
    "character": "生",
    "hanViet": "SINH",
    "hiragana": "うまれる",
    "meaning": "Mầm non vươn lên: Sinh sôi, nảy nở, cuộc sống, tươi mới",
    "strokeCount": 5,
    "examples": [
      "生",
      "産",
      "甥",
      "甦"
    ]
  },
  {
    "number": 100,
    "character": "用",
    "hanViet": "DỤNG",
    "hiragana": "もちいる",
    "meaning": "Cái xô cái chậu: Sử dụng, ứng dụng, hiệu quả công năng",
    "strokeCount": 5,
    "examples": [
      "用",
      "甫",
      "甬"
    ]
  },
  {
    "number": 101,
    "character": "田",
    "hanViet": "ĐIỀN",
    "hiragana": "た",
    "meaning": "Ruộng lúa chia 4 ô bờ thửa vuông vắn, nghề nông",
    "strokeCount": 5,
    "examples": [
      "田",
      "町",
      "男",
      "界",
      "留",
      "略",
      "番",
      "異",
      "画",
      "当"
    ]
  },
  {
    "number": 102,
    "character": "疋",
    "variant": "𤴔",
    "hanViet": "SƠ / THẤT",
    "hiragana": "ひき",
    "meaning": "Bắp chân và bàn chân người, đơn vị cuộn vải",
    "strokeCount": 5,
    "examples": [
      "疋",
      "疎",
      "疑"
    ]
  },
  {
    "number": 103,
    "character": "疒",
    "hanViet": "NỆCH",
    "hiragana": "やまいだれ",
    "positionType": "tare",
    "positionName": "Nệch (Bệnh tật)",
    "meaning": "Người ốm sốt nằm trên giường bệnh: Bệnh tật, đau đớn",
    "strokeCount": 5,
    "examples": [
      "病",
      "疫",
      "疲",
      "痛",
      "症",
      "療",
      "痴",
      "痛",
      "療"
    ]
  },
  {
    "number": 104,
    "character": "癶",
    "hanViet": "BÁT",
    "hiragana": "はつがしら",
    "positionType": "kanmuri",
    "meaning": "Hai bàn chân xoay ngược lưng về nhau: Leo trèo, dẫm lên",
    "strokeCount": 5,
    "examples": [
      "発",
      "登",
      "癸"
    ]
  },
  {
    "number": 105,
    "character": "白",
    "hanViet": "BẠCH",
    "hiragana": "しろ",
    "meaning": "Hạt gạo trắng ngần, màu trắng tinh khôi, sáng tỏ",
    "strokeCount": 5,
    "examples": [
      "白",
      "百",
      "的",
      "皆",
      "皇",
      "泉",
      "魄"
    ]
  },
  {
    "number": 106,
    "character": "皮",
    "hanViet": "BÌ",
    "hiragana": "けがわ",
    "meaning": "Bàn tay cầm dao lột tấm da thú: Lớp da ngoài, vỏ bọc",
    "strokeCount": 5,
    "examples": [
      "皮",
      "波",
      "破",
      "彼",
      "被"
    ]
  },
  {
    "number": 107,
    "character": "皿",
    "hanViet": "MÃNH",
    "hiragana": "さら",
    "positionType": "ashi",
    "meaning": "Cái đĩa nông đáy đựng thức ăn cúng lễ",
    "strokeCount": 5,
    "examples": [
      "盆",
      "益",
      "盗",
      "盛",
      "盟",
      "監",
      "盤"
    ]
  },
  {
    "number": 108,
    "character": "目",
    "variant": "⺫",
    "hanViet": "MỤC",
    "hiragana": "め",
    "positionType": "hen",
    "positionName": "Mục (Con mắt)",
    "meaning": "Con mắt với con ngươi: Thị giác, nhìn nhận, mục lục, quan sát",
    "strokeCount": 5,
    "examples": [
      "見",
      "目",
      "盲",
      "相",
      "盾",
      "省",
      "看",
      "県",
      "真",
      "眠",
      "眼",
      "着",
      "眺"
    ]
  },
  {
    "number": 109,
    "character": "矛",
    "hanViet": "MÂU",
    "hiragana": "ほこ",
    "meaning": "Cây giáo mác dài có mũi nhọn đâm xuyên, mâu thuẫn",
    "strokeCount": 5,
    "examples": [
      "矛",
      "柔",
      "務",
      "矜"
    ]
  },
  {
    "number": 110,
    "character": "矢",
    "hanViet": "THỈ",
    "hiragana": "や",
    "meaning": "Mũi tên bay vút đi nhanh chóng, sự chuẩn xác ngay thẳng",
    "strokeCount": 5,
    "examples": [
      "矢",
      "知",
      "短",
      "矯",
      "矩"
    ]
  },
  {
    "number": 111,
    "character": "石",
    "hanViet": "THẠCH",
    "hiragana": "いし",
    "positionType": "hen",
    "meaning": "Hòn đá rơi dưới sườn núi: Đá tảng, sự rắn chắc vững bền",
    "strokeCount": 5,
    "examples": [
      "石",
      "砂",
      "研",
      "破",
      "確",
      "磁",
      "岩",
      "砲"
    ]
  },
  {
    "number": 112,
    "character": "示",
    "variant": "礻",
    "hanViet": "THỊ / KỲ",
    "hiragana": "しめす",
    "positionType": "hen",
    "positionName": "Thị (Thần linh / Chỉ dẫn)",
    "meaning": "Bàn thờ tế trời đất: Thần linh, lễ bái, chỉ dẫn điềm lành",
    "strokeCount": 5,
    "examples": [
      "礼",
      "社",
      "祈",
      "祉",
      "祝",
      "神",
      "票",
      "祭",
      "禁",
      "福",
      "禅"
    ]
  },
  {
    "number": 113,
    "character": "禸",
    "hanViet": "NHỰU",
    "hiragana": "ぐうのあし",
    "meaning": "Dấu vết chân con thú dẫm trên đất mềm",
    "strokeCount": 5,
    "examples": [
      "禹",
      "離"
    ]
  },
  {
    "number": 114,
    "character": "禾",
    "hanViet": "HÒA",
    "hiragana": "のぎへん",
    "positionType": "hen",
    "positionName": "Hòa (Bông lúa)",
    "meaning": "Cây lúa trĩu hạt uốn cong ngọn: Lương thực nông nghiệp, ngũ cốc",
    "strokeCount": 5,
    "examples": [
      "禾",
      "利",
      "私",
      "季",
      "科",
      "秋",
      "秒",
      "租",
      "秩",
      "称",
      "移",
      "程",
      "種",
      "積",
      "税"
    ]
  },
  {
    "number": 115,
    "character": "穴",
    "hanViet": "HUYỆT",
    "hiragana": "あなかんむり",
    "positionType": "kanmuri",
    "positionName": "Huyệt (Hang động)",
    "meaning": "Hang hốc khoét sâu trong lòng đất, chỗ trũng sâu",
    "strokeCount": 5,
    "examples": [
      "究",
      "空",
      "突",
      "窓",
      "窮",
      "窒",
      "窃"
    ]
  },
  {
    "number": 116,
    "character": "立",
    "hanViet": "LẬP",
    "hiragana": "たつ",
    "meaning": "Người đứng vững vàng hai chân trên mặt đất: Thiết lập, đứng thẳng",
    "strokeCount": 5,
    "examples": [
      "立",
      "站",
      "竜",
      "章",
      "童",
      "端",
      "競"
    ]
  },
  {
    "number": 117,
    "character": "竹",
    "variant": "⺮",
    "hanViet": "TRÚC",
    "hiragana": "たけかんむり",
    "positionType": "kanmuri",
    "positionName": "Trúc (Cây tre)",
    "meaning": "Hai nhánh lá tre rủ xuống: Cây tre, đồ dùng tre trúc, sáo bút",
    "strokeCount": 6,
    "examples": [
      "竿",
      "笑",
      "笛",
      "第",
      "筆",
      "等",
      "筋",
      "策",
      "答",
      "節",
      "範",
      "箱",
      "簡"
    ]
  },
  {
    "number": 118,
    "character": "米",
    "hanViet": "MỄ",
    "hiragana": "こめ",
    "positionType": "hen",
    "meaning": "Hạt gạo nở bốn góc: Gạo trắng, lương thực tinh bột chính",
    "strokeCount": 6,
    "examples": [
      "米",
      "粉",
      "粒",
      "粗",
      "粘",
      "精",
      "糖",
      "糧"
    ]
  },
  {
    "number": 119,
    "character": "糸",
    "variant": "糹",
    "hanViet": "MỊCH",
    "hiragana": "いと",
    "positionType": "hen",
    "positionName": "Mịch (Sợi tơ)",
    "meaning": "Cuộn tơ tằm thắt nút: Sợi dây, may mặc, kết nối ràng buộc",
    "strokeCount": 6,
    "examples": [
      "系",
      "約",
      "級",
      "紅",
      "紀",
      "納",
      "純",
      "紙",
      "紛",
      "素",
      "索",
      "緊",
      "累",
      "細",
      "結",
      "終",
      "給",
      "統",
      "絶",
      "継",
      "続",
      "績",
      "線"
    ]
  },
  {
    "number": 120,
    "character": "缶",
    "hanViet": "PHẪU",
    "hiragana": "ほとぎ",
    "meaning": "Bình đất nung đựng rượu nước, đồ hộp kim loại",
    "strokeCount": 6,
    "examples": [
      "缶",
      "缺",
      "罐"
    ]
  },
  {
    "number": 121,
    "character": "网",
    "variant": "罒 / ⺫",
    "hanViet": "VÕNG",
    "hiragana": "あみがしら",
    "positionType": "kanmuri",
    "meaning": "Tấm lưới đánh cá giăng bắt thú, luật lệ quy định",
    "strokeCount": 6,
    "examples": [
      "罪",
      "置",
      "罰",
      "署",
      "罷",
      "羅"
    ]
  },
  {
    "number": 122,
    "character": "羊",
    "variant": "⺷, ⺶, ⺱, ⺲, ⺳",
    "hanViet": "DƯƠNG",
    "hiragana": "ひつじ",
    "meaning": "Con cừu, con dê có hai sừng cong: Sự hiền lành, cát tường tốt lành",
    "strokeCount": 6,
    "examples": [
      "羊",
      "美",
      "着",
      "群",
      "義",
      "養",
      "善"
    ]
  },
  {
    "number": 123,
    "character": "羽",
    "hanViet": "VŨ",
    "hiragana": "はね",
    "meaning": "Hai chiếc lông cánh chim xòe ra: Đôi cánh, bay lượn",
    "strokeCount": 6,
    "examples": [
      "羽",
      "翁",
      "翌",
      "習",
      "翔",
      "翼"
    ]
  },
  {
    "number": 124,
    "character": "老",
    "variant": "耂",
    "hanViet": "LÃO",
    "hiragana": "おいかんむり",
    "positionType": "kanmuri",
    "meaning": "Cụ già lưng còng tóc dài chống gậy: Tuổi già, kinh nghiệm lâu năm",
    "strokeCount": 6,
    "examples": [
      "老",
      "考",
      "者",
      "耆"
    ]
  },
  {
    "number": 125,
    "character": "而",
    "hanViet": "NHI",
    "hiragana": "しかして",
    "meaning": "Chùm râu cằm dài buông xuống, mà, lại còn",
    "strokeCount": 6,
    "examples": [
      "而",
      "耐"
    ]
  },
  {
    "number": 126,
    "character": "耒",
    "hanViet": "LỖI",
    "hiragana": "すきへん",
    "positionType": "hen",
    "meaning": "Cái cày gỗ rẽ luống cày đất nông nghiệp",
    "strokeCount": 6,
    "examples": [
      "耕",
      "耗",
      "籍"
    ]
  },
  {
    "number": 127,
    "character": "耳",
    "hanViet": "NHĨ",
    "hiragana": "みみ",
    "positionType": "hen",
    "meaning": "Vành tai con người: Thính giác, lắng nghe, nghe ngóng",
    "strokeCount": 6,
    "examples": [
      "耳",
      "取",
      "聞",
      "職",
      "聖",
      "聚",
      "聴"
    ]
  },
  {
    "number": 128,
    "character": "聿",
    "variant": "⺻",
    "hanViet": "DUẬT",
    "hiragana": "ふでづくり",
    "meaning": "Bàn tay cầm bút lông đứng thẳng để viết chữ",
    "strokeCount": 6,
    "examples": [
      "律",
      "書",
      "津",
      "粛",
      "建"
    ]
  },
  {
    "number": 129,
    "character": "肉",
    "variant": "⺼",
    "hanViet": "NHỤC",
    "hiragana": "にく",
    "positionType": "hen",
    "meaning": "Miếng thịt bắp có thớ cơ, thân thể con người",
    "strokeCount": 6,
    "examples": [
      "肉",
      "股",
      "肥",
      "肩",
      "胸",
      "背"
    ]
  },
  {
    "number": 130,
    "character": "臣",
    "hanViet": "THẦN",
    "hiragana": "しん",
    "meaning": "Con mắt cúi đầu nhìn xuống: Bề tôi trung thành, quan thần",
    "strokeCount": 6,
    "examples": [
      "臣",
      "臨",
      "蔵",
      "臥"
    ]
  },
  {
    "number": 131,
    "character": "自",
    "hanViet": "TỰ",
    "hiragana": "みずから",
    "meaning": "Chiếc mũi nhô ra: Tự bản thân mình, xuất phát từ",
    "strokeCount": 6,
    "examples": [
      "自",
      "臭",
      "息"
    ]
  },
  {
    "number": 132,
    "character": "至",
    "hanViet": "CHÍ",
    "hiragana": "いたる",
    "meaning": "Mũi tên bay cắm xuống mặt đất: Đến nơi, đạt tới đỉnh điểm",
    "strokeCount": 6,
    "examples": [
      "至",
      "致",
      "室",
      "倒"
    ]
  },
  {
    "number": 133,
    "character": "臼",
    "hanViet": "CỐI",
    "hiragana": "うす",
    "meaning": "Cái cối giã gạo khoét rỗng lòng",
    "strokeCount": 6,
    "examples": [
      "臼",
      "興",
      "輿",
      "舂"
    ]
  },
  {
    "number": 134,
    "character": "舌",
    "hanViet": "THIỆT",
    "hiragana": "した",
    "meaning": "Chiếc lưỡi thò ra khỏi miệng: Hương vị nếm, lời ăn tiếng nói",
    "strokeCount": 6,
    "examples": [
      "舌",
      "乱",
      "辞",
      "話",
      "活"
    ]
  },
  {
    "number": 135,
    "character": "舛",
    "hanViet": "SUYỄN",
    "hiragana": "ます",
    "meaning": "Hai bàn chân bước ngược chiều nhau: Sai lệch, trái ngược",
    "strokeCount": 6,
    "examples": [
      "舛",
      "舞"
    ]
  },
  {
    "number": 136,
    "character": "舟",
    "hanViet": "CHU",
    "hiragana": "ふねへん",
    "positionType": "hen",
    "meaning": "Con thuyền gỗ độc mộc trôi trên sông: Tàu thuyền, hàng hải",
    "strokeCount": 6,
    "examples": [
      "舟",
      "航",
      "船",
      "艇",
      "艦"
    ]
  },
  {
    "number": 137,
    "character": "艮",
    "hanViet": "CẤN",
    "hiragana": "うしとら",
    "meaning": "Mắt ngoảnh lại trừng trừng: Quẻ Cấn, kiên cố, ngừng lại",
    "strokeCount": 6,
    "examples": [
      "良",
      "艱"
    ]
  },
  {
    "number": 138,
    "character": "色",
    "hanViet": "SẮC",
    "hiragana": "いろ",
    "meaning": "Sắc thái nét mặt con người, màu sắc thị giác, dung mạo",
    "strokeCount": 6,
    "examples": [
      "色",
      "艶"
    ]
  },
  {
    "number": 139,
    "character": "艸",
    "variant": "艹",
    "hanViet": "THẢO",
    "hiragana": "くさかんむり",
    "positionType": "kanmuri",
    "positionName": "Thảo (Cỏ cây)",
    "meaning": "Cỏ cây hoa lá mọc xanh tốt, thực vật thảo mộc",
    "strokeCount": 6,
    "examples": [
      "花",
      "茶",
      "草",
      "若",
      "苦",
      "英",
      "荷",
      "落",
      "葉",
      "薬",
      "芸",
      "芽"
    ]
  },
  {
    "number": 140,
    "character": "虍",
    "hanViet": "HÔ",
    "hiragana": "とらがしら",
    "positionType": "kanmuri",
    "positionName": "Hô (Vằn hổ)",
    "meaning": "Bộ da vằn và tư thế vồ mồi của chúa sơn lâm cọp hổ",
    "strokeCount": 6,
    "examples": [
      "虎",
      "虐",
      "虚",
      "虜"
    ]
  },
  {
    "number": 141,
    "character": "虫",
    "hanViet": "TRÙNG",
    "hiragana": "むしへん",
    "positionType": "hen",
    "positionName": "Trùng (Sâu bọ)",
    "meaning": "Loài sâu bọ, côn trùng, bò sát nhỏ",
    "strokeCount": 6,
    "examples": [
      "虫",
      "蚊",
      "蚕",
      "蛇",
      "蛍",
      "蛮",
      "融"
    ]
  },
  {
    "number": 142,
    "character": "血",
    "hanViet": "HUYẾT",
    "hiragana": "ち",
    "meaning": "Giọt máu tươi trong bát dâng tế thần linh: Huyết quản, sinh mệnh",
    "strokeCount": 6,
    "examples": [
      "血",
      "衆"
    ]
  },
  {
    "number": 143,
    "character": "行",
    "hanViet": "HÀNH",
    "hiragana": "ぎょう",
    "meaning": "Ngã tư đường lớn giao nhau: Đi lại, thực hiện, hành trình",
    "strokeCount": 6,
    "examples": [
      "行",
      "街",
      "衛",
      "衝",
      "術"
    ]
  },
  {
    "number": 144,
    "character": "衣",
    "variant": "衤",
    "hanViet": "Y",
    "hiragana": "ころもへん",
    "positionType": "hen",
    "positionName": "Y (Áo xiêm)",
    "meaning": "Áo che thân cổ chéo: Quần áo, trang phục may mặc",
    "strokeCount": 6,
    "examples": [
      "衣",
      "初",
      "被",
      "裂",
      "装",
      "裕",
      "補",
      "裸",
      "複",
      "製",
      "袋"
    ]
  },
  {
    "number": 145,
    "character": "襾",
    "variant": "西 / 覀",
    "hanViet": "Á",
    "hiragana": "おおいかんむり",
    "positionType": "kanmuri",
    "meaning": "Cái nắp đậy khép kín, phương Tây",
    "strokeCount": 6,
    "examples": [
      "西",
      "要",
      "覆",
      "覇"
    ]
  },
  {
    "number": 146,
    "character": "見",
    "hanViet": "KIẾN",
    "hiragana": "みる",
    "positionType": "tsukuri",
    "positionName": "Kiến (Nhìn thấy)",
    "meaning": "Con mắt (Mục) đặt trên đôi chân người (Nhi): Trông thấy, quan sát, ý kiến",
    "strokeCount": 7,
    "examples": [
      "見",
      "規",
      "視",
      "覚",
      "親",
      "観",
      "覗"
    ]
  },
  {
    "number": 147,
    "character": "角",
    "hanViet": "GIÁC",
    "hiragana": "つの",
    "meaning": "Cái sừng nhọn của loài động vật, góc cạnh",
    "strokeCount": 7,
    "examples": [
      "角",
      "触",
      "解"
    ]
  },
  {
    "number": 148,
    "character": "言",
    "variant": "訁",
    "hanViet": "NGÔN",
    "hiragana": "ごんべん",
    "positionType": "hen",
    "positionName": "Ngôn (Lời nói)",
    "meaning": "Lời nói thốt ra từ đáy lòng, ngôn ngữ, đàm thoại",
    "strokeCount": 7,
    "examples": [
      "言",
      "計",
      "訓",
      "記",
      "討",
      "訪",
      "設",
      "許",
      "訳",
      "証",
      "試",
      "詩",
      "話",
      "誓",
      "語",
      "誠",
      "説",
      "読",
      "調",
      "談",
      "請",
      "論",
      "諸"
    ]
  },
  {
    "number": 149,
    "character": "谷",
    "hanViet": "CỐC",
    "hiragana": "たに",
    "meaning": "Khe suối chảy giữa hai vách núi cao: Thung lũng",
    "strokeCount": 7,
    "examples": [
      "谷",
      "欲",
      "谿"
    ]
  },
  {
    "number": 150,
    "character": "豆",
    "hanViet": "ĐẬU",
    "hiragana": "まめ",
    "meaning": "Bát đựng thức ăn cúng có chân cao, hạt đậu",
    "strokeCount": 7,
    "examples": [
      "豆",
      "豊",
      "頭",
      "短"
    ]
  },
  {
    "number": 151,
    "character": "豕",
    "hanViet": "THỈ",
    "hiragana": "いのこ",
    "meaning": "Con heo, con lợn béo tròn bốn chân ngắn",
    "strokeCount": 7,
    "examples": [
      "豚",
      "象",
      "豪"
    ]
  },
  {
    "number": 152,
    "character": "豸",
    "hanViet": "TRÃI",
    "hiragana": "むじなへん",
    "positionType": "hen",
    "meaning": "Loài thú săn mồi không có sừng, sống lưng dài",
    "strokeCount": 7,
    "examples": [
      "豹",
      "貌"
    ]
  },
  {
    "number": 153,
    "character": "貝",
    "hanViet": "BỐI",
    "hiragana": "かいへん",
    "positionType": "hen",
    "positionName": "Bối (Vỏ sò tiền tệ)",
    "meaning": "Vỏ ốc biển thời cổ dùng làm tiền tệ: Của cải, tài sản, buôn bán",
    "strokeCount": 7,
    "examples": [
      "貝",
      "財",
      "貧",
      "販",
      "貯",
      "貴",
      "買",
      "貸",
      "費",
      "貿",
      "賃",
      "賞",
      "質",
      "賛",
      "贈"
    ]
  },
  {
    "number": 154,
    "character": "赤",
    "hanViet": "XÍCH",
    "hiragana": "あか",
    "meaning": "Màu đỏ rực rỡ của than lửa hồng, lòng son trong sạch",
    "strokeCount": 7,
    "examples": [
      "赤",
      "赦",
      "赫"
    ]
  },
  {
    "number": 155,
    "character": "走",
    "variant": "赱",
    "hanViet": "TẨU",
    "hiragana": "そうにょう",
    "positionType": "nyo",
    "positionName": "Tẩu (Chạy nhanh)",
    "meaning": "Người vung tay cất bước chạy gấp gáp",
    "strokeCount": 7,
    "examples": [
      "走",
      "赴",
      "起",
      "越",
      "超",
      "趣"
    ]
  },
  {
    "number": 156,
    "character": "足",
    "variant": "𧾷",
    "hanViet": "TÚC",
    "hiragana": "あしへん",
    "positionType": "hen",
    "positionName": "Túc (Bàn chân)",
    "meaning": "Cẳng chân và bàn chân: Đi đứng, đầy đủ sung túc",
    "strokeCount": 7,
    "examples": [
      "足",
      "距",
      "跡",
      "路",
      "跳",
      "踏",
      "踊",
      "践"
    ]
  },
  {
    "number": 157,
    "character": "身",
    "hanViet": "THÂN",
    "hiragana": "みへん",
    "positionType": "hen",
    "meaning": "Hình dáng phụ nữ mang bầu: Thân thể, tấm thân, bản thân",
    "strokeCount": 7,
    "examples": [
      "身",
      "射",
      "躬",
      "躯"
    ]
  },
  {
    "number": 158,
    "character": "車",
    "hanViet": "XA",
    "hiragana": "くるまへん",
    "positionType": "hen",
    "positionName": "Xa (Xe cộ)",
    "meaning": "Cỗ xe hai bánh có trục ngang: Xe cộ, vận chuyển chuyên chở",
    "strokeCount": 7,
    "examples": [
      "車",
      "軌",
      "軍",
      "軒",
      "軟",
      "転",
      "軸",
      "軽",
      "較",
      "載",
      "輪",
      "輸",
      "連"
    ]
  },
  {
    "number": 159,
    "character": "辛",
    "hanViet": "TÂN",
    "hiragana": "からい",
    "meaning": "Mũi kim châm xăm tội nhân: Vị cay xè, đau đớn vất vả, can Tân",
    "strokeCount": 7,
    "examples": [
      "辛",
      "辞",
      "辟",
      "辣"
    ]
  },
  {
    "number": 160,
    "character": "辰",
    "hanViet": "THẦN",
    "hiragana": "しんのたつ",
    "meaning": "Vỏ sò hé miệng đón sương mai, con rồng, giờ Thìn",
    "strokeCount": 7,
    "examples": [
      "辰",
      "辱",
      "農"
    ]
  },
  {
    "number": 161,
    "character": "辵",
    "variant": "辶",
    "hanViet": "SƯỚC",
    "hiragana": "しんにょう",
    "positionType": "nyo",
    "positionName": "Sước (Bước đi bên dưới/trái)",
    "meaning": "Chân bước đi trên đường lớn: Di chuyển, tới lui, qua lại",
    "strokeCount": 7,
    "examples": [
      "込",
      "巡",
      "迫",
      "迎",
      "返",
      "近",
      "述",
      "迷",
      "追",
      "退",
      "送",
      "逃",
      "逆",
      "透",
      "逐",
      "途",
      "通",
      "速",
      "造",
      "連",
      "週",
      "進",
      "逸",
      "遂",
      "遅",
      "遇",
      "遊",
      "運",
      "遍",
      "過",
      "道",
      "達",
      "違",
      "遠",
      "適",
      "選",
      "避",
      "遷",
      "還"
    ]
  },
  {
    "number": 162,
    "character": "邑",
    "variant": "阝 (Phải)",
    "hanViet": "ẤP",
    "hiragana": "おおざと",
    "positionType": "tsukuri",
    "positionName": "Ấp (Bên phải)",
    "meaning": "Thành thị đông đúc, xóm làng bờ cõi, đất đai phong tặng",
    "strokeCount": 7,
    "examples": [
      "那",
      "邦",
      "邪",
      "邸",
      "郊",
      "郎",
      "部",
      "郭",
      "都",
      "郷"
    ]
  },
  {
    "number": 163,
    "character": "酉",
    "hanViet": "DẬU",
    "hiragana": "とりへん",
    "positionType": "hen",
    "positionName": "Dậu (Bình rượu)",
    "meaning": "Bình gốm ủ men rượu chín, giờ Dậu (con gà)",
    "strokeCount": 7,
    "examples": [
      "酒",
      "配",
      "酸",
      "酷",
      "酵",
      "醜",
      "醸"
    ]
  },
  {
    "number": 164,
    "character": "釆",
    "hanViet": "BIỆN",
    "hiragana": "のごめ",
    "meaning": "Dấu móng vuốt con thú phân biệt rõ ràng: Phân biệt, lựa chọn",
    "strokeCount": 7,
    "examples": [
      "采",
      "釈"
    ]
  },
  {
    "number": 165,
    "character": "里",
    "hanViet": "LÝ",
    "hiragana": "さと",
    "meaning": "Ruộng đất (Điền) cùng nhà ở (Thổ): Làng xóm, dặm đường đo cự ly",
    "strokeCount": 7,
    "examples": [
      "里",
      "重",
      "野",
      "量"
    ]
  },
  {
    "number": 166,
    "character": "阜",
    "variant": "阝 (Trái)",
    "hanViet": "PHỤ",
    "hiragana": "こざとへん",
    "positionType": "hen",
    "positionName": "Phụ (Bên trái)",
    "meaning": "Gò đất nhô cao bậc thang, địa thế hiểm trở hiểm yếu",
    "strokeCount": 8,
    "examples": [
      "阪",
      "防",
      "阻",
      "附",
      "降",
      "限",
      "陛",
      "院",
      "陣",
      "除",
      "陸",
      "陰",
      "陳",
      "陵",
      "陶",
      "陥",
      "陽",
      "隊",
      "階",
      "隔",
      "際",
      "障",
      "隠"
    ]
  },
  {
    "number": 167,
    "character": "金",
    "variant": "釒",
    "hanViet": "KIM",
    "hiragana": "かねへん",
    "positionType": "hen",
    "positionName": "Kim (Kim loại)",
    "meaning": "Khoáng vật kim loại quý chôn dưới đất cát: Vàng, bạc, đồng sắt, tiền của",
    "strokeCount": 8,
    "examples": [
      "金",
      "釘",
      "針",
      "釣",
      "鈍",
      "鈴",
      "鉄",
      "鉛",
      "鉢",
      "鉱",
      "銀",
      "銃",
      "銅",
      "銘",
      "銭",
      "鋭",
      "鋳",
      "鋼",
      "錘",
      "錠",
      "錬",
      "錯",
      "録",
      "鏡",
      "鑑"
    ]
  },
  {
    "number": 168,
    "character": "長",
    "hanViet": "TRƯỜNG / TRƯỞNG",
    "hiragana": "ながい",
    "meaning": "Người tóc dài bay theo gió: Dài lâu, trưởng thành, người đứng đầu",
    "strokeCount": 8,
    "examples": [
      "長",
      "肆",
      "張"
    ]
  },
  {
    "number": 169,
    "character": "門",
    "hanViet": "MÔN",
    "hiragana": "もんがまえ",
    "positionType": "kamae",
    "positionName": "Môn (Hai cánh cổng)",
    "meaning": "Hai cánh cửa lớn mở ra khép vào: Cổng ngõ, lối vào, môn phái",
    "strokeCount": 8,
    "examples": [
      "門",
      "閃",
      "閉",
      "開",
      "潤",
      "間",
      "関",
      "閣",
      "閥",
      "闇",
      "闘",
      "聞"
    ]
  },
  {
    "number": 170,
    "character": "隶",
    "hanViet": "ĐÃI",
    "hiragana": "れいづくり",
    "positionType": "tsukuri",
    "meaning": "Tay vươn ra bắt giữ từ phía sau, thuộc hạ",
    "strokeCount": 8,
    "examples": [
      "隷"
    ]
  },
  {
    "number": 171,
    "character": "隹",
    "hanViet": "CHUY",
    "hiragana": "ふるとり",
    "positionType": "tsukuri",
    "positionName": "Chuy (Chim đuôi ngắn)",
    "meaning": "Con chim nhỏ có lông đuôi ngắn",
    "strokeCount": 8,
    "examples": [
      "隻",
      "雄",
      "雅",
      "集",
      "雇",
      "雌",
      "難"
    ]
  },
  {
    "number": 172,
    "character": "雨",
    "variant": "⻗",
    "hanViet": "VŨ",
    "hiragana": "あめかんむり",
    "positionType": "kanmuri",
    "positionName": "Vũ (Mưa)",
    "meaning": "Những giọt nước mưa rơi từ bầu trời mây: Thời tiết khí hậu",
    "strokeCount": 8,
    "examples": [
      "雨",
      "雪",
      "雲",
      "零",
      "電",
      "震",
      "露",
      "覇",
      "霜",
      "霧"
    ]
  },
  {
    "number": 173,
    "character": "靑",
    "variant": "青",
    "hanViet": "THANH",
    "hiragana": "あお",
    "meaning": "Màu xanh biếc của cây cỏ non và bầu trời, tuổi trẻ trong sáng",
    "strokeCount": 8,
    "examples": [
      "青",
      "晴",
      "清",
      "精",
      "静",
      "情"
    ]
  },
  {
    "number": 174,
    "character": "非",
    "hanViet": "PHI",
    "hiragana": "あらず",
    "meaning": "Hai cánh chim dang ngược hướng nhau: Sai trái, không phải, phản đối",
    "strokeCount": 8,
    "examples": [
      "非",
      "悲",
      "罪",
      "排",
      "輩"
    ]
  },
  {
    "number": 175,
    "character": "面",
    "hanViet": "DIỆN",
    "hiragana": "めん",
    "meaning": "Khuôn mặt con người, bề mặt phẳng, phương diện",
    "strokeCount": 9,
    "examples": [
      "面",
      "靴"
    ]
  },
  {
    "number": 176,
    "character": "革",
    "hanViet": "CÁCH",
    "hiragana": "かわへん",
    "positionType": "hen",
    "meaning": "Tấm da thú cạo sạch lông căng phơi: Da thuộc, cải cách đổi mới",
    "strokeCount": 9,
    "examples": [
      "革",
      "靴",
      "鞍",
      "鞭"
    ]
  },
  {
    "number": 177,
    "character": "韋",
    "hanViet": "VI",
    "hiragana": "なめしがわ",
    "meaning": "Da thú thuộc mềm dẻo dai uốn vòng quanh",
    "strokeCount": 9,
    "examples": [
      "韓",
      "衛"
    ]
  },
  {
    "number": 178,
    "character": "韭",
    "hanViet": "CỬU",
    "hiragana": "にら",
    "meaning": "Bụi cây rau hẹ lá dài xanh tốt cắt lại mọc",
    "strokeCount": 9,
    "examples": [
      "韭"
    ]
  },
  {
    "number": 179,
    "character": "音",
    "hanViet": "ÂM",
    "hiragana": "おと",
    "meaning": "Tiếng vang thốt ra từ trong miệng ngậm: Âm thanh, tiếng động, âm nhạc",
    "strokeCount": 9,
    "examples": [
      "音",
      "韻",
      "響",
      "暗"
    ]
  },
  {
    "number": 180,
    "character": "頁",
    "hanViet": "HIỆT",
    "hiragana": "おおがい",
    "positionType": "tsukuri",
    "positionName": "Hiệt (Đầu người / Trang sách)",
    "meaning": "Cái đầu người nhìn nghiêng, trang sách mở ra",
    "strokeCount": 9,
    "examples": [
      "頂",
      "順",
      "須",
      "預",
      "領",
      "頭",
      "頻",
      "題",
      "額",
      "顔",
      "願",
      "類"
    ]
  },
  {
    "number": 181,
    "character": "風",
    "hanViet": "PHONG",
    "hiragana": "かぜ",
    "meaning": "Ngọn gió thổi muôn trùng mang theo hạt giống, phong thái phong tục",
    "strokeCount": 9,
    "examples": [
      "風",
      "嵐",
      "飄"
    ]
  },
  {
    "number": 182,
    "character": "飛",
    "hanViet": "PHI",
    "hiragana": "とぶ",
    "meaning": "Cánh chim tung bay liệng trên không trung",
    "strokeCount": 9,
    "examples": [
      "飛",
      "飜"
    ]
  },
  {
    "number": 183,
    "character": "食",
    "variant": "飠",
    "hanViet": "THỰC",
    "hiragana": "しょくへん",
    "positionType": "hen",
    "positionName": "Thực (Ăn uống)",
    "meaning": "Thức ăn đậy trong thạp có nắp: Ăn uống, lương thực, thực phẩm",
    "strokeCount": 9,
    "examples": [
      "食",
      "飯",
      "飲",
      "飼",
      "飽",
      "飾",
      "養",
      "館",
      "飢"
    ]
  },
  {
    "number": 184,
    "character": "首",
    "hanViet": "THỦ",
    "hiragana": "くび",
    "meaning": "Cái đầu và cái cổ con người, thủ lĩnh, đứng đầu",
    "strokeCount": 9,
    "examples": [
      "首",
      "道",
      "題"
    ]
  },
  {
    "number": 185,
    "character": "香",
    "hanViet": "HƯƠNG",
    "hiragana": "かおり",
    "meaning": "Hương thơm ngọt ngào của hạt thóc nếp chín vàng",
    "strokeCount": 9,
    "examples": [
      "香",
      "馥",
      "馨"
    ]
  },
  {
    "number": 186,
    "character": "馬",
    "hanViet": "MÃ",
    "hiragana": "うまへん",
    "positionType": "hen",
    "positionName": "Mã (Con ngựa)",
    "meaning": "Con ngựa với bờm dài và bốn vó phi nhanh",
    "strokeCount": 10,
    "examples": [
      "馬",
      "駅",
      "駆",
      "駐",
      "駿",
      "験",
      "騎",
      "騒"
    ]
  },
  {
    "number": 187,
    "character": "骨",
    "hanViet": "CỐT",
    "hiragana": "ほね",
    "positionType": "hen",
    "meaning": "Khung xương cốt nâng đỡ thân thể, cốt cách kiên cường",
    "strokeCount": 10,
    "examples": [
      "骨",
      "髄",
      "体"
    ]
  },
  {
    "number": 188,
    "character": "高",
    "hanViet": "CAO",
    "hiragana": "たかい",
    "meaning": "Tòa lầu gác cao vút có mái và cổng: Chiều cao, thanh cao, cao cấp",
    "strokeCount": 10,
    "examples": [
      "高",
      "稿",
      "膏"
    ]
  },
  {
    "number": 189,
    "character": "髟",
    "hanViet": "TIÊU",
    "hiragana": "かみがしら",
    "positionType": "kanmuri",
    "meaning": "Mái tóc dài thướt tha buông xõa bay",
    "strokeCount": 10,
    "examples": [
      "髪",
      "髭",
      "鬚"
    ]
  },
  {
    "number": 190,
    "character": "鬥",
    "hanViet": "ĐẤU",
    "hiragana": "とうがまえ",
    "positionType": "kamae",
    "meaning": "Hai người cầm binh khí đối mặt tranh đấu quyết liệt",
    "strokeCount": 10,
    "examples": [
      "闘",
      "鬨"
    ]
  },
  {
    "number": 191,
    "character": "鬯",
    "hanViet": "SƯỞNG",
    "hiragana": "ちょう",
    "meaning": "Rượu nếp thơm nấu với cỏ thơm dùng cúng tế thần",
    "strokeCount": 10,
    "examples": [
      "鬱"
    ]
  },
  {
    "number": 192,
    "character": "鬲",
    "hanViet": "CÁCH",
    "hiragana": "れき",
    "meaning": "Cái nồi ba chân rỗng đáy dùng nấu nướng thời cổ",
    "strokeCount": 10,
    "examples": [
      "融",
      "鬻"
    ]
  },
  {
    "number": 193,
    "character": "鬼",
    "hanViet": "QUỶ",
    "hiragana": "おに",
    "meaning": "Hồn ma bóng quế, ma quỷ, năng lực phi thường",
    "strokeCount": 10,
    "examples": [
      "鬼",
      "魂",
      "魅",
      "魔"
    ]
  },
  {
    "number": 194,
    "character": "魚",
    "hanViet": "NGƯ",
    "hiragana": "うおへん",
    "positionType": "hen",
    "positionName": "Ngư (Con cá)",
    "meaning": "Con cá bơi dưới nước có vây và vảy đuôi",
    "strokeCount": 11,
    "examples": [
      "魚",
      "魯",
      "鮮",
      "鯨",
      "鰐",
      "鮮"
    ]
  },
  {
    "number": 195,
    "character": "鳥",
    "hanViet": "ĐIỂU",
    "hiragana": "とり",
    "positionType": "hen",
    "positionName": "Điểu (Con chim đuôi dài)",
    "meaning": "Con chim trời có mắt mỏ và lông đuôi dài",
    "strokeCount": 11,
    "examples": [
      "鳥",
      "鳩",
      "鳳",
      "鳴",
      "鴨",
      "鶴",
      "鷹"
    ]
  },
  {
    "number": 196,
    "character": "鹵",
    "hanViet": "LỖ",
    "hiragana": "ろ",
    "meaning": "Vùng đất mặn ven biển kết tinh muối hạt",
    "strokeCount": 11,
    "examples": [
      "鹵",
      "鹹"
    ]
  },
  {
    "number": 197,
    "character": "鹿",
    "hanViet": "LỘC",
    "hiragana": "しか",
    "meaning": "Con hươu con nai có cặp sừng đẹp, điềm cát tường",
    "strokeCount": 11,
    "examples": [
      "鹿",
      "麗",
      "麟"
    ]
  },
  {
    "number": 198,
    "character": "麥",
    "variant": "麦",
    "hanViet": "MẠCH",
    "hiragana": "むぎ",
    "meaning": "Cây lúa mạch có râu dài, hạt lúa mì",
    "strokeCount": 11,
    "examples": [
      "麦",
      "麺",
      "麩"
    ]
  },
  {
    "number": 199,
    "character": "麻",
    "hanViet": "MA",
    "hiragana": "あさ",
    "meaning": "Cây gai đay tước vỏ phơi trong mái nhà, tê dại",
    "strokeCount": 11,
    "examples": [
      "麻",
      "磨",
      "摩"
    ]
  },
  {
    "number": 200,
    "character": "黃",
    "variant": "黄",
    "hanViet": "HOÀNG",
    "hiragana": "きいろ",
    "meaning": "Màu vàng của đất đai màu mỡ hoàng thổ, quý phái",
    "strokeCount": 12,
    "examples": [
      "黄",
      "横"
    ]
  },
  {
    "number": 201,
    "character": "黍",
    "hanViet": "THỬ",
    "hiragana": "きび",
    "meaning": "Hạt kê dính dùng ủ men làm rượu nếp",
    "strokeCount": 12,
    "examples": [
      "黍",
      "黎"
    ]
  },
  {
    "number": 202,
    "character": "黑",
    "variant": "黒",
    "hanViet": "HẮC",
    "hiragana": "くろ",
    "meaning": "Muội than khói đen bám trên ống khói, màu đen tuyền",
    "strokeCount": 12,
    "examples": [
      "黒",
      "黙",
      "黛"
    ]
  },
  {
    "number": 203,
    "character": "黹",
    "hanViet": "CHỈ",
    "hiragana": "ち",
    "meaning": "Đường kim mũi chỉ thêu dệt hoa văn tinh xảo",
    "strokeCount": 12,
    "examples": [
      "黼",
      "黻"
    ]
  },
  {
    "number": 204,
    "character": "黽",
    "hanViet": "MÃNH",
    "hiragana": "べん",
    "meaning": "Con ếch, con cóc lớn, nỗ lực hết mình",
    "strokeCount": 13,
    "examples": [
      "黽",
      "鼈"
    ]
  },
  {
    "number": 205,
    "character": "鼎",
    "hanViet": "ĐỈNH",
    "hiragana": "かなえ",
    "meaning": "Cái vạc đồng ba chân hai quai dùng nấu lễ vật quốc gia",
    "strokeCount": 13,
    "examples": [
      "鼎"
    ]
  },
  {
    "number": 206,
    "character": "鼓",
    "hanViet": "CỔ",
    "hiragana": "つづみ",
    "meaning": "Cái trống căng da và tay cầm dùi gõ vang",
    "strokeCount": 13,
    "examples": [
      "鼓",
      "鼙"
    ]
  },
  {
    "number": 207,
    "character": "鼠",
    "hanViet": "THỬ",
    "hiragana": "ねずみ",
    "meaning": "Con chuột nhanh nhẹn có răng gặm nhấm nhọn",
    "strokeCount": 13,
    "examples": [
      "鼠",
      "鼬"
    ]
  },
  {
    "number": 208,
    "character": "鼻",
    "hanViet": "TỊ",
    "hiragana": "はな",
    "meaning": "Cái mũi con người hít thở nhận biết mùi vị",
    "strokeCount": 14,
    "examples": [
      "鼻",
      "鼾"
    ]
  },
  {
    "number": 209,
    "character": "齊",
    "variant": "斉",
    "hanViet": "TỀ",
    "hiragana": "せい",
    "meaning": "Những bông lúa trổ đều tăm tắp bằng phẳng, đồng đều",
    "strokeCount": 14,
    "examples": [
      "斉",
      "斎"
    ]
  },
  {
    "number": 210,
    "character": "齒",
    "variant": "歯",
    "hanViet": "XỈ",
    "hiragana": "は",
    "meaning": "Hàm răng trong vòm miệng, tuổi tác",
    "strokeCount": 15,
    "examples": [
      "歯",
      "齢",
      "齧"
    ]
  },
  {
    "number": 211,
    "character": "龍",
    "variant": "竜",
    "hanViet": "LONG",
    "hiragana": "りゅう",
    "meaning": "Con rồng thần thoại uốn lượn uy quyền linh thiêng",
    "strokeCount": 16,
    "examples": [
      "竜",
      "瀧",
      "襲"
    ]
  },
  {
    "number": 212,
    "character": "龜",
    "variant": "亀",
    "hanViet": "QUY",
    "hiragana": "かめ",
    "meaning": "Con rùa có mai dày tượng trưng cho sự trường thọ",
    "strokeCount": 16,
    "examples": [
      "亀"
    ]
  },
  {
    "number": 213,
    "character": "龠",
    "hanViet": "DƯỢC",
    "hiragana": "やく",
    "meaning": "Cây sáo trúc ba lỗ thổi hòa tấu âm nhạc",
    "strokeCount": 17,
    "examples": [
      "龠"
    ]
  },
  {
    "number": 214,
    "character": "龢",
    "hanViet": "HÒA",
    "hiragana": "わ",
    "meaning": "Âm thanh hòa quyện êm dịu, sự hài hòa tột đỉnh",
    "strokeCount": 22,
    "examples": [
      "龢"
    ]
  }
];

/**
 * Bản đồ phân bóc tách Kanji chi tiết và Mẹo nhớ (Mnemonics) mẫu cho JLPT
 */
export const KANJI_DECOMPOSITIONS: Record<string, KanjiDecomposition> = {
  見: {
    kanji: '見',
    hanViet: 'KIẾN',
    primaryRadical: '見 (Kiến - 7 nét)',
    isSelfRadical: true,
    directComponents: [
      {
        radical: '目',
        hanViet: 'MỤC',
        meaning: 'Con mắt quan sát, thị giác',
        strokeCount: 5,
        actualPathCount: 5,
        pathIndices: [1, 2, 3, 4, 5],
        positionType: 'kanmuri',
        positionName: 'Phía trên (Kanmuri)',
        depth: 1,
      },
      {
        radical: '儿',
        hanViet: 'NHI',
        meaning: 'Tượng hình người đang đứng/bước đi, đôi chân người',
        strokeCount: 2,
        actualPathCount: 2,
        pathIndices: [6, 7],
        positionType: 'ashi',
        positionName: 'Phía dưới (Ashi)',
        depth: 1,
      },
    ],
    components: [
      {
        radical: '目',
        hanViet: 'MỤC',
        meaning: 'Con mắt quan sát, thị giác',
        strokeCount: 5,
        actualPathCount: 5,
        pathIndices: [1, 2, 3, 4, 5],
        positionType: 'kanmuri',
        positionName: 'Phía trên (Kanmuri)',
        depth: 1,
      },
      {
        radical: '儿',
        hanViet: 'NHI',
        meaning: 'Tượng hình người đang đứng/bước đi, đôi chân người',
        strokeCount: 2,
        actualPathCount: 2,
        pathIndices: [6, 7],
        positionType: 'ashi',
        positionName: 'Phía dưới (Ashi)',
        depth: 1,
      },
    ],
    mnemonicStory: 'Mắt to (目 - Mục) đặt trên đôi chân người đi (儿 - Nhi): Người đang hướng mắt trông thấy (見 - Kiến).',
  },
  待: {
    kanji: '待',
    hanViet: 'ĐÃI',
    primaryRadical: '彳 (Xích - 3 nét)',
    isSelfRadical: false,
    directComponents: [
      {
        radical: '彳',
        hanViet: 'XÍCH',
        meaning: 'Bước chân ngắn bên trái, hành trình đi lại',
        strokeCount: 3,
        actualPathCount: 3,
        pathIndices: [1, 2, 3],
        positionType: 'hen',
        positionName: 'Bên trái (Hen)',
        isPrimaryRadical: true,
        depth: 1,
      },
      {
        radical: '寺',
        hanViet: 'TỰ',
        meaning: 'Chùa chiền, nơi tôn nghiêm thanh tịnh',
        strokeCount: 6,
        actualPathCount: 6,
        pathIndices: [4, 5, 6, 7, 8, 9],
        positionType: 'tsukuri',
        positionName: 'Bên phải (Tsukuri)',
        depth: 1,
        subComponents: [
          {
            radical: '土',
            hanViet: 'THỔ',
            meaning: 'Đất đai, thổ nhưỡng',
            strokeCount: 3,
            actualPathCount: 3,
            pathIndices: [4, 5, 6],
            positionType: 'kanmuri',
            positionName: 'Phía trên',
            depth: 2,
          },
          {
            radical: '寸',
            hanViet: 'THỐN',
            meaning: 'Một tấc, khuôn phép mực thước',
            strokeCount: 3,
            actualPathCount: 3,
            pathIndices: [7, 8, 9],
            positionType: 'ashi',
            positionName: 'Phía dưới',
            depth: 2,
          },
        ],
      },
    ],
    components: [
      {
        radical: '彳',
        hanViet: 'XÍCH',
        meaning: 'Bước chân ngắn bên trái, hành trình đi lại',
        strokeCount: 3,
        actualPathCount: 3,
        pathIndices: [1, 2, 3],
        positionType: 'hen',
        positionName: 'Bên trái (Hen)',
        isPrimaryRadical: true,
        depth: 1,
      },
      {
        radical: '寺',
        hanViet: 'TỰ',
        meaning: 'Chùa chiền, nơi tôn nghiêm',
        strokeCount: 6,
        actualPathCount: 6,
        pathIndices: [4, 5, 6, 7, 8, 9],
        positionType: 'tsukuri',
        positionName: 'Bên phải (Tsukuri)',
        depth: 1,
        subComponents: [
          {
            radical: '土',
            hanViet: 'THỔ',
            meaning: 'Đất đai, thổ nhưỡng',
            strokeCount: 3,
            actualPathCount: 3,
            pathIndices: [4, 5, 6],
            positionType: 'kanmuri',
            positionName: 'Phía trên',
            depth: 2,
          },
          {
            radical: '寸',
            hanViet: 'THỐN',
            meaning: 'Một tấc, khuôn thước',
            strokeCount: 3,
            actualPathCount: 3,
            pathIndices: [7, 8, 9],
            positionType: 'ashi',
            positionName: 'Phía dưới',
            depth: 2,
          },
        ],
      },
    ],
    mnemonicStory: 'Bước chân (彳) dừng lại trước cửa Chùa (寺): Đứng chờ đợi (待 - Đãi) một ai đó.',
  },
  持: {
    kanji: '持',
    hanViet: 'TRÌ',
    primaryRadical: '扌 (Thủ - 3 nét)',
    isSelfRadical: false,
    directComponents: [
      {
        radical: '扌',
        variant: '手',
        hanViet: 'THỦ',
        meaning: 'Bàn tay nắm cầm, động tác bằng tay',
        strokeCount: 3,
        actualPathCount: 3,
        pathIndices: [1, 2, 3],
        positionType: 'hen',
        positionName: 'Bên trái (Hen)',
        isPrimaryRadical: true,
        depth: 1,
      },
      {
        radical: '寺',
        hanViet: 'TỰ',
        meaning: 'Chùa chiền, nơi tôn nghiêm thanh tịnh',
        strokeCount: 6,
        actualPathCount: 6,
        pathIndices: [4, 5, 6, 7, 8, 9],
        positionType: 'tsukuri',
        positionName: 'Bên phải (Tsukuri)',
        depth: 1,
        subComponents: [
          {
            radical: '土',
            hanViet: 'THỔ',
            meaning: 'Đất đai',
            strokeCount: 3,
            actualPathCount: 3,
            pathIndices: [4, 5, 6],
            positionType: 'kanmuri',
            positionName: 'Phía trên',
            depth: 2,
          },
          {
            radical: '寸',
            hanViet: 'THỐN',
            meaning: 'Một tấc',
            strokeCount: 3,
            actualPathCount: 3,
            pathIndices: [7, 8, 9],
            positionType: 'ashi',
            positionName: 'Phía dưới',
            depth: 2,
          },
        ],
      },
    ],
    components: [
      {
        radical: '扌',
        variant: '手',
        hanViet: 'THỦ',
        meaning: 'Bàn tay nắm cầm',
        strokeCount: 3,
        actualPathCount: 3,
        pathIndices: [1, 2, 3],
        positionType: 'hen',
        positionName: 'Bên trái (Hen)',
        isPrimaryRadical: true,
        depth: 1,
      },
      {
        radical: '寺',
        hanViet: 'TỰ',
        meaning: 'Chùa chiền',
        strokeCount: 6,
        actualPathCount: 6,
        pathIndices: [4, 5, 6, 7, 8, 9],
        positionType: 'tsukuri',
        positionName: 'Bên phải (Tsukuri)',
        depth: 1,
      },
    ],
    mnemonicStory: 'Dùng Bàn tay (扌) giữ gìn kinh sách ở Chùa (寺): Cầm nắm, gìn giữ, duy trì (持 - Trì).',
  },
  特: {
    kanji: '特',
    hanViet: 'ĐẶC',
    primaryRadical: '牜 (Ngưu - 4 nét)',
    isSelfRadical: false,
    directComponents: [
      {
        radical: '牜',
        variant: '牛',
        hanViet: 'NGƯU',
        meaning: 'Con trâu, con bò quý dùng làm lễ vật',
        strokeCount: 4,
        actualPathCount: 4,
        pathIndices: [1, 2, 3, 4],
        positionType: 'hen',
        positionName: 'Bên trái (Hen)',
        isPrimaryRadical: true,
        depth: 1,
      },
      {
        radical: '寺',
        hanViet: 'TỰ',
        meaning: 'Chùa chiền, nơi tôn nghiêm thanh tịnh',
        strokeCount: 6,
        actualPathCount: 6,
        pathIndices: [5, 6, 7, 8, 9, 10],
        positionType: 'tsukuri',
        positionName: 'Bên phải (Tsukuri)',
        depth: 1,
        subComponents: [
          {
            radical: '土',
            hanViet: 'THỔ',
            meaning: 'Đất đai',
            strokeCount: 3,
            actualPathCount: 3,
            pathIndices: [5, 6, 7],
            positionType: 'kanmuri',
            positionName: 'Phía trên',
            depth: 2,
          },
          {
            radical: '寸',
            hanViet: 'THỐN',
            meaning: 'Một tấc',
            strokeCount: 3,
            actualPathCount: 3,
            pathIndices: [8, 9, 10],
            positionType: 'ashi',
            positionName: 'Phía dưới',
            depth: 2,
          },
        ],
      },
    ],
    components: [
      {
        radical: '牜',
        variant: '牛',
        hanViet: 'NGƯU',
        meaning: 'Con trâu, con bò quý',
        strokeCount: 4,
        actualPathCount: 4,
        pathIndices: [1, 2, 3, 4],
        positionType: 'hen',
        positionName: 'Bên trái (Hen)',
        isPrimaryRadical: true,
        depth: 1,
      },
      {
        radical: '寺',
        hanViet: 'TỰ',
        meaning: 'Chùa chiền',
        strokeCount: 6,
        actualPathCount: 6,
        pathIndices: [5, 6, 7, 8, 9, 10],
        positionType: 'tsukuri',
        positionName: 'Bên phải (Tsukuri)',
        depth: 1,
      },
    ],
    mnemonicStory: 'Con trâu (牜) được dâng tế riêng tại Chùa (寺): Con vật đặc biệt, riêng biệt (特 - Đặc).',
  },
  能: {
    kanji: '能',
    hanViet: 'NĂNG',
    primaryRadical: '月 (Nguyệt / Nhục - 4 nét)',
    directComponents: [
      { radical: '月', hanViet: 'NGUYỆT / NHỤC', meaning: 'Cơ thể, bắp thịt, sức vóc', strokeCount: 4, positionType: 'hen', positionName: 'Bên trái (Hen)', depth: 1, isPrimaryRadical: true },
      { radical: '厶', hanViet: 'TƯ', meaning: 'Riêng tư, tự thân', strokeCount: 2, positionType: 'kanmuri', positionName: 'Giữa trên', depth: 1 },
      { radical: '匕', hanViet: 'CHỦY', meaning: 'Cái thìa, con dao nhỏ', strokeCount: 2, positionType: 'tsukuri', positionName: 'Trên phải', depth: 1 },
      { radical: '匕', hanViet: 'CHỦY', meaning: 'Cái thìa, con dao nhỏ', strokeCount: 2, positionType: 'ashi', positionName: 'Dưới phải', depth: 1 },
    ],
    components: [
      { radical: '月', hanViet: 'NGUYỆT / NHỤC', meaning: 'Cơ thể, thịt, sức vóc', strokeCount: 4, positionType: 'hen', positionName: 'Bên trái (Hen)', depth: 1, isPrimaryRadical: true },
      { radical: '厶', hanViet: 'TƯ', meaning: 'Riêng tư, tự thân', strokeCount: 2, positionType: 'kanmuri', positionName: 'Giữa trên', depth: 1 },
      { radical: '匕', hanViet: 'CHỦY', meaning: 'Cái thìa, con dao nhỏ', strokeCount: 2, positionType: 'tsukuri', positionName: 'Trên phải', depth: 1 },
      { radical: '匕', hanViet: 'CHỦY', meaning: 'Cái thìa, con dao nhỏ', strokeCount: 2, positionType: 'ashi', positionName: 'Dưới phải', depth: 1 },
    ],
    mnemonicStory: 'Dùng CƠ THỂ (月) và ý chí BẢN THÂN (厶) rèn luyện với 2 KHÍ CỤ (匕 匕) để khẳng định NĂNG LỰC (能).',
  },
  語: {
    kanji: '語',
    hanViet: 'NGỮ',
    primaryRadical: '言 (Ngôn - 7 nét)',
    directComponents: [
      { radical: '言', hanViet: 'NGÔN', meaning: 'Lời nói, ngôn ngữ', strokeCount: 7, positionType: 'hen', positionName: 'Bên trái (Hen)', depth: 1, isPrimaryRadical: true },
      {
        radical: '吾',
        hanViet: 'NGÔ',
        meaning: 'Ta, bản thân ta',
        strokeCount: 7,
        positionType: 'tsukuri',
        positionName: 'Bên phải (Tsukuri)',
        depth: 1,
        subComponents: [
          { radical: '五', hanViet: 'NGŨ', meaning: 'Số năm', strokeCount: 4, positionType: 'kanmuri', positionName: 'Phía trên', depth: 2 },
          { radical: '口', hanViet: 'KHẨU', meaning: 'Cái miệng', strokeCount: 3, positionType: 'ashi', positionName: 'Phía dưới', depth: 2 },
        ],
      },
    ],
    components: [
      { radical: '言', hanViet: 'NGÔN', meaning: 'Lời nói, ngôn ngữ', strokeCount: 7, positionType: 'hen', positionName: 'Bên trái (Hen)', depth: 1, isPrimaryRadical: true },
      { radical: '吾', hanViet: 'NGÔ', meaning: 'Ta, bản thân ta', strokeCount: 7, positionType: 'tsukuri', positionName: 'Bên phải (Tsukuri)', depth: 1 },
    ],
    mnemonicStory: 'Dùng LỜI NÓI (言) để biểu đạt chính BẢN THÂN TA (吾 = 五 + 口): Đó chính là NGÔN NGỮ (語).',
  },
};

/**
 * Tra cứu thông tin đầy đủ của bộ thủ theo ký tự hoặc biến thể
 */
export function findRadicalByChar(char: string): RadicalInfo | undefined {
  if (!char) return undefined;
  return RADICALS_LIST.find(
    (r) => r.character === char || (r.variant && r.variant.includes(char))
  );
}

/**
 * Tìm số thứ tự bộ thủ theo ký tự
 */
export function getRadicalNumber(char: string): number | null {
  const r = findRadicalByChar(char);
  return r ? r.number : null;
}

/**
 * Tìm hoặc tạo tự động bóc tách bộ thủ cho chữ Kanji bất kỳ
 */
export function getKanjiDecomposition(
  kanji: string,
  hanVietName?: string,
  svgContent?: string
): KanjiDecomposition {
  if (KANJI_DECOMPOSITIONS[kanji]) {
    return KANJI_DECOMPOSITIONS[kanji];
  }

  const resolvedHv = hanVietName || SINO_VIETNAMESE_MAP[kanji] || '';

  if (svgContent) {
    const parsed = extractSubElementsFromSvg(svgContent, kanji);
    const comps = parsed.directComponents.length > 0 ? parsed.directComponents : parsed.allComponents;
    if (comps.length > 0) {
      const storyParts = comps
        .filter((c) => c.meaning || c.hanViet)
        .map((c) => '[' + c.radical + (c.hanViet ? ' - ' + c.hanViet : '') + (c.meaning ? ': ' + c.meaning : '') + ']');

      return {
        kanji,
        hanViet: resolvedHv,
        primaryRadical:
          parsed.primaryRadicalName ||
          (comps[0]?.radical ? comps[0].radical + (comps[0].hanViet ? ' (' + comps[0].hanViet + ')' : '') : 'Cơ bản'),
        isSelfRadical: parsed.isSelfRadical,
        directComponents: parsed.directComponents,
        components: comps,
        mnemonicStory:
          'Ghi nhớ chữ ' + kanji + (resolvedHv ? ' (' + resolvedHv + ')' : '') + ' bằng cách ghép các bộ thủ: ' + storyParts.join(', ') + '.',
      };
    }
  }

  // Fallback: Kiểm tra xem chính chữ đó có phải là một trong 214 Bộ thủ không
  const selfRadical = RADICALS_LIST.find((r) => r.character === kanji);
  if (selfRadical) {
    return {
      kanji,
      hanViet: resolvedHv || selfRadical.hanViet,
      primaryRadical: selfRadical.character + ' (' + selfRadical.hanViet + ' - ' + selfRadical.strokeCount + ' nét)',
      isSelfRadical: true,
      directComponents: [
        {
          radical: kanji,
          hanViet: resolvedHv || selfRadical.hanViet,
          meaning: selfRadical.meaning,
          strokeCount: selfRadical.strokeCount,
          actualPathCount: selfRadical.strokeCount,
          isPrimaryRadical: true,
          positionType: 'center',
          positionName: 'Toàn phần',
          depth: 1,
        },
      ],
      components: [
        {
          radical: kanji,
          hanViet: resolvedHv || selfRadical.hanViet,
          meaning: selfRadical.meaning,
          strokeCount: selfRadical.strokeCount,
          actualPathCount: selfRadical.strokeCount,
          isPrimaryRadical: true,
          positionType: 'center',
          positionName: 'Toàn phần',
          depth: 1,
        },
      ],
      mnemonicStory: 'Chữ ' + kanji + (resolvedHv ? ' (' + resolvedHv + ')' : '') + ' là một trong 214 Bộ thủ Khang Hy độc lập: ' + selfRadical.meaning + '.',
    };
  }

  // Fallback scan against 214 Kangxi Radicals list (chỉ ghép nếu chữ CHỨA bộ thủ)
  const matchingRadicals = RADICALS_LIST.filter(
    (r) =>
      (r.character.length === 1 && kanji.includes(r.character)) ||
      (r.variant && r.variant.split('/').some((v) => kanji.includes(v.trim())))
  );

  const primaryRadical =
    matchingRadicals.length > 0
      ? matchingRadicals[0].character + ' (' + matchingRadicals[0].hanViet + ')'
      : 'Cơ bản';

  const components: RadicalComponent[] =
    matchingRadicals.length > 0
      ? matchingRadicals.slice(0, 3).map((r, idx) => ({
          radical: r.character,
          variant: r.variant,
          hanViet: r.hanViet,
          meaning: r.meaning,
          strokeCount: r.strokeCount,
          actualPathCount: r.strokeCount,
          positionType: r.positionType || (idx === 0 ? 'hen' : 'tsukuri'),
          positionName: r.positionName || (idx === 0 ? 'Bên trái' : 'Thành phần'),
          depth: 1,
          isPrimaryRadical: idx === 0,
        }))
      : [
          {
            radical: kanji,
            hanViet: resolvedHv,
            meaning: '',
            strokeCount: kanji.length,
            actualPathCount: kanji.length,
            positionType: 'center' as RadicalPositionType,
            positionName: 'Gốc',
            depth: 1,
            isPrimaryRadical: true,
          },
        ];

  return {
    kanji,
    hanViet: resolvedHv,
    primaryRadical,
    directComponents: components,
    components,
    mnemonicStory: 'Mẹo nhớ chữ ' + kanji + (resolvedHv ? ' (' + resolvedHv + ')' : '') + ': Kết hợp hình thái các bộ thủ để ghi nhớ lâu dài.',
  };
}
