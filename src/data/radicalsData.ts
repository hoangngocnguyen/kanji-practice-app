import { RadicalInfo, KanjiDecomposition, RadicalPositionType, RadicalComponent } from '../types/radical';
import { parseKanjiVgSvgXml as extractSubElementsFromSvg, findRadicalInfo } from '../utils/kanjiSubElementParser';

/**
 * Danh sách 214 Bộ thủ Khang Hy (Kangxi Radicals) đầy đủ Tên Hán Việt, Số nét, Nghĩa tiếng Việt và Ví dụ
 */
export const RADICALS_LIST: RadicalInfo[] = [
  // --- 1 NÉT ---
  { number: 1, character: '一', hanViet: 'NHẤT', hiragana: 'いち', meaning: 'Số một, toàn bộ', strokeCount: 1, examples: ['一', '七', '三', '下', '不'] },
  { number: 2, character: '丨', hanViet: 'CỔN', hiragana: 'ぼう', meaning: 'Nét sổ thẳng', strokeCount: 1, examples: ['中', '串', '丸'] },
  { number: 3, character: '丶', hanViet: 'CHỦ', hiragana: 'てん', meaning: 'Nét chấm, chủ thể', strokeCount: 1, examples: ['丸', '丹', '主'] },
  { number: 4, character: '丿', hanViet: 'PHIỆT', hiragana: 'の', meaning: 'Nét phẩy qua trái', strokeCount: 1, examples: ['久', '乗', '乃'] },
  { number: 5, character: '乙', variant: '乚', hanViet: 'ẤT', hiragana: 'おつ', meaning: 'Vị trí thứ hai, can Ất', strokeCount: 1, examples: ['九', '乞', '乾'] },
  { number: 6, character: '亅', hanViet: 'QUYẾT', hiragana: 'はねぼう', meaning: 'Nét móc lên', strokeCount: 1, examples: ['了', '予', '事'] },

  // --- 2 NÉT ---
  { number: 7, character: '二', hanViet: 'NHỊ', hiragana: 'に', meaning: 'Số hai, đối lập', strokeCount: 2, examples: ['二', '井', '五', '仁'] },
  { number: 8, character: '亠', hanViet: 'ĐẦU', hiragana: 'なべぶた', positionType: 'kanmuri', positionName: 'Đầu (Nắp nồi)', meaning: 'Cái nắp, phần trên', strokeCount: 2, examples: ['亡', '交', '京', '夜'] },
  { number: 9, character: '人', variant: '亻', hanViet: 'NHÂN', hiragana: 'にんべん', positionType: 'hen', positionName: 'Nhân đứng (Bên trái)', meaning: 'Con người', strokeCount: 2, examples: ['人', '休', '体', '働', '化', '代', '作', '使', '信'] },
  { number: 10, character: '儿', hanViet: 'NHÂN', hiragana: 'ひとあし', positionType: 'ashi', positionName: 'Nhân đi (Phía dưới)', meaning: 'Chân người, con người', strokeCount: 2, examples: ['元', '兄', '光', '免', '党'] },
  { number: 11, character: '入', hanViet: 'NHẬP', hiragana: 'いる', meaning: 'Đi vào, tham gia', strokeCount: 2, examples: ['入', '内', '全', '両'] },
  { number: 12, character: '八', hanViet: 'BÁT', hiragana: 'はち', meaning: 'Số tám, chia ra', strokeCount: 2, examples: ['八', '公', '六', '共', '兵'] },
  { number: 13, character: '冂', hanViet: 'QUYNH', hiragana: 'けいがまえ', positionType: 'kamae', positionName: 'Quynh (Vùng biên)', meaning: 'Vùng biên giới, khoảng không', strokeCount: 2, examples: ['冊', '再', '同', '岡'] },
  { number: 14, character: '冖', hanViet: 'MỊCH', hiragana: 'わかんむり', positionType: 'kanmuri', positionName: 'Mịch (Trùm lên)', meaning: 'Khăn trùm, che phủ', strokeCount: 2, examples: ['冗', '冠', '写', '軍'] },
  { number: 15, character: '冫', hanViet: 'BĂNG', hiragana: 'にすい', positionType: 'hen', positionName: 'Băng (Hai chấm nước)', meaning: 'Băng giá, lạnh lẽo', strokeCount: 2, examples: ['冬', '冷', '次', '凍', '准'] },
  { number: 16, character: '几', hanViet: 'KỶ', hiragana: 'つくえ', meaning: 'Cái bàn nhỏ', strokeCount: 2, examples: ['凡', '処', '凧', '凪'] },
  { number: 17, character: '凵', hanViet: 'KHẢM', hiragana: 'うけばこ', meaning: 'Cái hố, cái khay', strokeCount: 2, examples: ['凶', '出', '函'] },
  { number: 18, character: '刀', variant: '刂', hanViet: 'ĐAO', hiragana: 'りっとう', positionType: 'tsukuri', positionName: 'Đao đứng (Bên phải)', meaning: 'Con dao, thanh kiếm, cắt', strokeCount: 2, examples: ['切', '刈', '刊', '刑', '列', '初', '別', '利', '刷', '分'] },
  { number: 19, character: '力', hanViet: 'LỰC', hiragana: 'ちから', meaning: 'Sức mạnh, sức lực', strokeCount: 2, examples: ['力', '加', '助', '努', '励', '勝', '男', '動'] },
  { number: 20, character: '勹', hanViet: 'BAO', hiragana: 'つつみがまえ', positionType: 'kamae', positionName: 'Bao (Bao bọc)', meaning: 'Bọc lại, ôm lấy', strokeCount: 2, examples: ['包', '勾', '匂', '旬'] },
  { number: 21, character: '匕', hanViet: 'CHỦY', hiragana: 'ひのさじ', meaning: 'Cái thìa, muỗng', strokeCount: 2, examples: ['北', '匙', '頃', '能'] },
  { number: 22, character: '匚', hanViet: 'PHƯƠNG', hiragana: 'かくしがまえ', positionType: 'kamae', meaning: 'Tủ đựng, cái hộp', strokeCount: 2, examples: ['匠', '匡', '医', '匿'] },
  { number: 23, character: '十', hanViet: 'THẬP', hiragana: 'じゅう', meaning: 'Số mười, hoàn hảo', strokeCount: 2, examples: ['十', '千', '午', '半', '卒', '博'] },
  { number: 24, character: '卜', hanViet: 'BÓI', hiragana: 'ぼくのト', meaning: 'Bói toán, dự đoán', strokeCount: 2, examples: ['卜', '占', '卦', '臥'] },
  { number: 25, character: '卩', variant: '卩 / 㔾', hanViet: 'TIẾT', hiragana: 'ふしづくり', positionType: 'tsukuri', meaning: 'Đốt trúc, quỳ xuống', strokeCount: 2, examples: ['印', '危', '卵', '即', '卷'] },
  { number: 26, character: '厂', hanViet: 'HÁN', hiragana: 'がんだれ', positionType: 'tare', positionName: 'Hán (Sườn núi)', meaning: 'Sườn núi, mỏm đá', strokeCount: 2, examples: ['厄', '原', '厚', '厳'] },
  { number: 27, character: '厶', hanViet: 'TƯ', hiragana: 'む', meaning: 'Riêng tư, bản thân', strokeCount: 2, examples: ['去', '参', '私', '能'] },
  { number: 28, character: '又', hanViet: 'HỰU', hiragana: 'また', meaning: 'Lại nữa, bàn tay phải', strokeCount: 2, examples: ['又', '友', '双', '反', '取', '受'] },

  // --- 3 NÉT ---
  { number: 29, character: '口', hanViet: 'KHẨU', hiragana: 'くち', meaning: 'Cái miệng, lối vào', strokeCount: 3, examples: ['口', '古', '可', '名', '君', '味', '命', '和', '品', '員', '問', '語'] },
  { number: 30, character: '囗', hanViet: 'VI', hiragana: 'くにがまえ', positionType: 'kamae', positionName: 'Vi (Bao quanh)', meaning: 'Vây quanh, tường thành', strokeCount: 3, examples: ['四', '回', '因', '困', '図', '固', '国', '園', '國'] },
  { number: 31, character: '土', hanViet: 'THỔ', hiragana: 'つち', meaning: 'Đất, đất đai, thổ dưỡng', strokeCount: 3, examples: ['土', '在', '地', '坂', '型', '城', '域', '基', '場'] },
  { number: 32, character: '士', hanViet: 'SĨ', hiragana: 'さむらい', meaning: 'Quan lại, học giả, chí sĩ', strokeCount: 3, examples: ['士', '壮', '売', '変', '吉'] },
  { number: 33, character: '夂', hanViet: 'TRUY', hiragana: 'ふゆがしら', meaning: 'Đến sau, đi chậm', strokeCount: 3, examples: ['処', '条', '冬', '各', '愛'] },
  { number: 34, character: '夕', hanViet: 'TỊCH', hiragana: 'ゆうべ', meaning: 'Buổi chiều tối, hoàng hôn', strokeCount: 3, examples: ['夕', '外', '多', '夜', '名'] },
  { number: 35, character: '大', hanViet: 'ĐẠI', hiragana: 'だい', meaning: 'To lớn, vĩ đại', strokeCount: 3, examples: ['大', '天', '太', '夫', '央', '失', '奇', '奥'] },
  { number: 36, character: '女', hanViet: 'NỮ', hiragana: 'おんな', positionType: 'hen', meaning: 'Phụ nữ, con gái', strokeCount: 3, examples: ['女', '好', '妹', '妻', '姉', '始', '姓', '威', '娘', '婚'] },
  { number: 37, character: '子', hanViet: 'TỬ', hiragana: 'こ', meaning: 'Con cái, đứa trẻ', strokeCount: 3, examples: ['子', '孔', '字', '存', '学', '季', '孤', '孫'] },
  { number: 38, character: '宀', hanViet: 'MIÊN', hiragana: 'うかんむり', positionType: 'kanmuri', positionName: 'Miên (Mái nhà)', meaning: 'Mái nhà, ngôi nhà', strokeCount: 3, examples: ['宅', '宇', '安', '完', '宗', '官', '定', '宜', '客', '室', '宮', '家'] },
  { number: 39, character: '寸', hanViet: 'THỐN', hiragana: 'すん', meaning: 'Đơn vị thốn, quy tắc', strokeCount: 3, examples: ['寸', '寺', '対', '封', '専', '射', '尊'] },
  { number: 40, character: '小', hanViet: 'TIỂU', hiragana: 'ちいさい', meaning: 'Nhỏ bé, ít', strokeCount: 3, examples: ['小', '少', '劣', '当', '光'] },
  { number: 41, character: '尢', variant: '尣', hanViet: 'UỐNG', hiragana: 'だいのまげあし', meaning: 'Chân yếu, tàn tật', strokeCount: 3, examples: ['尤', '就', '尷'] },
  { number: 42, character: '尸', hanViet: 'THI', hiragana: 'しかばね', positionType: 'tare', meaning: 'Xác chết, người ngồi', strokeCount: 3, examples: ['尺', '尼', '尾', '局', '居', '屋', '展', '属'] },
  { number: 43, character: '屮', hanViet: 'TRIỆT', hiragana: 'てつ', meaning: 'Mầm cây mới mọc', strokeCount: 3, examples: ['屯', '出'] },
  { number: 44, character: '山', hanViet: 'SƠN', hiragana: 'やま', meaning: 'Núi, ngọn núi', strokeCount: 3, examples: ['山', '岐', '岩', '岸', '島', '崖', '崩', '岳'] },
  { number: 45, character: '巛', variant: '川', hanViet: 'XUYÊN', hiragana: 'かわ', meaning: 'Sông ngòi, dòng nước', strokeCount: 3, examples: ['川', '州', '巡', '巣'] },
  { number: 46, character: '工', hanViet: 'CÔNG', hiragana: 'たくみ', meaning: 'Thợ, công việc, khéo léo', strokeCount: 3, examples: ['工', '左', '巧', '巨', '差'] },
  { number: 47, character: '己', variant: '已 / 巳', hanViet: 'KỶ', hiragana: 'おのれ', meaning: 'Bản thân, can Kỷ', strokeCount: 3, examples: ['己', '已', '巳', '巴', '改', '忌', '記'] },
  { number: 48, character: '巾', hanViet: 'CÂN', hiragana: 'はば', meaning: 'Khăn vải, cờ', strokeCount: 3, examples: ['巾', '市', '布', '帆', '希', '席', '帯', '常', '帽'] },
  { number: 49, character: '干', hanViet: 'CAN', hiragana: 'ほし', meaning: 'Lá chắn, khô ráo, can thiệp', strokeCount: 3, examples: ['干', '平', '年', '幸', '幹'] },
  { number: 50, character: '幺', hanViet: 'YÊU', hiragana: 'いとがしら', meaning: 'Nhỏ bé, sợi chỉ nhỏ', strokeCount: 3, examples: ['幻', '幼', '幽', '幾'] },
  { number: 51, character: '广', hanViet: 'NGHIỄM', hiragana: 'まだれ', positionType: 'tare', positionName: 'Nghiễm (Mái nhà dựa núi)', meaning: 'Mái nhà rộng, nhà kho', strokeCount: 3, examples: ['庁', '広', '庄', '床', '底', '店', '府', '度', '座', '庫', '庭', '康'] },
  { number: 52, character: ' get', variant: '廴', hanViet: 'DẪN', hiragana: 'いんにょう', positionType: 'nyo', meaning: 'Đi xa, kéo dài', strokeCount: 3, examples: ['延', '廷', '建'] },
  { number: 53, character: '弋', hanViet: 'TRẮC', hiragana: 'しぐるみ', meaning: 'Bắn cung, cái cọc', strokeCount: 3, examples: ['式', '弐', '弑'] },
  { number: 54, character: '弓', hanViet: 'CUNG', hiragana: 'ゆみ', meaning: 'Cây cung, cong', strokeCount: 3, examples: ['弓', '引', '弘', '弟', '弦', '弱', '張', '強'] },
  { number: 55, character: '彐', variant: '彑', hanViet: 'KÝ', hiragana: 'けいがしら', meaning: 'Đầu con heo', strokeCount: 3, examples: ['当', '録', '彗', '尋'] },
  { number: 56, character: '彡', hanViet: 'SAM', hiragana: 'さんづくり', positionType: 'tsukuri', meaning: 'Lông tóc dài, trang trí', strokeCount: 3, examples: ['形', '彦', '彩', '彫', '影', '鬱'] },
  { number: 57, character: '彳', hanViet: 'XÍCH', hiragana: 'ぎょうにんべん', positionType: 'hen', positionName: 'Xích (Bước ngắn bên trái)', meaning: 'Đi chậm, bước chân trái', strokeCount: 3, examples: ['役', '彼', '往', '征', '待', '律', '後', '徐', '径', '徒', '得', '徳'] },

  // --- 4 NÉT ---
  { number: 58, character: '心', variant: '忄 / 㠯', hanViet: 'TÂM', hiragana: 'りっしんべん', positionType: 'hen', positionName: 'Tâm đứng (Bên trái)', meaning: 'Trái tim, tấm lòng, cảm xúc', strokeCount: 4, examples: ['心', '必', '志', '快', '念', '怒', '怖', '思', '性', '恐', '恩', '息', '恵', '悟', '悩', '愛', '感', '想', '情'] },
  { number: 59, character: '戈', hanViet: 'GUA', hiragana: 'ほこ', meaning: 'Cây mác, vũ khí', strokeCount: 4, examples: ['戊', '成', '我', '戒', '戦', '戯', '國'] },
  { number: 60, character: '戸', hanViet: 'HỘ', hiragana: 'とびら', meaning: 'Cánh cửa một cánh, căn nhà', strokeCount: 4, examples: ['戸', '戻', '房', '所', '扇', '扉'] },
  { number: 61, character: '手', variant: '扌', hanViet: 'THỦ', hiragana: 'てへん', positionType: 'hen', positionName: 'Thủ gảy (Bên trái)', meaning: 'Bàn tay, hành động', strokeCount: 4, examples: ['手', '打', '払', '投', '折', '抜', '択', '披', '抱', '持', '指', '拾', '挙', '挑', '振'] },
  { number: 62, character: '支', hanViet: 'CHI', hiragana: 'しにょう', meaning: 'Cành cây, chống đỡ, chi nhánh', strokeCount: 4, examples: ['支', '枝', '肢'] },
  { number: 63, character: '攴', variant: '攵', hanViet: 'PHỐC', hiragana: 'のぎへん', positionType: 'tsukuri', meaning: 'Đánh nhẹ, thúc giục', strokeCount: 4, examples: ['改', '攻', '放', '政', '故', '教', '救', '敗', '敬', '数'] },
  { number: 64, character: '文', hanViet: 'VĂN', hiragana: 'ふみ', meaning: 'Văn chương, chữ viết', strokeCount: 4, examples: ['文', '斉', '対', '斐'] },
  { number: 65, character: '斗', hanViet: 'ĐẨU', hiragana: 'とます', meaning: 'Cái đẩu, cái gáo đo lường', strokeCount: 4, examples: ['料', '斜', '斛', '斟'] },
  { number: 66, character: '斤', hanViet: 'CÂN', hiragana: 'きん', meaning: 'Cái rìu, đơn vị cân', strokeCount: 4, examples: ['斤', '斧', '新', '斬', '断', '近'] },
  { number: 67, character: '方', hanViet: 'PHƯƠNG', hiragana: 'ほう', meaning: 'Phương hướng, phương pháp, hình vuông', strokeCount: 4, examples: ['方', '施', '旅', '族', '旗'] },
  { number: 68, character: '日', hanViet: 'NHẬT', hiragana: 'ひ', meaning: 'Mặt trời, ban ngày, ngày', strokeCount: 4, examples: ['日', '早', '旬', '明', '易', '昔', '星', '映', '春', '昨', '昭', '昼', '時', '晩', '晴', '暗', '間'] },
  { number: 69, character: '月', hanViet: 'NGUYỆT / NHỤC', hiragana: 'つき', positionType: 'hen', positionName: 'Nguyệt / Nhục (Bên trái)', meaning: 'Mặt trăng, tháng, thịt', strokeCount: 4, examples: ['月', '有', '服', '朋', '朝', '期', '木', '肌', '育', '能'] },
  { number: 70, character: '木', hanViet: 'MỘC', hiragana: 'き', positionType: 'hen', meaning: 'Cây cối, gỗ', strokeCount: 4, examples: ['木', '未', '末', '本', '札', '朱', '朴', '机', '朽', '杉', '材', '村', '束', '条', '来', '松', '板', '林', '枚', '枝', '枯', '柄', '某', '染', '柔', '柱', '柳', '査', '栄', '校', '株', '根', '格', '案', '梅', '条', '森', '極', '楽', '構', '様', '標', '鬱', '機', '新', '親'] },
  { number: 71, character: '欠', hanViet: 'KHUYẾT', hiragana: 'あくび', positionType: 'tsukuri', meaning: 'Ngáp, thiếu hụt', strokeCount: 4, examples: ['欠', '次', '欲', '欺', '歌', '歓', '飲'] },
  { number: 72, character: '止', hanViet: 'CHỈ', hiragana: 'とめる', meaning: 'Dừng lại, đứng yên', strokeCount: 4, examples: ['止', '正', '歩', '武', '歳', '歴'] },
  { number: 73, character: '歹', variant: '歺', hanViet: 'ĐÃI', hiragana: 'いちたへん', positionType: 'hen', meaning: 'Xương tàn, chết chóc', strokeCount: 4, examples: ['死', '殉', '殊', '残', '殖'] },
  { number: 74, character: '殳', hanViet: 'THÙ', hiragana: 'るwait', positionType: 'tsukuri', meaning: 'Binh khí bằng gỗ, đánh', strokeCount: 4, examples: ['段', '殷', '殺', '殿'] },
  { number: 75, character: '毋', variant: '母', hanViet: 'MẪU', hiragana: 'はは', meaning: 'Người mẹ, không được', strokeCount: 4, examples: ['母', '毎', '毒', '貫'] },
  { number: 76, character: '比', hanViet: 'TỶ', hiragana: 'くらべる', meaning: 'So sánh, hàng xóm', strokeCount: 4, examples: ['比', '皆', '毘', '琵'] },
  { number: 77, character: '毛', hanViet: 'MAO', hiragana: 'け', meaning: 'Lông, tóc, nhung', strokeCount: 4, examples: ['毛', '毫', '毬', '氈'] },
  { number: 78, character: '氏', hanViet: 'THỊ', hiragana: 'うじ', meaning: 'Họ tộc, dòng họ', strokeCount: 4, examples: ['氏', '民', '紙', '昏'] },
  { number: 79, character: '气', hanViet: 'KHÍ', hiragana: 'きがまえ', positionType: 'kamae', meaning: 'Khí quyển, hơi nước', strokeCount: 4, examples: ['気', '氛', '氤'] },
  { number: 80, character: '水', variant: '氵', hanViet: 'THỦY', hiragana: 'さんずい', positionType: 'hen', positionName: 'Thủy (Ba chấm nước bên trái)', meaning: 'Nước, chất lỏng, sông hồ', strokeCount: 4, examples: ['水', '氷', '永', '求', '汁', '汗', '江', '池', '決', '汽', '沖', '没', '沢', '河', '油', '治', '沼', '沿', '況', '泉', '泊', '法', '波', '泣', '注', '泰', '洋', '洗', '活', '派', '流', '浜', '浦', '浪', '浮', '浴', '海', '消', '深', '清', '済', '港', '湖', '湯', '渡', '満', '漂', '演', '漢'] },
  { number: 81, character: '火', variant: '灬', hanViet: 'HỎA', hiragana: 'ひ', positionType: 'hen', meaning: 'Lửa, sức nóng, ánh sáng', strokeCount: 4, examples: ['火', '灯', '灰', '災', '炊', '炎', '点', '為', '烈', '無', '焦', '然', '焼', '照', '熱'] },
  { number: 82, character: '爪', variant: '爫', hanViet: 'TRẢO', hiragana: 'つめ', positionType: 'kanmuri', meaning: 'Móng tay, vuốt chim thú', strokeCount: 4, examples: ['爪', '妥', '采', '受', '為', '愛'] },
  { number: 83, character: '父', hanViet: 'PHỤ', hiragana: 'ちち', meaning: 'Người cha, người đàn ông', strokeCount: 4, examples: ['父', '爸', '爺'] },
  { number: 84, character: '爻', hanViet: 'HÀO', hiragana: 'こう', meaning: 'Quẻ Bát quái, giao nhau', strokeCount: 4, examples: ['爽', '爾'] },
  { number: 85, character: '爿', hanViet: 'TƯỜNG', hiragana: 'しょうへん', meaning: 'Cái giường gỗ, mảnh gỗ', strokeCount: 4, examples: ['牀', '牆', '壯'] },
  { number: 86, character: '片', hanViet: 'PHIẾN', hiragana: 'かた', meaning: 'Mảnh vỡ, tấm thẻ', strokeCount: 4, examples: ['片', '版', '牌', '牒'] },
  { number: 87, character: '牙', hanViet: 'NHA', hiragana: 'きば', meaning: 'Răng hàm, ngà voi', strokeCount: 4, examples: ['牙', '芽', '邪'] },
  { number: 88, character: '牛', variant: '牜', hanViet: 'NGƯU', hiragana: 'うし', positionType: 'hen', meaning: 'Con bò, trâu', strokeCount: 4, examples: ['牛', '牟', '牡', '牧', '物', '特', '犠'] },
  { number: 89, character: '犬', variant: '犭', hanViet: 'KHUYỂN', hiragana: 'けものへん', positionType: 'hen', positionName: 'Khuyển (Bên trái)', meaning: 'Con chó, thú dữ', strokeCount: 4, examples: ['犬', '状', '狂', '狩', '独', '狭', '猛', '猜', '猫', '献', '猶', '獲'] },

  // --- 5 NÉT ---
  { number: 90, character: '玉', variant: '王 / 玊', hanViet: 'NGỌC / VƯƠNG', hiragana: 'おうへん', positionType: 'hen', positionName: 'Vương (Bên trái)', meaning: 'Đá quý, vua, quyền lực', strokeCount: 5, examples: ['玉', '王', '玩', '珍', '珠', '班', '現', '球', '理', '環', '璽'] },
  { number: 91, character: '瓜', hanViet: 'QUA', hiragana: 'うり', meaning: 'Quả dưa, dưa hấu', strokeCount: 5, examples: ['瓜', '瓢', '瓣'] },
  { number: 92, character: '瓦', hanViet: 'NGOẠ', hiragana: 'かわら', meaning: 'Ngói lợp nhà, đồ gốm', strokeCount: 5, examples: ['瓦', '瓶', '甑'] },
  { number: 93, character: '甘', hanViet: 'CAM', hiragana: 'あまい', meaning: 'Ngọt ngào, yêu thích', strokeCount: 5, examples: ['甘', '甚', '甜'] },
  { number: 94, character: '生', hanViet: 'SINH', hiragana: 'いきる', meaning: 'Sinh sống, sinh ra, tươi sống', strokeCount: 5, examples: ['生', '産', '隆', '甥'] },
  { number: 95, character: '用', hanViet: 'DỤNG', hiragana: 'もちいる', meaning: 'Sử dụng, dùng đến', strokeCount: 5, examples: ['用', '甫', '庸'] },
  { number: 96, character: '田', hanViet: 'ĐIỀN', hiragana: 'た', meaning: 'Ruộng đồng, đất canh tác', strokeCount: 5, examples: ['田', '由', '甲', '申', '男', '町', '画', '界', '留', '略', '番', '異', '畳'] },
  { number: 97, character: '疋', variant: '𤴔', hanViet: 'THẤT', hiragana: 'ひき', meaning: 'Cuộn vải, đơn vị đếm con vật', strokeCount: 5, examples: ['疋', '疏', '疑'] },
  { number: 98, character: '疒', hanViet: 'BỆNH', hiragana: 'やまいだれ', positionType: 'tare', positionName: 'Bệnh (Ốm đau)', meaning: 'Bệnh tật, ốm đau', strokeCount: 5, examples: ['病', '症', '痛', '疲', '疾', '痴', '療', '癖'] },
  { number: 99, character: '白', hanViet: 'BẠCH', hiragana: 'しろ', meaning: 'Màu trắng, rõ ràng, nói', strokeCount: 5, examples: ['白', '百', '的', '皇', '皆', '泉'] },
  { number: 100, character: '皮', hanViet: 'BÌ', hiragana: 'kegawa', meaning: 'Da, lớp vỏ bên ngoài', strokeCount: 5, examples: ['皮', '波', '破', '疲'] },
  { number: 101, character: '皿', hanViet: 'MÃNH', hiragana: 'さら', positionType: 'ashi', meaning: 'Cái đĩa, bát đĩa', strokeCount: 5, examples: ['皿', '盆', '益', '盛', '盟', '監', '盤'] },
  { number: 102, character: '目', variant: '罒', hanViet: 'MỤC', hiragana: 'め', meaning: 'Con mắt, nhìn, mục lục', strokeCount: 5, examples: ['目', '直', '相', '省', '眉', '看', '県', '真', '眼', '着', '見', '親'] },
  { number: 103, character: '矛', hanViet: 'MÂU', hiragana: 'ほこ', meaning: 'Cây giáo, mâu thuẫn', strokeCount: 5, examples: ['矛', '柔', '務', '矜'] },
  { number: 104, character: '矢', hanViet: 'THỈ', hiragana: 'や', meaning: 'Mũi tên, bắn', strokeCount: 5, examples: ['矢', '知', '短', '矩', '矯'] },
  { number: 105, character: '石', hanViet: 'THẠCH', hiragana: 'いし', positionType: 'hen', meaning: 'Hòn đá, chất khoáng', strokeCount: 5, examples: ['石', '砂', '研', '破', '硬', '確', '磁', '磨'] },
  { number: 106, character: '示', variant: '礻', hanViet: 'THỊ / KỲ', hiragana: 'しめすへん', positionType: 'hen', positionName: 'Thị (Bên trái)', meaning: 'Tế lễ, thần linh, tổ tiên, hiển thị', strokeCount: 5, examples: ['示', '礼', '社', '祈', '祉', '祐', '祖', '祝', '神', '祥', '票', '祭', '禁', '福'] },
  { number: 107, character: '禾', hanViet: 'HÒA', hiragana: 'のぎへん', positionType: 'hen', meaning: 'Cây lúa, ngũ cốc', strokeCount: 5, examples: ['私', '秋', '科', '秒', '秘', '租', '秩序', '移', '税', '稚', '種', '穀', '穂', '積', '穫'] },
  { number: 108, character: '穴', hanViet: 'HUYỆT', hiragana: 'あな', positionType: 'kanmuri', meaning: 'Hang động, lỗ hổng', strokeCount: 5, examples: ['穴', '究', '空', '突', '窃', '窒', '窓', '窮', '窺'] },
  { number: 109, character: '立', hanViet: 'LẬP', hiragana: 'たつ', meaning: 'Đứng thẳng, thành lập', strokeCount: 5, examples: ['立', '站', '竜', '章', '童', '端', '競', '新', '親'] },

  // --- 6 NÉT ---
  { number: 110, character: '竹', variant: '⺮', hanViet: 'TRÚC', hiragana: 'たけかんむり', positionType: 'kanmuri', positionName: 'Trúc (Phía trên)', meaning: 'Cây tre, đồ bằng tre', strokeCount: 6, examples: ['竹', '竿', '笑', '笛', '第', '筆', '等', '筋', '答', '策', '算', '管', '箱', '節', '築'] },
  { number: 111, character: '米', hanViet: 'MỄ', hiragana: 'こめ', meaning: 'Hạt gạo, ngũ cốc', strokeCount: 6, examples: ['米', '粉', '粒', '粗', '粘', '粋', '精', '糖', '糧'] },
  { number: 112, character: '糸', variant: '糹', hanViet: 'MỊCH', hiragana: 'いとへん', positionType: 'hen', positionName: 'Mịch (Sợi chỉ bên trái)', meaning: 'Sợi chỉ, dây thừng, liên kết', strokeCount: 6, examples: ['糸', '系', '紀', '約', '紅', '紋', '納', '紙', '級', '素', '細', '紳', '組', '終', '経', '結', '絞', '統', '絵', '絶', '絹', '続', '維', '網', '綿', '緊', '総', '緑', '緒', '線', '編', '緩', '練', '縁', '縦', '締'] },
  { number: 113, character: '缶', hanViet: 'PHẪU', hiragana: 'ほとぎ', meaning: 'Đồ sành sứ, lon kim loại', strokeCount: 6, examples: ['缶', '缺', '罅', '鬱'] },
  { number: 114, character: '网', variant: '罒 / ⺲', hanViet: 'VÕNG', hiragana: 'あみがしら', positionType: 'kanmuri', meaning: 'Cái lưới, bẫy', strokeCount: 6, examples: ['罕', '罪', '置', '罰', '署', '罷'] },
  { number: 115, character: '羊', variant: '⺧', hanViet: 'DƯƠNG', hiragana: 'ひつじ', meaning: 'Con dê, con cừu', strokeCount: 6, examples: ['羊', '美', '着', '群', '義', '養', '議'] },
  { number: 116, character: '羽', hanViet: 'VŨ', hiragana: 'はね', meaning: 'Lông vũ, cánh chim', strokeCount: 6, examples: ['羽', '翁', '翌', '習', '翠', '翼', '躍'] },
  { number: 117, character: '老', variant: '耂', hanViet: 'LÃO', hiragana: 'おいかんむり', meaning: 'Người già, lâu đời', strokeCount: 6, examples: ['老', '考', '者', '耆'] },
  { number: 118, character: '而', hanViet: 'NHI', hiragana: 'しかして', meaning: 'Mà, nhưng, râu riê:ng', strokeCount: 6, examples: ['而', '耐', '端'] },
  { number: 119, character: '耒', hanViet: 'LỖI', hiragana: 'らいすき', meaning: 'Cái cày, làm ruộng', strokeCount: 6, examples: ['耒', '耕', '耗'] },
  { number: 120, character: '耳', hanViet: 'NHĨ', hiragana: 'みみ', meaning: 'Cái tai, lắng nghe', strokeCount: 6, examples: ['耳', '取', '恥', '聖', '聞', '職'] },
  { number: 121, character: '聿', variant: '⺕', hanViet: 'DUẬT', hiragana: 'いつ', meaning: 'Cây bút tay cầm', strokeCount: 6, examples: ['聿', '建', '粛', '書', '津'] },
  { number: 122, character: '肉', variant: '⺼ (月)', hanViet: 'NHỤC / NGUYỆT', hiragana: 'にくづき', positionType: 'hen', positionName: 'Nhục (Thịt bên trái)', meaning: 'Thịt, cơ thể con người', strokeCount: 6, examples: ['肉', '肌', '肖', '胃', '背', '胎', '胞', '胸', '脂', '胴', '脳', '脚', '脱', '腰', '腸', '腹', '臓', '能'] },
  { number: 123, character: '臣', hanViet: 'THẦN', hiragana: 'しん', meaning: 'Bầy tôi, quan lại', strokeCount: 6, examples: ['臣', '臥', '臨'] },
  { number: 124, character: '自', hanViet: 'TỰ', hiragana: 'みずから', meaning: 'Tự bản thân, từ đâu', strokeCount: 6, examples: ['自', '臭', '息'] },
  { number: 125, character: '至', hanViet: 'CHÍ', hiragana: 'いたる', meaning: 'Đến nơi, tột cùng', strokeCount: 6, examples: ['至', '致', '台'] },
  { number: 126, character: '臼', hanViet: 'CỮU', hiragana: 'うす', meaning: 'Cái cối giã gạo', strokeCount: 6, examples: ['臼', '舂', '舅', '興'] },
  { number: 127, character: '舌', hanViet: 'THIỆT', hiragana: 'した', meaning: 'Cái lưỡi, nếm', strokeCount: 6, examples: ['舌', '舎', '舐', '館', '話'] },
  { number: 128, character: '舛', hanViet: 'SUẪN', hiragana: 'まいあし', meaning: 'Trái ngược, nhảy múa', strokeCount: 6, examples: ['舞', '舜'] },
  { number: 129, character: '舟', hanViet: 'CHU', hiragana: 'ふね', positionType: 'hen', meaning: 'Con thuyền, tàu bè', strokeCount: 6, examples: ['舟', '航', '船', '舶', '艇', '艦'] },
  { number: 130, character: '艮', hanViet: 'CẤN', hiragana: 'うしとら', meaning: 'Quẻ Cấn, ngừng lại, bền cứng', strokeCount: 6, examples: ['良', '艱', '銀'] },
  { number: 131, character: '色', hanViet: 'SẮC', hiragana: 'いろ', meaning: 'Màu sắc, vẻ mặt, ham muốn', strokeCount: 6, examples: ['色', '艶', '艷'] },
  { number: 132, character: '艸', variant: '艹', hanViet: 'THẢO', hiragana: 'くさかんむり', positionType: 'kanmuri', positionName: 'Thảo (Cỏ phía trên)', meaning: 'Cỏ cây, hoa lá, thảo mộc', strokeCount: 6, examples: ['芋', '花', '芳', '芽', '若', '苦', '英', '茂', '茶', '草', '荒', '荷', '華', '落', '葉', '著', '葬', '蒸', '蔵', '薬'] },
  { number: 133, character: '虫', hanViet: 'TRÙNG', hiragana: 'むし', meaning: 'Côn trùng, sâu bọ', strokeCount: 6, examples: ['虫', '蚕', '蛇', '蛍', '蛮', '蝶', '融'] },
  { number: 134, character: '血', hanViet: 'HUYẾT', hiragana: 'ち', meaning: 'Máu, huyết thống', strokeCount: 6, examples: ['血', '衆', '衄'] },
  { number: 135, character: '行', hanViet: 'HÀNH', hiragana: 'ぎょう', meaning: 'Đi lại, thực hành, hàng lối', strokeCount: 6, examples: ['行', '術', '街', '衝', '衛'] },
  { number: 136, character: '衣', variant: '衤', hanViet: 'Y', hiragana: 'ころもへん', positionType: 'hen', positionName: 'Y (Áo quần bên trái)', meaning: 'Áo quần, trang phục', strokeCount: 6, examples: ['衣', '表', '初', '被', '裕', '補', '裸', '製', '複', '襟', '襲'] },
  { number: 137, character: '西', variant: '覀 / 襾', hanViet: 'TÂY', hiragana: 'にし', meaning: 'Phương Tây, che đậy', strokeCount: 6, examples: ['西', '要', '覇'] },

  // --- 7 NÉT THƯỜNG GẶP ---
  { number: 138, character: '見', hanViet: 'KIẾN', hiragana: 'みる', meaning: 'Nhìn thấy, quan điểm', strokeCount: 7, examples: ['見', '規', '視', '覚', '親', '観'] },
  { number: 139, character: '角', hanViet: 'GIÁC', hiragana: 'つの', meaning: 'Sừng động vật, góc vuông', strokeCount: 7, examples: ['角', '解', '触'] },
  { number: 140, character: '言', variant: '訁', hanViet: 'NGÔN', hiragana: 'ごんべん', positionType: 'hen', positionName: 'Ngôn (Lời nói bên trái)', meaning: 'Lời nói, ngôn ngữ, thảo luận', strokeCount: 7, examples: ['言', '訂', '計', '討', '訓', '記', '設', '許', '訳', '訴', '診', '証', '詐', '評', '詞', '詠', '試', '詩', '話', '誌', '語', '誠', '誤', '説', '読', '課', '調', '談', '論', '諸', '諾', '謙', '講', '謝', '識', '警', '議'] },
  { number: 141, character: '谷', hanViet: 'CỐC', hiragana: 'たに', meaning: 'Thung lũng, hẻm núi', strokeCount: 7, examples: ['谷', '却', '欲', '雅'] },
  { number: 142, character: '豆', hanViet: 'ĐẬU', hiragana: 'まめ', meaning: 'Hạt đậu, cái đĩa cúng', strokeCount: 7, examples: ['豆', '短', '豊', '頭'] },
  { number: 143, character: '豕', hanViet: 'THỈ', hiragana: 'いのしし', meaning: 'Con heo, lợn rừng', strokeCount: 7, examples: ['豚', '象', '豪', '毅', '家'] },
  { number: 144, character: '豸', hanViet: 'TRÃI', hiragana: 'むじな', meaning: 'Loài thú bò, mèo cọp', strokeCount: 7, examples: ['豹', '貌', '財'] },
  { number: 145, character: '貝', hanViet: 'BỐI', hiragana: 'かい', positionType: 'hen', positionName: 'Bối (Vỏ sò/Tiền bạc)', meaning: 'Vỏ sò, tiền tài, của cải, của quí', strokeCount: 7, examples: ['貝', '貞', '負', '財', '貢', '貧', '貨', '販', '貪', '貫', '責', '貯', '貴', '買', '貸', '費', '貿', '賀', '賃', '資', '賦', '賞', '賠', '賢', '売', '頼'] },
  { number: 146, character: '赤', hanViet: 'XÍCH', hiragana: 'あか', meaning: 'Màu đỏ, xích tinh, trống rỗng', strokeCount: 7, examples: ['赤', '赦', '赫'] },
  { number: 147, character: '走', hanViet: 'TẨU', hiragana: 'hashiru', positionType: 'nyo', meaning: 'Chạy, đi nhanh', strokeCount: 7, examples: ['走', '赴', '起', '越', '超', '趣'] },
  { number: 148, character: '足', variant: '足', hanViet: 'TÚC', hiragana: 'あし', positionType: 'hen', meaning: 'Cái chân, đầy đủ', strokeCount: 7, examples: ['足', '距', '跡', '路', '跳', '踊', '踏', '躍'] },
  { number: 149, character: '身', hanViet: 'THÂN', hiragana: 'み', meaning: 'Thân thể, bản thân', strokeCount: 7, examples: ['身', '躬', '躯'] },
  { number: 150, character: '車', hanViet: 'XA', hiragana: 'くるま', positionType: 'hen', meaning: 'Xe cộ, bánh xe', strokeCount: 7, examples: ['車', '軌', '軍', '軒', '軟', '転', '軸', '軽', '較', '載', '輪', '輸', '連'] },
  { number: 151, character: '辛', hanViet: 'TÂN', hiragana: 'karai', meaning: 'Vị cay, vất vả, can Tân', strokeCount: 7, examples: ['辛', '辜', '辟', '辣'] },
  { number: 152, character: '辰', hanViet: 'THẦN', hiragana: 'しんのたつ', meaning: 'Ngôi sao, rồng, giờ Thìn', strokeCount: 7, examples: ['辰', '辱', '農'] },
  { number: 153, character: '辵', variant: '辶', hanViet: 'SƯỚC', hiragana: 'しんにょう', positionType: 'nyo', positionName: 'Sước (Bước đi bên dưới/trái)', meaning: 'Chạy đi, di chuyển, qua lại', strokeCount: 7, examples: ['込', '巡', '迫', '迎', '返', '近', '述', '迷', '追', '退', '送', '逃', '逆', '透', '逐', '途', '通', '速', '造', '連', '週', '進', '逸', '遂', '遅', '遇', '遊', '運', '遍', '過', '道', '達', '違', '遠', '適', '選', '避', '遷', '邁', '還'] },
  { number: 154, character: '邑', variant: '阝 (Bên phải)', hanViet: 'ẤP', hiragana: 'おおざと', positionType: 'tsukuri', positionName: 'Ấp (Phải)', meaning: 'Thành thị, xóm làng, đất phong', strokeCount: 7, examples: ['那', '邦', '邪', '邸', '郊', '郎', '部', '郭', '都', '郷'] },
  { number: 155, character: '阜', variant: '阝 (Bên trái)', hanViet: 'PHỤ', hiragana: 'こざとへん', positionType: 'hen', positionName: 'Phụ (Trái)', meaning: 'Gò đất, núi cao, địa hình', strokeCount: 7, examples: ['阪', '防', '阻', '附', '降', '限', '陛', '院', '陣', '除', '陸', '陰', '陳', '陵', '陶', '陥', '陽', '隊', '階', '隔', '際', '障', '隠'] },

  // --- 8+ NÉT TRỌNG TÂM ---
  { number: 156, character: '金', variant: '釒', hanViet: 'KIM', hiragana: 'かねへん', positionType: 'hen', positionName: 'Kim (Kim loại)', meaning: 'Kim loại, vàng, tiền bạc, chuông', strokeCount: 8, examples: ['金', '釘', '針', '釣', '鈍', '鈴', '鉄', '鉛', '鉢', '鉱', '銀', '銃', '銅', '銘', '銭', '鋭', '鋳', '鋼', '錘', '錠', '錬', '錯', '録', '鏡', '鑑'] },
  { number: 157, character: '長', hanViet: 'TRƯỜNG / TRƯỞNG', hiragana: 'ながい', meaning: 'Dài lâu, trưởng thành, người đứng đầu', strokeCount: 8, examples: ['長', '肆', '張'] },
  { number: 158, character: '門', hanViet: 'MÔN', hiragana: 'もんがまえ', positionType: 'kamae', positionName: 'Môn (Cổng nhà)', meaning: 'Hai cánh cổng, lối ra vào', strokeCount: 8, examples: ['門', '閃', '閉', '開', '潤', '間', '関', '閣', '閥', '闇', '闘', '聞'] },
  { number: 159, character: '雨', hanViet: 'VŨ', hiragana: 'あめかんむり', positionType: 'kanmuri', meaning: 'Mưa, hiện tượng thời tiết', strokeCount: 8, examples: ['雨', '雪', '雲', '零', '電', '震', '露', '覇'] },
  { number: 160, character: '青', hanViet: 'THANH', hiragana: 'あお', meaning: 'Màu xanh, tuổi trẻ, thanh khiết', strokeCount: 8, examples: ['青', '靖', '静', '靛', '情'] },
  { number: 161, character: '非', hanViet: 'PHI', hiragana: '非', meaning: 'Không phải, sai lầm, chống đối', strokeCount: 8, examples: ['非', '悲', '罪', '排', '輩'] },
  { number: 162, character: '面', hanViet: 'DIỆN', hiragana: 'めん', meaning: 'Mặt, bề mặt, diện tích', strokeCount: 9, examples: ['面', '革', '靴'] },
  { number: 163, character: '音', hanViet: 'ÂM', hiragana: 'おと', meaning: 'Âm thanh, tiếng động, âm nhạc', strokeCount: 9, examples: ['音', '韻', '響', '暗'] },
  { number: 164, character: '頁', hanViet: 'HIỆT', hiragana: 'おおがい', positionType: 'tsukuri', positionName: 'Hiệt (Đầu người)', meaning: 'Đầu người, trang sách, danh mục', strokeCount: 9, examples: ['頂', '順', '須', '預', '領', '頭', '頻', '題', '額', '顔', '願', '類'] },
  { number: 165, character: '風', hanViet: 'PHONG', hiragana: 'かぜ', meaning: 'Gió, phong cách, tục lệ', strokeCount: 9, examples: ['風', '嵐', '飄'] },
  { number: 166, character: '食', variant: '飠', hanViet: 'THỰC', hiragana: 'しょくへん', positionType: 'hen', positionName: 'Thực (Ăn uống)', meaning: 'Ăn uống, thức ăn, thực phẩm', strokeCount: 9, examples: ['食', '飯', '飲', '飼', '飽', '飾', '養', '館', '首', '餞'] },
  { number: 167, character: '首', hanViet: 'THỦ', hiragana: 'くび', meaning: 'Cái cổ, người đứng đầu', strokeCount: 9, examples: ['首', '道', '題'] },
  { number: 168, character: '香', hanViet: 'HƯƠNG', hiragana: 'かおり', meaning: 'Mùi hương thơm, thắp hương', strokeCount: 9, examples: ['香', '馥', '馨'] },
  { number: 169, character: '馬', hanViet: 'MÃ', hiragana: 'うまへん', positionType: 'hen', meaning: 'Con ngựa', strokeCount: 10, examples: ['馬', '駅', '駆', '駐', '駿', '験', '騎', '騒'] },
  { number: 170, character: '骨', hanViet: 'CỐT', hiragana: 'ほね', meaning: 'Xương cốt, khung sườn', strokeCount: 10, examples: ['骨', '髄', '体'] },
  { number: 171, character: '高', hanViet: 'CAO', hiragana: 'たかい', meaning: 'Cao cấp, chiều cao', strokeCount: 10, examples: ['高', '稿', '膏'] },
  { number: 172, character: '魚', hanViet: 'NGƯ', hiragana: 'うおへん', positionType: 'hen', meaning: 'Con cá, hải sản', strokeCount: 11, examples: ['魚', '魯', '鮮', '鯨', '鰐'] },
  { number: 173, character: '鳥', hanViet: 'ĐIỂU', hiragana: 'とり', meaning: 'Con chim, gia cầm', strokeCount: 11, examples: ['鳥', '鳩', '鳳', '鳴', '鴨', '鶴', '鷹'] },
  { number: 174, character: '鹿', hanViet: 'LỘC', hiragana: 'しか', meaning: 'Con hươu, nai', strokeCount: 11, examples: ['鹿', '麗', '麟'] },
  { number: 175, character: '麻', hanViet: 'MA', hiragana: 'あさ', meaning: 'Cây gai, đay, tê dại', strokeCount: 11, examples: ['麻', '磨', '摩'] },
  { number: 176, character: '黄', hanViet: 'HOÀNG', hiragana: 'きいろ', meaning: 'Màu vàng hoàng kim', strokeCount: 12, examples: ['黄', '横'] },
  { number: 177, character: '黒', hanViet: 'HẮC', hiragana: 'くろ', meaning: 'Màu đen, bóng tối', strokeCount: 12, examples: ['黒', '黙', '黛'] },
  { number: 178, character: '鼓', hanViet: 'CỔ', hiragana: 'つづみ', meaning: 'Cái trống, đánh trống', strokeCount: 13, examples: ['鼓', '鼙'] },
  { number: 179, character: '鼠', hanViet: 'THỬ', hiragana: 'ねずみ', meaning: 'Con chuột', strokeCount: 13, examples: ['鼠', '鼬'] },
  { number: 180, character: '鼻', hanViet: 'TỊ', hiragana: 'はな', meaning: 'Cái mũi, hít thở', strokeCount: 14, examples: ['鼻', '鼾'] },
  { number: 181, character: '齊', variant: '斉', hanViet: 'TỀ', hiragana: 'せい', meaning: 'Đồng đều, bằng nhau', strokeCount: 14, examples: ['斉', '斎'] },
  { number: 182, character: '歯', hanViet: 'XỈ', hiragana: 'は', meaning: 'Răng, số tuổi', strokeCount: 15, examples: ['歯', '齢', '齧'] },
  { number: 183, character: '龍', variant: '竜', hanViet: 'LONG', hiragana: 'りゅう', meaning: 'Con rồng, uy quyền', strokeCount: 16, examples: ['竜', '瀧', '襲'] },
  { number: 184, character: '龜', variant: '亀', hanViet: 'QUY', hiragana: 'kame', meaning: 'Con rùa, trường thọ', strokeCount: 16, examples: ['亀'] },
  { number: 185, character: '龠', hanViet: 'DƯỢC', hiragana: 'やく', meaning: 'Cây sáo ống, âm nhạc', strokeCount: 17, examples: ['龠', '龢'] }
];

