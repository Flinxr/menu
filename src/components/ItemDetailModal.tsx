import React from 'react';
import { MenuItem, CategoryInfo } from '../types';
import { MenuIcon } from './MenuIcon';
import { formatPrice } from '../utils/formatters';
import { X, Clock, CheckCircle2, Scale, Sparkles, Flame, DollarSign, Dumbbell } from 'lucide-react';

interface ItemDetailModalProps {
  item: MenuItem | null;
  categories?: CategoryInfo[];
  onClose: () => void;
  onOpenEditItem?: (item: MenuItem) => void;
  isAdminLoggedIn?: boolean;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  item,
  categories = [],
  onClose,
  onOpenEditItem,
  isAdminLoggedIn = false,
}) => {
  if (!item) return null;

  const currentCategory = categories.find((c) => c.id === item.categoryId);
  const categoryTitle = currentCategory ? currentCategory.title : 
    item.categoryId === 'breakfast' ? 'صبحانه' :
    item.categoryId === 'iranian' ? 'غذای ایرانی' :
    item.categoryId === 'fastfood' ? 'فست‌ فود' : item.categoryId;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#111115] border border-[#242430] rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 text-[#faf7ee] shadow-2xl max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f1f28]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#181820] border border-[#2a2a38] flex items-center justify-center text-[#e8dfc8] flex-shrink-0">
              <MenuIcon type={item.iconType} size={20} />
            </div>
            <div>
              <span className="text-[10px] text-[#9c9688] block">
                دسته‌بندی: {categoryTitle}
              </span>
              <h2 className="text-base font-bold text-[#faf7ee]">{item.name}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#16161c] border border-[#262632] text-[#8e897e] hover:text-[#faf7ee] transition-colors"
            title="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badges Bar */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2.5">
            {item.tags.includes('popular') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#311c16] text-[#ff9879] border border-[#52291d]">
                <Flame className="w-2.5 h-2.5" />
                آیتم پرطرفدار
              </span>
            )}
            {item.tags.includes('economy') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#14261d] text-[#7ee3a4] border border-[#1f4730]">
                <DollarSign className="w-2.5 h-2.5" />
                انتخاب اقتصادی
              </span>
            )}
            {item.tags.includes('special') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#2a2416] text-[#f5d77f] border border-[#4d401e]">
                <Sparkles className="w-2.5 h-2.5" />
                پیشنهاد ویژه
              </span>
            )}
            {item.tags.includes('protein') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#162233] text-[#8cbef5] border border-[#213759]">
                <Dumbbell className="w-2.5 h-2.5" />
                پروتئین بالا
              </span>
            )}
          </div>
        )}

        {/* Content Details */}
        <div className="py-3.5 space-y-3 text-xs">
          {/* Price & Prep time pill */}
          <div className="flex items-center justify-between bg-[#15151c] border border-[#242430] p-3 rounded-xl">
            <div>
              <span className="text-[10px] text-[#8e897e] block">قیمت در منو</span>
              <span className="text-lg font-bold text-[#faf7ee]">
                {formatPrice(item.price)}
              </span>
            </div>
            {item.preparationTime && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1d1d26] text-[11px] text-[#c4bcae] border border-[#2a2a38]">
                <Clock className="w-3 h-3 text-[#d8c59a]" />
                <span>آماده‌سازی: {item.preparationTime}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <div>
              <h4 className="text-[11px] font-semibold text-[#c8c1b2] mb-1">توضیحات و مشخصات</h4>
              <p className="text-xs text-[#a6a092] leading-relaxed bg-[#14141a] p-2.5 rounded-xl border border-[#1f1f26]">
                {item.description}
              </p>
            </div>
          )}

          {/* Portions & Weight details */}
          {item.portionDetails && (
            <div>
              <h4 className="text-[11px] font-semibold text-[#c8c1b2] mb-1 flex items-center gap-1">
                <Scale className="w-3 h-3 text-[#d8c59a]" />
                <span>ترکیب و وزن پرس</span>
              </h4>
              <div className="text-xs text-[#dcd6c8] bg-[#14141a] p-2.5 rounded-xl border border-[#1f1f26] font-medium leading-relaxed">
                {item.portionDetails}
              </div>
            </div>
          )}

          {/* Ingredients list */}
          {item.ingredients && item.ingredients.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold text-[#c8c1b2] mb-1.5">محتویات و مواد تشکیل‌دهنده</h4>
              <div className="grid grid-cols-2 gap-1.5">
                {item.ingredients.map((ing, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 text-xs text-[#c8c2b5] bg-[#14141a] px-2.5 py-1.5 rounded-lg border border-[#1f1f26]"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#7ce075] flex-shrink-0" />
                    <span className="truncate">{ing}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action (If Admin) */}
        {isAdminLoggedIn && onOpenEditItem && (
          <div className="pt-3 border-t border-[#1f1f28] flex items-center">
            <button
              onClick={() => {
                onClose();
                onOpenEditItem(item);
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-[#20202c] hover:bg-[#2a2a3a] text-[#e8dfc8] font-medium text-xs transition-colors border border-[#343446]"
            >
              ویرایش این غذا
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


