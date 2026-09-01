import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  restaurantName = 'کافه رستوران نیک',
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurantName,
          text: `منوی آنلاین ${restaurantName}`,
          url: currentUrl,
        });
      } catch {
        // User cancelled or not supported
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#131317] border border-[#272733] rounded-2xl shadow-2xl overflow-hidden text-[#faf7ee] z-10 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#22222a] flex items-center justify-between bg-[#18181f]">
            <div className="flex items-center gap-3">
              <img
                src="/logo.jpg"
                alt="لوگوی کافه رستوران نیک"
                className="w-10 h-10 rounded-xl object-cover border border-[#383848] shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="text-sm font-bold text-[#faf7ee]">{restaurantName}</h3>
                <p className="text-[11px] text-[#9e988c]">اشتراک‌گذاری منوی آنلاین</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#22222b] text-[#9e988c] hover:text-[#faf7ee] transition-colors"
              title="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto space-y-4">
            {/* Quick Share Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleNativeShare}
                className="w-full py-3 px-4 rounded-xl bg-[#e8dfc8] hover:bg-[#d8cfb8] text-xs font-bold text-[#131317] flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <Share2 className="w-4 h-4" />
                اشتراک‌گذاری سریع منو
              </button>

              {/* Copy URL Box */}
              <div className="bg-[#191922] border border-[#2c2c3a] p-3 rounded-xl space-y-2">
                <label className="text-[11px] text-[#a8a192] block font-medium">لینک اختصاصی منو:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="w-full bg-[#111116] border border-[#2b2b38] rounded-lg px-2.5 py-1.5 text-xs text-[#faf7ee] font-mono select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors flex-shrink-0 ${
                      copied
                        ? 'bg-[#1c3022] text-[#7ce075] border border-[#2e5237]'
                        : 'bg-[#282836] text-[#e8dfc8] hover:bg-[#343446]'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>کپی شد</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>کپی لینک</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* QR Code section */}
              <div className="bg-[#17171e] p-4 rounded-xl border border-[#292936] text-center space-y-2.5">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#e8dfc8]">
                  <QrCode className="w-4 h-4 text-[#e8dfc8]" />
                  <span>اسکن کیو‌آرکد (QR Code) جهت مشاهده روی میز:</span>
                </div>
                <div className="inline-block p-2.5 bg-white rounded-xl shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      currentUrl
                    )}`}
                    alt="QR Code منوی آنلاین کافه رستوران نیک"
                    className="w-36 h-36 object-contain"
                  />
                </div>
                <p className="text-[10px] text-[#868074]">
                  مشتریان می‌توانند با دوربین گوشی این بارکد را اسکن کنند و منو را مستقیماً ببینند.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[#22222a] bg-[#15151b] flex items-center justify-end">
            <button
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl bg-[#22222b] hover:bg-[#2b2b36] text-xs font-bold text-[#e8dfc8] transition-colors"
            >
              بستن
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