/**
 * Bản đồ phân bóc tách Kanji chi tiết và Mẹo nhớ (Mnemonics) mẫu cho JLPT
 */
export const KANJI_DECOMPOSITIONS: Record<string, KanjiDecomposition> = {
  能: {
    kanji: '能',
    hanViet: 'NĂNG',
    primaryRadical: '月 (Nguyệt / Nhục)',
    components: [
      { radical: '月', hanViet: 'NGUYỆT / NHỤC', meaning: 'Cơ thể, thịt, sức vóc', strokeCount: 4, positionType: 'hen', positionName: 'Bên trái (Hen)' },
      { radical: '厶', hanViet: 'TƯ', meaning: 'Riêng tư, tự thân', strokeCount: 2, positionType: 'kanmuri', positionName: 'Giữa trên' },
      { radical: '匕', hanViet: 'CHỦY', meaning: 'Cái thìa, con dao nhỏ', strokeCount: 2, positionType: 'tsukuri', positionName: 'Trên phải' },
      { radical: '匕', hanViet: 'CHỦY', meaning: 'Cái thìa, con dao nhỏ', strokeCount: 2, positionType: 'ashi', positionName: 'Dưới phải' },
    ],
    mnemonicStory: 'Dùng CƠ THỂ (月) và ý chí BẢN THÂN (厶) rèn luyện với 2 KHÍ CỤ (匕 匕) để khẳng định NĂNG LỰC (能).',
  },
  語: {
    kanji: '語',
    hanViet: 'NGỮ',
    primaryRadical: '言 (Ngôn)',
    components: [
      { radical: '言', hanViet: 'NGÔN', meaning: 'Lời nói, ngôn ngữ', strokeCount: 7, positionType: 'hen', positionName: 'Bên trái (Hen)' },
      { radical: '五', hanViet: 'NGŨ', meaning: 'Số 5, năm', strokeCount: 4, positionType: 'kanmuri', positionName: 'Giữa trên' },
      { radical: '口', hanViet: 'KHẨU', meaning: 'Cái miệng', strokeCount: 3, positionType: 'ashi', positionName: 'Phía dưới' },
    ],
    mnemonicStory: 'Dùng LỜI NÓI (言) phát ra từ MIỆNG (口) qua 5 (五) giác quan để giao tiếp bằng NGÔN NGỮ (語).',
  },
  休: {
    kanji: '休',
    hanViet: 'HƯU',
    primaryRadical: '人 (Nhân)',
    components: [
      { radical: '亻', hanViet: 'NHÂN', meaning: 'Con người', strokeCount: 2, positionType: 'hen', positionName: 'Bên trái (Hen)' },
      { radical: '木', hanViet: 'MỘC', meaning: 'Cây cối', strokeCount: 4, positionType: 'tsukuri', positionName: 'Bên phải (Tsukuri)' },
    ],
    mnemonicStory: 'NGƯỜI (亻) đứng dựa vào gốc CÂY (木) để NGHỈ NƠI (休).',
  },
  働: {
    kanji: '働',
    hanViet: 'ĐỘNG',
    primaryRadical: '人 (Nhân)',
    components: [
      { radical: '亻', hanViet: 'NHÂN', meaning: 'Con người', strokeCount: 2, positionType: 'hen', positionName: 'Bên trái (Hen)' },
      { radical: '重', hanViet: 'TRỌNG', meaning: 'Nặng nề, quan trọng', strokeCount: 9, positionType: 'center', positionName: 'Giữa' },
      { radical: '力', hanViet: 'LỰC', meaning: 'Sức mạnh, sức lực', strokeCount: 2, positionType: 'tsukuri', positionName: 'Bên phải (Tsukuri)' },
    ],
    mnemonicStory: 'NGƯỜI (亻) bỏ SỨC LỰC (力) ra di chuyển vật NẶNG (重) tức là đang LÀM VIỆC (働).',
  },
  話: {
    kanji: '話',
    hanViet: 'THOẠI',
    primaryRadical: '言 (Ngôn)',
    components: [
      { radical: '言', hanViet: 'NGÔN', meaning: 'Lời nói', strokeCount: 7, positionType: 'hen', positionName: 'Bên trái (Hen)' },
      { radical: '舌', hanViet: 'THIỆT', meaning: 'Cái lưỡi', strokeCount: 6, positionType: 'tsukuri', positionName: 'Bên phải (Tsukuri)' },
    ],
    mnemonicStory: 'LƯỠI (舌) uốn nắn phát ra LỜI NÓI (言) chính là TRÒ CHUYỆN / NÓI CHUYỆN (話).',
  },
  読: {
    kanji: '読',
    hanViet: 'ĐỌC',
    primaryRadical: '言 (Ngôn)',
    components: [
      { radical: '言', hanViet: 'NGÔN', meaning: 'Lời nói, chữ viết', strokeCount: 7, positionType: 'hen', positionName: 'Bên trái (Hen)' },
      { radical: '売', hanViet: 'MẠI', meaning: 'Bán hàng', strokeCount: 7, positionType: 'tsukuri', positionName: 'Bên phải (Tsukuri)' },
    ],
    mnemonicStory: 'NÓI (言) ra lời thuyết minh khi BÁN (売) hàng để người mua ĐỌC (読) thông tin.',
  },
  試: {
    kanji: '試',
    hanViet: 'THÍ',
    primaryRadical: '言 (Ngôn)',
    components: [
      { radical: '言', hanViet: 'NGÔN', meaning: 'Lời nói, bài thi', strokeCount: 7, positionType: 'hen', positionName: 'Bên trái (Hen)' },
      { radical: '式', hanViet: 'THỨC', meaning: 'Công thức, quy tắc', strokeCount: 6, positionType: 'tsukuri', positionName: 'Bên phải (Tsukuri)' },
    ],
    mnemonicStory: 'Đọc LỜI NÓI (言) theo đúng CÔNG THỨC (式) trong kỳ THI THỬ (試).',
  },
  験: {
    kanji: '験',
    hanViet: 'NGHIỆM',
    primaryRadical: '馬 (Mã)',
    components: [
      { radical: '馬', hanViet: 'MÃ', meaning: 'Con ngựa', strokeCount: 10, positionType: 'hen', positionName: 'Bên trái (Hen)' },
      { radical: '全', hanViet: 'HOÀN / TOÀN', meaning: 'Hoàn toàn', strokeCount: 6, positionType: 'tsukuri', positionName: 'Bên phải (Tsukuri)' },
    ],
    mnemonicStory: 'Cưỡi NGỰA (馬) đi thử thách qua TOÀN BỘ (全) chặng đường để KIỂM NGHIỆM (験) sức bền.',
  },
  学: {
    kanji: '学',
    hanViet: 'HỌC',
    primaryRadical: '子 (Tử)',
    components: [
      { radical: '⺍', hanViet: 'TRÚC', meaning: 'Ba chấm học tập', strokeCount: 3, positionType: 'kanmuri', positionName: 'Trên cùng' },
      { radical: '冖', hanViet: 'MỊCH', meaning: 'Mái che', strokeCount: 2, positionType: 'kanmuri', positionName: 'Mái nhà' },
      { radical: '子', hanViet: 'TỬ', meaning: 'Đứa trẻ', strokeCount: 3, positionType: 'ashi', positionName: 'Phía dưới' },
    ],
    mnemonicStory: 'ĐỨA TRẺ (子) ngồi dưới MÁI TRƯỜNG (冖) sáng tiếp thu kiến thức là đang HỌC (学).',
  },
  校: {
    kanji: '校',
    hanViet: 'HIỆU',
    primaryRadical: '木 (Mộc)',
    components: [
      { radical: '木', hanViet: 'MỘC', meaning: 'Cây cối, gỗ dựng trường', strokeCount: 4, positionType: 'hen', positionName: 'Bên trái (Hen)' },
      { radical: '交', hanViet: 'GIAO', meaning: 'Giao lưu, kết bạn', strokeCount: 6, positionType: 'tsukuri', positionName: 'Bên phải (Tsukuri)' },
    ],
    mnemonicStory: 'Ngôi nhà làm bằng GỖ (木) nơi mọi người GIAO LƯU (交) kiến thức chính là TRƯỜNG HỌC (校).',
  },
  食: {
    kanji: '食',
    hanViet: 'THỰC',
    primaryRadical: '食 (Thực)',
    components: [
      { radical: '人', hanViet: 'NHÂN', meaning: 'Con người', strokeCount: 2, positionType: 'kanmuri', positionName: 'Trên' },
      { radical: '良', hanViet: 'LƯƠNG', meaning: 'Tốt lành, ngon lành', strokeCount: 7, positionType: 'ashi', positionName: 'Dưới' },
    ],
    mnemonicStory: 'CON NGƯỜI (人) ăn những thức ăn TỐT (良) cho sức khỏe gọi là THỰC PHẨM / ĂN (食).',
  },
  飲: {
    kanji: '飲',
    hanViet: 'ẨM',
    primaryRadical: '食 (Thực)',
    components: [
      { radical: '飠', hanViet: 'THỰC', meaning: 'Thức ăn, ăn uống', strokeCount: 8, positionType: 'hen', positionName: 'Bên trái (Hen)' },
      { radical: '欠', hanViet: 'KHUYẾT', meaning: 'Há miệng, ngáp', strokeCount: 4, positionType: 'tsukuri', positionName: 'Bên phải (Tsukuri)' },
    ],
    mnemonicStory: 'HÁ MIỆNG (欠) ra để đưa ĐỒ ĂN UỐNG (飠) vào cổ họng chính là UỐNG (飲).',
  },
  男: {
    kanji: '男',
    hanViet: 'NAM',
    primaryRadical: '田 (Điền)',
    components: [
      { radical: '田', hanViet: 'ĐIỀN', meaning: 'Ruộng đồng', strokeCount: 5, positionType: 'kanmuri', positionName: 'Phía trên' },
      { radical: '力', hanViet: 'LỰC', meaning: 'Sức lực', strokeCount: 2, positionType: 'ashi', positionName: 'Phía dưới' },
    ],
    mnemonicStory: 'Người dùng SỨC LỰC (力) làm việc trên RUỘNG ĐỒNG (田) là người ĐÀN ÔNG (男).',
  },
  愛: {
    kanji: '愛',
    hanViet: 'ÁI',
    primaryRadical: '心 (Tâm)',
    components: [
      { radical: '爪', hanViet: 'TRẢO', meaning: 'Bàn tay ôm lấy', strokeCount: 4, positionType: 'kanmuri', positionName: 'Phía trên' },
      { radical: '冖', hanViet: 'MỊCH', meaning: 'Khăn trùm che chở', strokeCount: 2, positionType: 'kanmuri', positionName: 'Giữa' },
      { radical: '心', hanViet: 'TÂM', meaning: 'Trái tim', strokeCount: 4, positionType: 'center', positionName: 'Trung tâm' },
      { radical: '夂', hanViet: 'TRUY', meaning: 'Bước chân chậm rãi', strokeCount: 3, positionType: 'ashi', positionName: 'Phía dưới' },
    ],
    mnemonicStory: 'BÀN TAY (爪) đón lấy, MÁI CHE (冖) đùm bọc, TRÁI TIM (心) chân thành dõi theo từng BƯỚC CHÂN (夂) chính là TÌNH YÊU (愛).',
  },
  警: {
    kanji: '警',
    hanViet: 'CẢNH',
    primaryRadical: '言 (Ngôn)',
    components: [
      { radical: '敬', hanViet: 'KÍNH', meaning: 'Tôn kính, nghiêm túc', strokeCount: 12, positionType: 'kanmuri', positionName: 'Phía trên' },
      { radical: '言', hanViet: 'NGÔN', meaning: 'Lời nói', strokeCount: 7, positionType: 'ashi', positionName: 'Phía dưới' },
    ],
    mnemonicStory: 'LỜI NÓI (言) KÍNH CẨN (敬) cảnh báo nguy hiểm là CẢNH SÁT / CẢNH BÁO (警).',
  },
  躍: {
    kanji: '躍',
    hanViet: 'DƯỢC',
    primaryRadical: '足 (Túc)',
    components: [
      { radical: '足', hanViet: 'TÚC', meaning: 'Cái chân', strokeCount: 7, positionType: 'hen', positionName: 'Bên trái (Hen)' },
      { radical: '曜', hanViet: 'DIỆU', meaning: 'Rực rỡ, chim hót', strokeCount: 14, positionType: 'tsukuri', positionName: 'Bên phải (Tsukuri)' },
    ],
    mnemonicStory: 'Dùng ĐÔI CHÂN (足) bật nhảy cao RỰC RỠ (曜) là NHẢY VỌT / NHẢY MÚA (躍).',
  },
  鬱: {
    kanji: '鬱',
    hanViet: 'UẤT',
    primaryRadical: '鬯 (Sưởng)',
    components: [
      { radical: '木', hanViet: 'MỘC', meaning: 'Cây cối', strokeCount: 4, positionType: 'kanmuri', positionName: 'Góc trái' },
      { radical: '缶', hanViet: 'PHẪU', meaning: 'Chậu gốm', strokeCount: 6, positionType: 'kanmuri', positionName: 'Giữa trên' },
      { radical: '木', hanViet: 'MỘC', meaning: 'Cây cối', strokeCount: 4, positionType: 'kanmuri', positionName: 'Góc phải' },
      { radical: '冖', hanViet: 'MỊCH', meaning: 'Khăn trùm', strokeCount: 2, positionType: 'center', positionName: 'Giữa' },
      { radical: '彡', hanViet: 'SAM', meaning: 'Lông tóc rậm', strokeCount: 3, positionType: 'ashi', positionName: 'Phía dưới' },
    ],
    mnemonicStory: 'Rừng CÂY (木) bọc quanh BÌNH RƯỢU (缶), bị CHE KHUẤT (冖) làm lòng người u sầu UẤT ỨC (鬱).',
  },
  議: {
    kanji: '議',
    hanViet: 'NGHỊ',
    primaryRadical: '言 (Ngôn)',
    components: [
      { radical: '言', hanViet: 'NGÔN', meaning: 'Lời nói, phát biểu', strokeCount: 7, positionType: 'hen', positionName: 'Bên trái (Hen)' },
      { radical: '羊', hanViet: 'DƯƠNG', meaning: 'Con dê, sự dịu dàng', strokeCount: 6, positionType: 'kanmuri', positionName: 'Phía trên' },
      { radical: '我', hanViet: 'NGÃ', meaning: 'Bản thân ta', strokeCount: 7, positionType: 'tsukuri', positionName: 'Bên phải' },
    ],
    mnemonicStory: 'NÓI (言) ra quan điểm về CÁI TÔI (我) bằng thái độ ÔN HÒA (羊) gọi là THẢO LUẬN / HỘI NGHỊ (議).',
  },
  新: {
    kanji: '新',
    hanViet: 'TÂN',
    primaryRadical: '斤 (Cân)',
    components: [
      { radical: '立', hanViet: 'LẬP', meaning: 'Đứng vững', strokeCount: 5, positionType: 'kanmuri', positionName: 'Trái trên' },
      { radical: '木', hanViet: 'MỘC', meaning: 'Cây cối', strokeCount: 4, positionType: 'ashi', positionName: 'Trái dưới' },
      { radical: '斤', hanViet: 'CÂN', meaning: 'Cái rìu', strokeCount: 4, positionType: 'tsukuri', positionName: 'Bên phải' },
    ],
    mnemonicStory: 'ĐỨNG (立) trên CÂY (木) dùng RÌU (斤) đốn củi để đón cái MỚI (新).',
  },
  親: {
    kanji: '親',
    hanViet: 'THÂN',
    primaryRadical: '見 (Kiến)',
    components: [
      { radical: '立', hanViet: 'LẬP', meaning: 'Đứng vững', strokeCount: 5, positionType: 'kanmuri', positionName: 'Trái trên' },
      { radical: '木', hanViet: 'MỘC', meaning: 'Cây cối', strokeCount: 4, positionType: 'ashi', positionName: 'Trái dưới' },
      { radical: '見', hanViet: 'KIẾN', meaning: 'Nhìn thấy', strokeCount: 7, positionType: 'tsukuri', positionName: 'Bên phải' },
    ],
    mnemonicStory: 'ĐỨNG (立) trên CÂY (木) DÕI MẮT NHÌN (見) con cái chính là CHA MẸ THÂN YÊU (親).',
  },
  家: {
    kanji: '家',
    hanViet: 'GIA',
    primaryRadical: '宀 (Miên)',
    components: [
      { radical: '宀', hanViet: 'MIÊN', meaning: 'Mái nhà', strokeCount: 3, positionType: 'kanmuri', positionName: 'Mái nhà (Kanmuri)' },
      { radical: '豕', hanViet: 'THỈ', meaning: 'Con lợn, heo', strokeCount: 7, positionType: 'ashi', positionName: 'Dưới nhà' },
    ],
    mnemonicStory: 'Dưới MÁI NHÀ (宀) nuôi con LỢN (豕) tượng trưng cho NGÔI NHÀ / GIA ĐÌNH (家).',
  },
};

