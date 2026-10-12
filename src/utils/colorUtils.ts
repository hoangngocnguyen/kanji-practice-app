/**
 * Phối màu sắc cấp độ JLPT hài hòa, tinh tế (dải màu Tailwind nhã nhặn: emerald, teal, sky, blue, indigo)
 */
export function getJlptBadgeClass(jlpt?: string): string {
  switch (jlpt?.toUpperCase()) {
    case 'N5':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold';
    case 'N4':
      return 'bg-teal-50 text-teal-700 border-teal-200 font-semibold';
    case 'N3':
      return 'bg-sky-50 text-sky-700 border-sky-200 font-semibold';
    case 'N2':
      return 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
    case 'N1':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
  }
}

/**
 * Phối màu nhẹ nhàng, đồng nhất cho các nút văn bản mẫu có sẵn
 */
export function getPresetBadgeClass(idx: number): {
  btn: string;
  dot: string;
} {
  switch (idx) {
    case 0:
      return {
        btn: 'bg-slate-50 hover:bg-emerald-50/80 text-slate-700 hover:text-emerald-800 border-slate-200 hover:border-emerald-300',
        dot: 'bg-emerald-500',
      };
    case 1:
      return {
        btn: 'bg-slate-50 hover:bg-teal-50/80 text-slate-700 hover:text-teal-800 border-slate-200 hover:border-teal-300',
        dot: 'bg-teal-500',
      };
    case 2:
      return {
        btn: 'bg-slate-50 hover:bg-blue-50/80 text-slate-700 hover:text-blue-800 border-slate-200 hover:border-blue-300',
        dot: 'bg-blue-500',
      };
    case 3:
      return {
        btn: 'bg-slate-50 hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-800 border-slate-200 hover:border-indigo-300',
        dot: 'bg-indigo-500',
      };
    default:
      return {
        btn: 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
      };
  }
}
