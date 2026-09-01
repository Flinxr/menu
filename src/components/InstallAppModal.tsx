import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Compass,
  PlusSquare,
  MoreVertical,
  Download,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName?: string;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  restaurantName = 'کافه رستوران نیک',
}) => {
  const [platform, setPlatform] = useState<'ios' | 'android'>('ios');

  if (!isOpen) return null;

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
                <p className="text-[11px] text-[#9e988c]">افزودن به صفحه اصلی گوشی (Add to Home Screen)</p>
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

            {/* Platform Instructions */}
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
                        <strong className="text-[#e8dfc8]">«Add to Home Screen»</strong> (افزودن به صفحه اصلی) را لمس کنید.
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
                        در گوشه بالا سمت راست دکمه <span className="text-[#64b5f6] font-bold">«Add»</span> را لمس کنید تا منوی کافه رستوران نیک مانند یک اپلیکیشن سریع روی صفحه گوشی ذخیره شود.
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
                        در گوشه بالای مرورگر کروم روی آیکون منوی سه نقطه ضربه بزنید.
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
                        گزینه <strong className="text-[#e8dfc8]">«Add to Home screen»</strong> یا <strong className="text-[#e8dfc8]">«Install app (نصب برنامه)»</strong> را انتخاب کنید.
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
                        دکمه <span className="text-[#81c784] font-bold">«Install»</span> یا <span className="text-[#81c784] font-bold">«Add»</span> را لمس کنید تا آیکون مستقیماً در صفحه اپلیکیشن‌های شما قرار گیرد.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[#22222a] bg-[#15151b] flex items-center justify-end">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-5 rounded-xl bg-[#e8dfc8] hover:bg-[#d8cfb8] text-xs font-bold text-[#131317] transition-colors shadow-sm text-center"
            >
              متوجه شدم
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
