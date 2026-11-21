import React from 'react';

export const ProfilePageSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-150" aria-busy="true" aria-label="Đang tải hồ sơ cá nhân">
    <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-8 space-y-5">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full lk-shimmer shrink-0" />
        <div className="flex-1 space-y-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-6 w-44 rounded-lg lk-shimmer" />
            <div className="h-6 w-16 rounded-lg lk-shimmer" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-4 w-28 rounded-md lk-shimmer" />
            <div className="h-4 w-28 rounded-md lk-shimmer" />
            <div className="h-4 w-28 rounded-md lk-shimmer" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-3.5 w-48 rounded-md lk-shimmer" />
            <div className="h-3.5 w-32 rounded-md lk-shimmer" />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center flex-wrap gap-2">
        <div className="h-9 w-32 rounded-xl lk-shimmer" />
        <div className="h-9 w-32 rounded-xl lk-shimmer" />
        <div className="h-9 w-28 rounded-xl lk-shimmer" />
        <div className="h-9 w-24 rounded-xl lk-shimmer sm:ml-auto" />
      </div>
    </section>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {[0, 1].map((idx) => (
        <section
          key={idx}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-5"
        >
          <div className="space-y-2">
            <div className="h-5 w-44 rounded-lg lk-shimmer" />
            <div className="h-3.5 w-full max-w-xs rounded-md lk-shimmer" />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div className="space-y-1.5">
              <div className="h-3 w-16 rounded lk-shimmer" />
              <div className="h-5 w-10 rounded lk-shimmer" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-16 rounded lk-shimmer" />
              <div className="h-5 w-10 rounded lk-shimmer" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-16 rounded lk-shimmer" />
              <div className="h-5 w-10 rounded lk-shimmer" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-32 rounded-xl lk-shimmer" />
            <div className="h-10 w-36 rounded-xl lk-shimmer" />
          </div>
        </section>
      ))}
    </div>
  </div>
);

export const PublicProfilePageSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-150" aria-busy="true" aria-label="Đang tải hồ sơ cộng đồng">
    <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full lk-shimmer shrink-0" />
          <div className="space-y-2.5">
            <div className="h-6 w-48 rounded-lg lk-shimmer" />
            <div className="flex items-center gap-3">
              <div className="h-4 w-24 rounded-md lk-shimmer" />
              <div className="h-4 w-24 rounded-md lk-shimmer" />
              <div className="h-4 w-24 rounded-md lk-shimmer" />
            </div>
            <div className="h-3.5 w-32 rounded-md lk-shimmer" />
          </div>
        </div>
        <div className="h-10 w-32 rounded-xl lk-shimmer shrink-0" />
      </div>

      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <div className="h-8 w-32 rounded-lg lk-shimmer" />
        <div className="h-8 w-32 rounded-lg lk-shimmer" />
        <div className="h-8 w-32 rounded-lg lk-shimmer" />
      </div>
    </section>

    <section className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
      {[0, 1, 2, 3].map((idx) => (
        <div key={idx} className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-52 rounded-md lk-shimmer" />
            <div className="flex items-center gap-3">
              <div className="h-3.5 w-20 rounded lk-shimmer" />
              <div className="h-3.5 w-12 rounded lk-shimmer" />
              <div className="h-3.5 w-24 rounded lk-shimmer" />
            </div>
          </div>
          <div className="h-9 w-24 rounded-xl lk-shimmer shrink-0" />
        </div>
      ))}
    </section>
  </div>
);

export const SharedDecksManagerSkeleton: React.FC = () => (
  <div className="space-y-5 animate-in fade-in duration-150" aria-busy="true" aria-label="Đang tải bộ thẻ chia sẻ">
    <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3.5 w-24 rounded lk-shimmer" />
          <div className="h-6 w-12 rounded-md lk-shimmer" />
        </div>
      ))}
    </div>
    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
      {[0, 1, 2].map((i) => (
        <div key={i} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-48 rounded-md lk-shimmer" />
            <div className="flex items-center gap-3">
              <div className="h-3 w-20 rounded lk-shimmer" />
              <div className="h-3 w-16 rounded lk-shimmer" />
              <div className="h-3 w-24 rounded lk-shimmer" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 rounded-xl lk-shimmer" />
            <div className="h-9 w-24 rounded-xl lk-shimmer" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const PublicShareViewSkeleton: React.FC = () => (
  <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-150" aria-busy="true" aria-label="Đang tải bộ thẻ chia sẻ">
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2.5 flex-1">
          <div className="h-4 w-28 rounded-md lk-shimmer" />
          <div className="h-7 w-64 rounded-lg lk-shimmer" />
          <div className="flex items-center gap-3">
            <div className="h-4 w-28 rounded lk-shimmer" />
            <div className="h-4 w-20 rounded lk-shimmer" />
            <div className="h-4 w-24 rounded lk-shimmer" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-10 w-32 rounded-xl lk-shimmer" />
          <div className="h-10 w-36 rounded-xl lk-shimmer" />
        </div>
      </div>
    </div>

    <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
      {[0, 1, 2, 3, 4].map((idx) => (
        <div key={idx} className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl lk-shimmer shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 rounded lk-shimmer" />
            <div className="h-3.5 w-64 rounded lk-shimmer" />
          </div>
          <div className="h-8 w-20 rounded-lg lk-shimmer shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

export const KanjiListRowsSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100 animate-in fade-in duration-150" aria-busy="true" aria-label="Đang tải danh sách chữ Kanji">
    {[0, 1, 2, 3, 4, 5].map((idx) => (
      <div key={idx} className="p-4 sm:p-5 flex items-center gap-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl lk-shimmer shrink-0" />
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl lk-shimmer shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-5 w-24 rounded-md lk-shimmer" />
            <div className="h-5 w-14 rounded-md lk-shimmer" />
          </div>
          <div className="h-3.5 w-3/4 max-w-md rounded lk-shimmer" />
          <div className="h-3 w-1/2 max-w-xs rounded lk-shimmer" />
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="h-8 w-20 rounded-xl lk-shimmer" />
        </div>
      </div>
    ))}
  </div>
);

export const KanjiSearchResultsSkeleton: React.FC = () => (
  <div className="space-y-3 animate-in fade-in duration-150" aria-busy="true" aria-label="Đang tải chỉ mục tìm kiếm Kanji">
    {[0, 1, 2, 3, 4].map((idx) => (
      <div
        key={idx}
        className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex items-start gap-4"
      >
        <div className="w-16 h-16 rounded-xl lk-shimmer shrink-0" />
        <div className="flex-1 space-y-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <div className="h-5 w-28 rounded-md lk-shimmer" />
            <div className="h-5 w-12 rounded-md lk-shimmer" />
          </div>
          <div className="h-4 w-5/6 max-w-lg rounded lk-shimmer" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-24 rounded-md lk-shimmer" />
            <div className="h-5 w-28 rounded-md lk-shimmer" />
          </div>
        </div>
      </div>
    ))}
  </div>
);
