import React, { useState, useRef, useEffect } from 'react';
import { Utensils, Search, Share2, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onShareMenu: () => void;
  onOpenAdminLogin: () => void;
  isAdminLoggedIn?: boolean;
  onOpenAdminPanel?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onShareMenu,
  onOpenAdminLogin,
  isAdminLoggedIn = false,
  onOpenAdminPanel,
}) => {
  const [pressProgress, setPressProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const HOLD_DURATION = 1200; // 1.2 seconds hold time

  const startHold = () => {
    setIsPressing(true);
    startTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      setPressProgress(progress);

      if (progress < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        cancelHold();
        if (isAdminLoggedIn && onOpenAdminPanel) {
          onOpenAdminPanel();
        } else {
          onOpenAdminLogin();
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const cancelHold = () => {
    setIsPressing(false);
    setPressProgress(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <header className="w-full pt-3 pb-2 px-4 select-none">
      <div className="max-w-md mx-auto space-y-2">
        {/* Top Minimal Info Bar */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Title with Hold-to-Login */}
          <div
            id="restaurant-logo-header"
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
            onClick={() => {
              if (isAdminLoggedIn && onOpenAdminPanel) {
                onOpenAdminPanel();
              }
            }}
            className="flex items-center gap-2 cursor-pointer relative group py-0.5 rounded-xl hover:bg-[#16161d] transition-colors"
            title="نگه‌داشتن روی آیکون: ورود به پنل مدیریت"
          >
            {/* Logo box */}
            <div className="relative w-10 h-10 rounded-xl bg-[#16161c] border border-[#d8c59a]/40 flex items-center justify-center text-[#e8dfc8] shadow-md overflow-hidden flex-shrink-0">
              <img
                src="/logo.jpg"
                alt="لوگو کافه رستوران نیک"
                className={`w-full h-full object-cover transition-transform ${
                  isPressing ? 'scale-110' : ''
                }`}
                referrerPolicy="no-referrer"
              />

              {isPressing && (
                <div
                  className="absolute inset-0 bg-[#d8c59a]/40 pointer-events-none"
                  style={{ height: `${pressProgress}%`, bottom: 0, top: 'auto', width: '100%' }}
                />
              )}

              {isAdminLoggedIn && (
                <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-[#7ce075] rounded-full border border-[#16161c] flex items-center justify-center z-10">
                  <ShieldCheck className="w-2.5 h-2.5 text-[#0f1f14]" />
                </div>
              )}

              {isPressing && (
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-0.5">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    stroke="#e8dfc8"
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray={95}
                    strokeDashoffset={95 - (95 * pressProgress) / 100}
                    className="transition-all"
                  />
                </svg>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#faf7ee] tracking-tight">
                  کافه رستوران نیک
                </h1>
                {isAdminLoggedIn && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-md text-[10px] font-medium bg-[#1c2e22] text-[#7ce075] border border-[#2c5436]">
                    مدیریت
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#9e988c] font-normal leading-none mt-0.5">
                {isPressing ? 'در حال باز کردن مدیریت...' : 'منوی دیجیتال آنلاین'}
              </p>
            </div>
          </div>

          {/* Share & Add to Home Screen Button */}
          <button
            id="header-share-btn"
            onClick={onShareMenu}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl bg-[#181820] hover:bg-[#22222c] border border-[#2e2e3c] hover:border-[#424255] text-[#d8cfb8] transition-all shadow-sm group"
            title="نصب اپلیکیشن و اشتراک‌گذاری"
          >
            <Share2 className="w-3.5 h-3.5 text-[#e8dfc8] group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-medium hidden sm:inline">نصب اپ / اشتراک</span>
          </button>
        </div>

        {/* Minimal Search Bar */}
        <div className="relative">
          <input
            id="menu-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="جستجوی غذا، کباب، برگر یا ترکیبات..."
            className="w-full bg-[#131317] border border-[#22222a] focus:border-[#d8c59a]/60 rounded-xl py-2 pr-8 pl-8 text-xs text-[#faf7ee] placeholder-[#6d685e] focus:outline-none transition-all shadow-inner"
          />
          <Search className="w-3.5 h-3.5 text-[#7a756b] absolute right-2.5 top-1/2 -translate-y-1/2" />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#8a8579] hover:text-[#faf7ee] bg-[#1f1f26] px-1.5 py-0.5 rounded-md"
            >
              پاک کردن
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


