import React from 'react';
import { Sparkles, Flame, DollarSign, Dumbbell } from 'lucide-react';

export type FilterTag = 'all' | 'popular' | 'economy' | 'protein' | 'special';

interface FilterBarProps {
  activeFilter: FilterTag;
  onSelectFilter: (tag: FilterTag) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({ activeFilter, onSelectFilter }) => {
  const filters: { id: FilterTag; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'همه گزینه‌ها', icon: null },
    { id: 'popular', label: 'پرطرفدارترین', icon: <Flame className="w-3 h-3 text-[#ff8059]" /> },
    { id: 'economy', label: 'منوی اقتصادی', icon: <DollarSign className="w-3 h-3 text-[#82e0aa]" /> },
    { id: 'protein', label: 'پرپروتئین', icon: <Dumbbell className="w-3 h-3 text-[#85c1e9]" /> },
    { id: 'special', label: 'پیشنهاد ویژه', icon: <Sparkles className="w-3 h-3 text-[#f9e79f]" /> },
  ];

  return (
    <div className="w-full px-4 py-2 bg-[#09090b]">
      <div className="max-w-md mx-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {filters.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              id={`filter-tag-${f.id}`}
              onClick={() => onSelectFilter(f.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition-colors whitespace-nowrap border ${
                isActive
                  ? 'bg-[#272730] text-[#faf7ee] border-[#4a4a58] font-medium'
                  : 'bg-[#121215] text-[#8e897e] border-[#1f1f26] hover:text-[#d1cbbd]'
              }`}
            >
              {f.icon}
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
