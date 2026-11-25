import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_ORIGIN = 'https://luyenkanji.vercel.app';
const PUBLIC_ROBOTS =
  'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const PRIVATE_ROBOTS = 'noindex, nofollow';

interface RouteSeoMeta {
  title: string;
  description: string;
  robots?: string;
}

const DEFAULT_SEO: RouteSeoMeta = {
  title: 'Luyện Kanji Pro – Học & Luyện Viết Kanji JLPT N5–N1',
  description:
    'Học 2.136 Jōyō Kanji từ N5 đến N1, luyện nét viết chuẩn thứ tự, ôn Flashcard SRS, đấu trường Kanji trực tuyến và tra cứu chữ Hán miễn phí ngay.',
};

const ROUTE_SEO_MAP: Record<string, RouteSeoMeta> = {
  '/': DEFAULT_SEO,
  '/input': {
    title: 'Nhập Văn Bản & Quét Ảnh OCR Kanji | Luyện Kanji Pro',
    description:
      'Nhập văn bản tiếng Nhật với bộ gõ IME thông minh hoặc quét ảnh OCR để tách chữ Kanji, xem âm Hán-Việt và bắt đầu luyện viết ngay.',
  },
  '/kanji': {
    title: 'Luyện Nét Viết Kanji & Thứ Tự Nét | Luyện Kanji Pro',
    description:
      'Luyện viết chữ Kanji chuẩn thứ tự nét với hướng dẫn bóng mờ, chế độ viết mù, chấm điểm tự động và xuất ảnh nét vẽ hoặc in phiếu tập viết.',
  },
  '/levels': {
    title: 'Học 2.136 Jōyō Kanji Theo Cấp Độ JLPT | Luyện Kanji Pro',
    description:
      'Khám phá trọn bộ 2.136 Jōyō Kanji theo cấp độ JLPT N5 đến N1 kèm âm Hán-Việt, câu ví dụ Nhật - Việt, Quiz 4 dạng và trò chơi ghép bộ thủ.',
  },
  '/search': {
    title: 'Tra Cứu Kanji Ngược & Nhận Diện Vẽ Tay | Luyện Kanji Pro',
    description:
      'Tra cứu nhanh hơn 3.000 chữ Kanji theo nghĩa tiếng Việt, âm Hán-Việt, On/Kun, bộ thủ hoặc vẽ tay trực tiếp để nhận diện chữ chính xác.',
  },
  '/decks': {
    title: 'Flashcard SRS 4 Chế Độ & Đồng Bộ Anki | Luyện Kanji Pro',
    description:
      'Quản lý thư mục bài học nhiều tầng, ôn tập Flashcard SRS với Lật thẻ, Viết mù, Nghe, Điền câu, theo dõi Heatmap 365 ngày và đồng bộ Anki.',
  },
  '/arena': {
    title: 'Đấu Trường Kanji Trực Tuyến 1v1 & Nhóm | Luyện Kanji Pro',
    description:
      'Tạo bộ đề tùy chỉnh và thi đấu Kanji 1v1 hoặc phòng nhóm trực tuyến qua mã mời 6 ký tự với bảng xếp hạng thời gian thực hấp dẫn.',
  },
  '/shares': {
    title: 'Thư Viện Bộ Thẻ Kanji Cộng Đồng | Luyện Kanji Pro',
    description:
      'Khám phá, lưu về học và chia sẻ bộ thẻ Kanji theo cấp độ JLPT từ cộng đồng người học tiếng Nhật kèm tính năng theo dõi tác giả.',
  },
  '/leaderboard': {
    title: 'Bảng Xếp Hạng Streak Học Kanji | Luyện Kanji Pro',
    description:
      'Theo dõi chuỗi ngày học Kanji liên tục và bảng xếp hạng cộng đồng để duy trì động lực ôn luyện tiếng Nhật mỗi ngày.',
  },
  '/radicals': {
    title: '214 Bộ Thủ Khang Hy & Cấu Tạo Kanji | Luyện Kanji Pro',
    description:
      'Tra cứu 214 bộ thủ Khang Hy chuẩn kèm ý nghĩa, phiên âm và sơ đồ bóc tách cấu trúc giúp ghi nhớ chữ Kanji nhanh và logic hơn.',
  },
  '/compare': {
    title: 'So Sánh Các Chữ Kanji Dễ Nhầm Lẫn | Luyện Kanji Pro',
    description:
      'Đối chiếu trực quan các chữ Kanji có mặt chữ gần giống nhau về nét vẽ, bộ thủ, âm Hán-Việt và nghĩa để tránh nhầm lẫn khi làm bài.',
  },
  '/romaji': {
    title: 'Đọc Văn Bản Tiếng Nhật Song Song Romaji | Luyện Kanji Pro',
    description:
      'Chuyển đổi và hiển thị văn bản tiếng Nhật song song với phiên âm Romaji chuẩn Hepburn giúp luyện đọc câu và nắm cách phát âm nhanh.',
  },
  '/translate': {
    title: 'Dịch Thuật Song Ngữ Nhật Việt | Luyện Kanji Pro',
    description:
      'Dịch đoạn văn và câu tiếng Nhật sang tiếng Việt mượt mà theo ngữ cảnh thực tế, hỗ trợ bóc tách trực tiếp từ vựng và Kanji trong câu.',
  },
  '/converter': {
    title: 'Chuyển Đổi Romaji, Hiragana & Katakana | Luyện Kanji Pro',
    description:
      'Công cụ chuyển đổi qua lại giữa Romaji, Hiragana và Katakana tức thì, hỗ trợ hoàn tác nhiều bước và sao chép nhanh để học bảng chữ cái.',
  },
  '/print': {
    title: 'In Phiếu Tập Viết Kanji Khổ A4 | Luyện Kanji Pro',
    description:
      'Tạo và in phiếu luyện viết Kanji khổ A4 tùy chỉnh số cột, ô lưới mờ và thông tin Hán-Việt để luyện viết tay trên giấy hiệu quả.',
  },
  '/extension': {
    title: 'Tiện Ích Chrome Luyện Kanji Nhanh | Luyện Kanji Pro',
    description:
      'Cài đặt tiện ích mở rộng Chrome Luyện Kanji để quét, tra cứu nhanh thứ tự nét và nghĩa chữ Hán ngay trên mọi trang web tiếng Nhật.',
  },
  '/history': {
    title: 'Lịch Sử Tra Cứu Kanji Cá Nhân | Luyện Kanji Pro',
    description:
      'Xem lại toàn bộ danh sách chữ Kanji đã tra cứu gần đây để ôn tập nhanh, ghim chữ quan trọng và kiểm tra lại thứ tự nét viết.',
  },
  '/guide': {
    title: 'Hướng Dẫn Học & Luyện Viết Kanji | Luyện Kanji Pro',
    description:
      'Cẩm nang hướng dẫn chi tiết cách sử dụng lộ trình JLPT, Flashcard SRS, Đấu trường Kanji, quét OCR và mẹo luyện nét viết hiệu quả.',
  },
  '/profile': {
    title: 'Hồ Sơ Học Tập & Đồng Bộ Tài Khoản | Luyện Kanji Pro',
    description:
      'Quản lý hồ sơ cá nhân, liên kết đăng nhập Google, theo dõi chuỗi Streak học tập và đồng bộ bộ thẻ Flashcard trên đám mây.',
    robots: PRIVATE_ROBOTS,
  },
};

