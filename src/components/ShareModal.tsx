import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Smartphone,
  Compass,
  ArrowUpRight,
  PlusSquare,
  MoreVertical,
  Download,
  QrCode,
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
  const [activeTab, setActiveTab] = useState<'install' | 'share'>('install');
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');
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
          text: `منوی دیجیتال ${restaurantName} - مشاهده آنلاین غذاها و سفارش سریع`,
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
                <p className="text-[11px] text-[#9e988c]">افزودن به صفحه اصلی و اشتراک‌گذاری</p>
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

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#22222a] bg-[#111115] p-1.5 gap-1.5">
            <button
              onClick={() => setActiveTab('install')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'install'
                  ? 'bg-[#23232c] text-[#e8dfc8] shadow-sm border border-[#343444]'
                  : 'text-[#827d72] hover:text-[#faf7ee]'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              نصب روی صفحه اصلی (Add to Home)
            </button>
            <button
              onClick={() => setActiveTab('share')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'share'
                  ? 'bg-[#23232c] text-[#e8dfc8] shadow-sm border border-[#343444]'
                  : 'text-[#827d72] hover:text-[#faf7ee]'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              اشتراک و کیو‌آرکد
            </button>
          </div>

          {/* Content Body */}
          <div className="p-4 overflow-y-auto space-y-4">
            {activeTab === 'install' ? (
              <div className="space-y-3.5">
                {/* Platform Selector Switch */}
                <div className="grid grid-cols-2 gap-2 bg-[#191920] p-1 rounded-xl border border-[#262632]">
                  <button
                    onClick={() => setPlatform('ios')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                      platform === 'ios'
                        ? 'bg-[#2b2b38] text-[#faf7ee] font-bold shadow-sm'
                        : 'text-[#868074] hover:text-[#faf7ee]'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5 text-[#64b5f6]" />
                    آیفون و آیپد (Safari)
                  </button>
                  <button
                    onClick={() => setPlatform('android')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                      platform === 'android'
                        ? 'bg-[#2b2b38] text-[#faf7ee] font-bold shadow-sm'
                        : 'text-[#868074] hover:text-[#faf7ee]'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-[#81c784]" />
                    اندروید (Chrome و سایر)
                  </button>
                </div>

                {/* Platform-Specific Step-by-Step Instructions */}
                {platform === 'ios' ? (
                  <div className="space-y-2.5 bg-[#17171e] p-3.5 rounded-xl border border-[#292936]">
                    <div className="text-xs font-bold text-[#e8dfc8] flex items-center gap-1.5 pb-1 border-b border-[#262632]">
                      <Compass className="w-4 h-4 text-[#64b5f6]" />
                      راهنمای افزودن به صفحه اصلی در آیفون (iOS):
                    </div>

                    <div className="space-y-3 pt-1 text-xs">
                      {/* Step 1 */}
                      <div className="flex items-start gap-3 bg-[#111116] p-2.5 rounded-lg border border-[#23232c]">
                        <div className="w-6 h-6 rounded-full bg-[#202532] text-[#64b5f6] border border-[#2c374d] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                          ۱
                        </div>
                        <div>
                          <p className="text-[#faf7ee] font-semibold">
                            لمس دکمه اشتراک‌گذاری (Share)
                          </p>
                          <p className="text-[11px] text-[#9c9689] mt-0.5 leading-relaxed">
                            در نوار پایین مرورگر سافاری روی آیکون{' '}
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#2a2a38] text-[#e8dfc8] font-mono text-[10px]">
                              Share ⎋
                            </span>{' '}
                            کلیک کنید.
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start gap-3 bg-[#111116] p-2.5 rounded-lg border border-[#23232c]">
                        <div className="w-6 h-6 rounded-full bg-[#202532] text-[#64b5f6] border border-[#2c374d] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                          ۲
                        </div>
                        <div>
                          <p className="text-[#faf7ee] font-semibold flex items-center gap-1.5">
                            انتخاب گزینه Add to Home Screen
                            <PlusSquare className="w-3.5 h-3.5 text-[#e8dfc8]" />
                          </p>
                          <p className="text-[11px] text-[#9c9689] mt-0.5 leading-relaxed">
                            منوی باز شده را کمی به بالا اسکرول کرده و گزینه{' '}
                            <strong className="text-[#e8dfc8]">«Add to Home Screen»</strong> (افزودن
                            به صفحه اصلی) را انتخاب کنید.
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start gap-3 bg-[#111116] p-2.5 rounded-lg border border-[#23232c]">
                        <div className="w-6 h-6 rounded-full bg-[#202532] text-[#64b5f6] border border-[#2c374d] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                          ۳
                        </div>
                        <div>
                          <p className="text-[#faf7ee] font-semibold">تایید و اضافه شدن آیکون</p>
                          <p className="text-[11px] text-[#9c9689] mt-0.5 leading-relaxed">
                            در گوشه بالا سمت راست دکمه{' '}
                            <span className="text-[#64b5f6] font-bold">«Add»</span> را لمس کنید تا
                            منوی کافه رستوران نیک مانند یک اپلیکیشن سریع روی صفحه گوشی ذخیره شود.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 bg-[#17171e] p-3.5 rounded-xl border border-[#292936]">
                    <div className="text-xs font-bold text-[#e8dfc8] flex items-center gap-1.5 pb-1 border-b border-[#262632]">
                      <Smartphone className="w-4 h-4 text-[#81c784]" />
                      راهنمای افزودن به صفحه اصلی در اندروید (Chrome):
                    </div>

                    <div className="space-y-3 pt-1 text-xs">
                      {/* Step 1 */}
                      <div className="flex items-start gap-3 bg-[#111116] p-2.5 rounded-lg border border-[#23232c]">
                        <div className="w-6 h-6 rounded-full bg-[#1e2a22] text-[#81c784] border border-[#2d4634] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                          ۱
                        </div>
                        <div>
                          <p className="text-[#faf7ee] font-semibold flex items-center gap-1.5">
                            لمس منوی سه نقطه (⋮)
                            <MoreVertical className="w-3.5 h-3.5 text-[#81c784]" />
                          </p>
                          <p className="text-[11px] text-[#9c9689] mt-0.5 leading-relaxed">
                            در گوشه بالا (یا پایین) مرورگر کروم روی آیکون منوی سه نقطه ضربه بزنید.
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start gap-3 bg-[#111116] p-2.5 rounded-lg border border-[#23232c]">
                        <div className="w-6 h-6 rounded-full bg-[#1e2a22] text-[#81c784] border border-[#2d4634] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                          ۲
                        </div>
                        <div>
                          <p className="text-[#faf7ee] font-semibold">
                            انتخاب Add to Home screen یا نصب برنامه
                          </p>
                          <p className="text-[11px] text-[#9c9689] mt-0.5 leading-relaxed">
                            گزینه{' '}
                            <strong className="text-[#e8dfc8]">«Add to Home screen»</strong> یا{' '}
                            <strong className="text-[#e8dfc8]">«Install app (نصب برنامه)»</strong> را
                            انتخاب کنید.
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start gap-3 bg-[#111116] p-2.5 rounded-lg border border-[#23232c]">
                        <div className="w-6 h-6 rounded-full bg-[#1e2a22] text-[#81c784] border border-[#2d4634] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                          ۳
                        </div>
                        <div>
                          <p className="text-[#faf7ee] font-semibold">تایید نهایی</p>
                          <p className="text-[11px] text-[#9c9689] mt-0.5 leading-relaxed">
                            دکمه <span className="text-[#81c784] font-bold">«Install»</span> یا{' '}
                            <span className="text-[#81c784] font-bold">«Add»</span> را لمس کنید تا
                            آیکون مستقیماً در صفحه اپلیکیشن‌های شما قرار گیرد.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* QR Code Presentation */}
                <div className="bg-[#17171e] p-4 rounded-xl border border-[#292936] text-center space-y-2.5">
                  <div className="text-xs font-bold text-[#e8dfc8] flex items-center justify-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#e8dfc8]" />
                    اسکن کیو‌آرکد برای باز کردن منو با دوربین موبایل
                  </div>
                  <div className="flex justify-center p-2 bg-white rounded-xl w-fit mx-auto shadow-md">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                        currentUrl
                      )}`}
                      alt="QR Code منوی کافه رستوران نیک"
                      className="w-36 h-36"
                      loading="lazy"
                    />
                  </div>
                  <p className="text-[10px] text-[#9c9689]">
                    مشتریان گرامی می‌توانند با دوربین گوشی این کیو‌آرکد را اسکن نمایند.
                  </p>
                </div>

                {/* Copy Link Input */}
                <div className="space-y-1.5">
                  <label className="text-xs text-[#9c9689]">لینک مستقیم صفحه منو:</label>
                  <div className="flex items-center gap-1.5 bg-[#17171e] p-1.5 rounded-xl border border-[#282834]">
                    <input
                      type="text"
                      readOnly
                      value={currentUrl}
                      className="bg-transparent text-xs text-[#faf7ee] px-2 flex-1 focus:outline-none font-mono text-left"
                      dir="ltr"
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                        copied
                          ? 'bg-[#1c3822] text-[#7ce075] border border-[#2d5635]'
                          : 'bg-[#292936] text-[#e8dfc8] hover:bg-[#343444]'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          کپی شد
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          کپی لینک
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Direct Share Button */}
                <button
                  onClick={handleNativeShare}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#262633] hover:bg-[#323242] border border-[#3b3b4d] text-xs font-bold text-[#faf7ee] flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Share2 className="w-4 h-4 text-[#e8dfc8]" />
                  اشتراک‌گذاری در شبکه‌های اجتماعی و پیام‌رسان‌ها
                </button>
              </div>
            )}
          </div>

          {/* Footer Quick Action */}
          <div className="p-3 border-t border-[#22222a] bg-[#15151b] flex items-center justify-between gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-2 px-3 rounded-xl bg-[#1e1e27] hover:bg-[#282834] text-xs text-[#faf7ee] font-medium flex items-center justify-center gap-1.5 border border-[#2d2d3c] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#7ce075]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'لینک کپی شد' : 'کپی لینک منو'}
            </button>
            <button
              onClick={onClose}
              className="py-2 px-5 rounded-xl bg-[#e8dfc8] hover:bg-[#d8cfb8] text-xs font-bold text-[#131317] transition-colors shadow-sm"
            >
              متوجه شدم
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
