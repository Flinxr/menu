import React from 'react';
import { MenuItem } from '../types';
import { MenuIcon } from './MenuIcon';
import { formatPrice, toPersianDigits } from '../utils/formatters';
import { Sparkles, Flame, DollarSign, Dumbbell, ChevronLeft } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
  onClickDetail: (item: MenuItem) => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({
  item,
  onClickDetail,
}) => {
  return (
    <div
      id={`menu-item-${item.id}`}
      onClick={() => onClickDetail(item)}
      className="group relative bg-[#121216] border border-[#202028] hover:border-[#353544] rounded-2xl p-3 transition-all duration-200 shadow-sm flex flex-col justify-between cursor-pointer hover:bg-[#15151a]"
    >
      <div>
        {/* Top bar: Icon & Badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {/* Minimal Icon Badge */}
            <div className="w-8 h-8 rounded-xl bg-[#181820] border border-[#282834] flex items-center justify-center text-[#e5dcc7] group-hover:scale-105 transition-transform flex-shrink-0">
              <MenuIcon type={item.iconType} size={16} />
            </div>

            {/* Tags / Badges */}
            <div className="flex flex-wrap gap-1">
              {item.tags?.includes('popular') && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#311c16] text-[#ff9879] border border-[#52291d]">
                  <Flame className="w-2.5 h-2.5" />
                  پرطرفدار
                </span>
              )}
              {item.tags?.includes('economy') && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#14261d] text-[#7ee3a4] border border-[#1f4730]">
                  <DollarSign className="w-2.5 h-2.5" />
                  اقتصادی
                </span>
              )}
              {item.tags?.includes('special') && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#2a2416] text-[#f5d77f] border border-[#4d401e]">
                  <Sparkles className="w-2.5 h-2.5" />
                  ویژه
                </span>
              )}
              {item.tags?.includes('protein') && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#162233] text-[#8cbef5] border border-[#213759]">
                  <Dumbbell className="w-2.5 h-2.5" />
                  پروتئین
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Title and content */}
        <div>
          <h3 className="text-sm font-bold text-[#faf7ee] leading-snug group-hover:text-[#fffef9] transition-colors">
            {item.name}
          </h3>

          {/* Portion snippet or description */}
          <p className="text-xs text-[#9c9688] line-clamp-2 mt-1 leading-relaxed">
            {item.portionDetails || item.description}
          </p>

          {/* Ingredients Pill Highlights */}
          {item.ingredients && item.ingredients.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.ingredients.slice(0, 3).map((ing, i) => (
                <span
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-[#181820] text-[#aba495] border border-[#242430]"
                >
                  {ing}
                </span>
              ))}
              {item.ingredients.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#181820] text-[#8e897e]">
                  +{toPersianDigits(item.ingredients.length - 3)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar: Price and Details button */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-[#1c1c24]">
        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-bold text-[#f5f0e6]">
            {formatPrice(item.price)}
          </span>
        </div>

        {/* View Details action */}
        <div className="flex items-center gap-1 text-[11px] text-[#d8c59a] group-hover:text-[#faf7ee] font-medium transition-colors">
          <span>مشاهده مشخصات</span>
          <ChevronLeft className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
        </div>
      </div>
    </div>
  );
};