function resolveSeoForPath(pathname: string): RouteSeoMeta {
  if (ROUTE_SEO_MAP[pathname]) {
    return ROUTE_SEO_MAP[pathname];
  }
  if (pathname.startsWith('/decks/')) {
    return {
      title: 'Chi Tiết Bộ Thẻ Flashcard SRS | Luyện Kanji Pro',
      description:
        'Xem danh sách Kanji, từ ghép và bắt đầu phiên ôn tập Flashcard SRS với 4 chế độ luyện trí nhớ ngay trong thư mục bài học.',
    };
  }
  if (pathname.startsWith('/share/')) {
    return {
      title: 'Bộ Thẻ Kanji Chia Sẻ Công Khai | Luyện Kanji Pro',
      description:
        'Xem trước nội dung bộ thẻ Kanji được chia sẻ từ cộng đồng và nhân bản về kho học tập cá nhân chỉ với một lần bấm.',
    };
  }
  if (pathname.startsWith('/u/')) {
    return {
      title: 'Hồ Sơ Người Học Cộng Đồng | Luyện Kanji Pro',
      description:
        'Xem thông tin hồ sơ, chuỗi Streak học tập và các bộ thẻ Kanji công khai được chia sẻ bởi thành viên trong cộng đồng.',
    };
  }
  return DEFAULT_SEO;
}

function setMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attrName}="${attrValue}"]`
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonicalLink(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

export function RouteMetaManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const seo = resolveSeoForPath(pathname);
    const normalizedPath = pathname === '/' ? '' : pathname;
    const canonicalUrl = `${SITE_ORIGIN}${normalizedPath}`;

    document.title = seo.title;
    setMetaTag('name', 'description', seo.description);
    setMetaTag('name', 'robots', seo.robots || PUBLIC_ROBOTS);
    setCanonicalLink(canonicalUrl);

    setMetaTag('property', 'og:title', seo.title);
    setMetaTag('property', 'og:description', seo.description);
    setMetaTag('property', 'og:url', canonicalUrl);

    setMetaTag('name', 'twitter:title', seo.title);
    setMetaTag('name', 'twitter:description', seo.description);
    setMetaTag('name', 'twitter:url', canonicalUrl);
  }, [pathname]);

  return null;
}
