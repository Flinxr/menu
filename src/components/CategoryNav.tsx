import React from 'react';
import { CategoryId, CategoryInfo } from '../types';
import { MenuIcon } from './MenuIcon';
import { toPersianDigits } from '../utils/formatters';

interface CategoryNavProps {
  categories: CategoryInfo[];
  activeCategory: CategoryId | 'all';
  onSelectCategory: (id: CategoryId | 'all') => void;
  categoryCounts: Record<string, number>;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategory,
  onSelectCategory,
  categoryCounts,
}) => {
  return (
    <nav className="w-full px-4 pt-1 pb-2 border-t border-[#1a1a22]">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {/* All Button */}
          <button
            id="cat-btn-all"
            onClick={() => onSelectCategory('all')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
              activeCategory === 'all'
                ? 'bg-[#f5f0e6] text-[#0d0d0f] border-[#f5f0e6] shadow-md font-semibold'
                : 'bg-[#141418] text-[#b8b2a3] border-[#22222a] hover:border-[#383842] hover:text-[#faf7ee]'
            }`}
          >
            <span>همه آیتم‌ها</span>
          </button>

          {/* Dynamic Categories */}
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;
            const iconType =
              cat.id === 'breakfast'
                ? 'category-breakfast'
                : cat.id === 'iranian'
                ? 'category-iranian'
                : cat.id === 'fastfood'
                ? 'category-fastfood'
                : 'drink';

            return (
              <button
                key={cat.id}
                id={`cat-btn-${cat.id}`}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? 'bg-[#f5f0e6] text-[#0d0d0f] border-[#f5f0e6] shadow-md font-semibold'
                    : 'bg-[#141418] text-[#b8b2a3] border-[#22222a] hover:border-[#383842] hover:text-[#faf7ee]'
                }`}
              >
                <MenuIcon
                  type={iconType}
                  className={`w-3.5 h-3.5 ${isActive ? 'text-[#0d0d0f]' : 'text-[#d6c9af]'}`}
                  size={14}
                />
                <span>{cat.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-[#0d0d0f]/15 text-[#0d0d0f]'
                      : 'bg-[#202028] text-[#8e897e]'
                  }`}
                >
                  {toPersianDigits(count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};


