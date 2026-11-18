import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { SharedDecksManager } from '../components/SharedDecksManager';
import { useAuth } from '../context/AuthContext';

export const SharedDecksPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2">
          <Link
            to="/decks"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors min-h-[38px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Thư mục bài học</span>
          </Link>

          {user && (
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors min-h-[38px]"
            >
              <User className="w-3.5 h-3.5" />
              <span>Trang cá nhân</span>
            </Link>
          )}
        </div>
      </div>

      <SharedDecksManager />
    </div>
  );
};