/**
 * Tìm hoặc tạo tự động bóc tách bộ thủ cho chữ Kanji bất kỳ (Tích hợp KanjiVG SVG parser)
 */
export function getKanjiDecomposition(
  kanji: string,
  hanVietName?: string,
  svgContent?: string
): KanjiDecomposition {
  // Priority 1: Check curated dictionary map first
  if (KANJI_DECOMPOSITIONS[kanji]) {
    return KANJI_DECOMPOSITIONS[kanji];
  }

  // Priority 2: Parse SVG KanjiVG XML sub-elements if SVG content is provided
  if (svgContent) {
    const extractedFromSvg = extractSubElementsFromSvg(svgContent, kanji);
    if (extractedFromSvg.length > 0) {
      const primaryRad = extractedFromSvg[0];
      const storyParts = extractedFromSvg.map((c) => `[${c.radical} - ${c.hanViet}: ${c.meaning}]`);

      return {
        kanji,
        hanViet: hanVietName || 'HÁN',
        primaryRadical: `${primaryRad.radical} (${primaryRad.hanViet})`,
        components: extractedFromSvg,
        mnemonicStory: `Ghi nhớ chữ ${kanji} (${hanVietName || ''}) bằng cách ghép các bộ thủ: ${storyParts.join(', ')}.`,
      };
    }
  }

  // Priority 3: Fallback scan against 214 Kangxi Radicals list
  const matchingRadicals = RADICALS_LIST.filter(
    (r) =>
      r.character === kanji ||
      (r.variant && kanji.includes(r.variant)) ||
      r.examples.includes(kanji)
  );

  const primaryRadical =
    matchingRadicals.length > 0
      ? `${matchingRadicals[0].character} (${matchingRadicals[0].hanViet})`
      : 'Cơ bản';

  const components: RadicalComponent[] =
    matchingRadicals.length > 0
      ? matchingRadicals.map((r, idx) => ({
          radical: r.character,
          hanViet: r.hanViet,
          meaning: r.meaning,
          strokeCount: r.strokeCount,
          positionType: r.positionType || (idx === 0 ? 'hen' : 'tsukuri'),
          positionName: r.positionName || (idx === 0 ? 'Bên trái' : 'Thành phần'),
        }))
      : [
          {
            radical: kanji,
            hanViet: hanVietName || 'HÁN',
            meaning: 'Ký tự độc lập',
            strokeCount: kanji.length,
            positionType: 'center' as RadicalPositionType,
            positionName: 'Gốc',
          },
        ];

  return {
    kanji,
    hanViet: hanVietName || 'HÁN',
    primaryRadical,
    components,
    mnemonicStory: `Mẹo nhớ cho chữ ${kanji} (${hanVietName || ''}): Tưởng tượng liên tưởng hình ảnh các nét bộ thủ để ghi nhớ lâu hơn.`,
  };
}
