import React, { useState, useEffect, useRef } from 'react';
import { MenuItem, CategoryInfo } from '../types';
import { MenuIcon } from './MenuIcon';
import { formatPrice, toPersianDigits } from '../utils/formatters';
import { saveMenuToCloud } from '../lib/cloudMenuService';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  LogOut, 
  Check, 
  Search, 
  Sparkles, 
  Layers, 
  UtensilsCrossed, 
  Scale, 
  Clock, 
  Flame, 
  DollarSign, 
  Dumbbell, 
  Tag, 
  ListPlus,
  Save,
  Phone,
  PhoneCall,
  Settings,
  Globe,
  Database,
  Download,
  Upload,
  Activity,
  Wifi,
  Cloud,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryInfo[];
  items: MenuItem[];
  orderPhoneNumber: string;
  onSaveCategory: (cat: CategoryInfo, isNew: boolean) => void;
  onDeleteCategory: (catId: string, catTitle: string) => void;
  onSaveItem: (item: MenuItem, isNew: boolean) => void;
  onDeleteItem: (itemId: string, itemName: string) => void;
  onSaveAllMenu: (payload: any) => void;
  onUpdateOrderPhone: (phone: string) => void;
  onResetToDefault: () => void;
  onLogout: () => void;
  initialEditingItem?: MenuItem | null;
}

const AVAILABLE_ICONS: { label: string; value: MenuItem['iconType'] }[] = [
  { label: 'کباب', value: 'kebab' },
  { label: 'مرغ و جوجه', value: 'chicken' },
  { label: 'برگر', value: 'burger' },
  { label: 'پیتزا و پنیر', value: 'cheese' },
  { label: 'پاستا', value: 'pasta' },
  { label: 'ساندویچ', value: 'sandwich' },
  { label: 'هات‌داگ', value: 'hotdog' },
  { label: 'تخم‌مرغ و املت', value: 'egg' },
  { label: 'نان و غلات', value: 'bread' },
  { label: 'سیب‌زمینی', value: 'fries' },
  { label: 'خورش و سوپ', value: 'stew' },
  { label: 'نوشیدنی', value: 'drink' },
  { label: 'قهوه و چای', value: 'coffee' },
  { label: 'دسر و کیک', value: 'dessert' },
  { label: 'سالاد', value: 'salad' },
];

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  categories,
  items,
  orderPhoneNumber,
  onSaveCategory,
  onDeleteCategory,
  onSaveItem,
  onDeleteItem,
  onSaveAllMenu,
  onUpdateOrderPhone,
  onResetToDefault,
  onLogout,
  initialEditingItem = null,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'categories' | 'settings'>('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [phoneNumberInput, setPhoneNumberInput] = useState(orderPhoneNumber);

  useEffect(() => {
    setPhoneNumberInput(orderPhoneNumber);
  }, [orderPhoneNumber]);
  
  // Item Editing / Adding State
  const [editingItem, setEditingItem] = useState<MenuItem | null>(initialEditingItem);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newIngredientInput, setNewIngredientInput] = useState('');

  // Category Editing / Adding State
  const [editingCategory, setEditingCategory] = useState<CategoryInfo | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{ id: string; title: string; subtitle: string }>({
    id: '',
    title: '',
    subtitle: '',
  });

  // Notice Banner
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Database Connection Ping & Backup State
  const [pingStatus, setPingStatus] = useState<{ latency: number | null; status: 'idle' | 'testing' | 'success' | 'error' }>({
    latency: null,
    status: 'idle',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleTestServerConnection = async () => {
    setPingStatus({ latency: null, status: 'testing' });
    const startTime = performance.now();
    try {
      const res = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      });
      const endTime = performance.now();
      const ms = Math.round(endTime - startTime);

      if (res.ok) {
        setPingStatus({ latency: ms, status: 'success' });
        showNotice(`اتصال مستقیم به دیتابیس سرور برقرار است (${toPersianDigits(ms)} میلی‌ثانیه).`);
      } else {
        setPingStatus({ latency: null, status: 'error' });
        showNotice(`خطا در پاسخگویی دیتابیس سرور (کد ${res.status}).`);
      }
    } catch {
      setPingStatus({ latency: null, status: 'error' });
      showNotice('خطا در برقراری ارتباط با دیتابیس سرور.');
    }
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        version: '3.0',
        exportedAt: new Date().toISOString(),
        orderPhoneNumber,
        categories,
        items,
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `menu_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotice('فایل نسخه پشتیبان دیتابیس دانلود شد');
    } catch (err) {
      console.error('Export error:', err);
      showNotice('خطا در ایجاد فایل پشتیبان');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.categories) && Array.isArray(parsed.items)) {
          onSaveAllMenu({
            categories: parsed.categories,
            items: parsed.items,
            orderPhoneNumber: typeof parsed.orderPhoneNumber === 'string' ? parsed.orderPhoneNumber : orderPhoneNumber,
          });
          showNotice(`فایل پشتیبان با موفقیت بازیابی شد (${toPersianDigits(parsed.items.length)} غذا)`);
        } else {
          alert('فرمت فایل پشتیبان معتبر نیست.');
        }
      } catch (err) {
        alert('خطا در خواندن فایل JSON پشتیبان.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ---------------- ITEM ACTIONS ----------------
  const handleStartAddItem = () => {
    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      name: '',
      categoryId: categories[0]?.id || 'iranian',
      price: 150000,
      description: '',
      portionDetails: '',
      ingredients: [],
      tags: [],
      iconType: 'kebab',
      preparationTime: '۱۵-۲۰ دقیقه',
    };
    setEditingItem(newItem);
    setIsAddingItem(true);
  };

  const handleStartEditItem = (item: MenuItem) => {
    setEditingItem({ ...item, ingredients: item.ingredients ? [...item.ingredients] : [] });
    setIsAddingItem(false);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!editingItem.name.trim()) {
      alert('لطفاً نام غذا را وارد کنید.');
      return;
    }

    onSaveItem(editingItem, isAddingItem);
    showNotice(isAddingItem ? `غذای جدید «${editingItem.name}» افزوده شد` : `مشخصات «${editingItem.name}» بروزرسانی شد`);

    setEditingItem(null);
    setIsAddingItem(false);
  };

  const handleDeleteItem = (itemId: string, itemName: string) => {
    if (window.confirm(`آیا از حذف آیتم «${itemName}» مطمئن هستید؟`)) {
      onDeleteItem(itemId, itemName);
      showNotice(`آیتم «${itemName}» حذف شد`);
    }
  };

  const handleAddIngredient = () => {
    if (!newIngredientInput.trim() || !editingItem) return;
    const current = editingItem.ingredients || [];
    if (!current.includes(newIngredientInput.trim())) {
      setEditingItem({
        ...editingItem,
        ingredients: [...current, newIngredientInput.trim()],
      });
    }
    setNewIngredientInput('');
  };

  const handleRemoveIngredient = (index: number) => {
    if (!editingItem || !editingItem.ingredients) return;
    const updated = editingItem.ingredients.filter((_, i) => i !== index);
    setEditingItem({ ...editingItem, ingredients: updated });
  };

  const handleToggleTag = (tag: 'popular' | 'economy' | 'special' | 'protein') => {
    if (!editingItem) return;
    const current = editingItem.tags || [];
    const hasTag = current.includes(tag);
    const updatedTags = hasTag ? current.filter((t) => t !== tag) : [...current, tag];
    setEditingItem({ ...editingItem, tags: updatedTags });
  };

  // ---------------- CATEGORY ACTIONS ----------------
  const handleStartAddCategory = () => {
    setCategoryForm({ id: '', title: '', subtitle: '' });
    setEditingCategory(null);
    setIsAddingCategory(true);
  };

  const handleStartEditCategory = (cat: CategoryInfo) => {
    setEditingCategory(cat);
    setCategoryForm({
      id: cat.id,
      title: cat.title,
      subtitle: cat.subtitle,
    });
    setIsAddingCategory(false);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.title.trim()) {
      alert('لطفاً عنوان دسته‌بندی را وارد کنید.');
      return;
    }

    if (isAddingCategory) {
      const generatedId = categoryForm.id.trim()
        ? categoryForm.id.trim().toLowerCase().replace(/\s+/g, '-')
        : `cat-${Date.now()}`;
      
      const newCat: CategoryInfo = {
        id: generatedId,
        title: categoryForm.title.trim(),
        subtitle: categoryForm.subtitle.trim() || 'توضیحات دسته‌بندی',
      };

      onSaveCategory(newCat, true);
      showNotice(`دسته‌بندی «${newCat.title}» افزوده شد`);
    } else if (editingCategory) {
      const updatedCat: CategoryInfo = {
        ...editingCategory,
        title: categoryForm.title.trim(),
        subtitle: categoryForm.subtitle.trim(),
      };
      onSaveCategory(updatedCat, false);
      showNotice(`دسته‌بندی «${categoryForm.title}» بروزرسانی شد`);
    }

    setIsAddingCategory(false);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (catId: string, catTitle: string) => {
    const itemsInCat = items.filter((i) => i.categoryId === catId).length;
    if (itemsInCat > 0) {
      if (
        !window.confirm(
          `این دسته‌بندی دارای ${toPersianDigits(itemsInCat)} آیتم است. آیا مطمئنید؟ با حذف دسته‌بندی، تمام غذاهای آن نیز حذف خواهند شد.`
        )
      ) {
        return;
      }
    } else {
      if (!window.confirm(`آیا از حذف دسته‌بندی «${catTitle}» اطمینان دارید؟`)) {
        return;
      }
    }

    onDeleteCategory(catId, catTitle);
    showNotice(`دسته‌بندی «${catTitle}» و آیتم‌های مربوطه حذف شدند`);
  };

  // Filter items in admin
  const filteredItems = items.filter((i) => {
    if (selectedCategoryFilter !== 'all' && i.categoryId !== selectedCategoryFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = i.name.toLowerCase().includes(q);
      const matchDesc = i.description.toLowerCase().includes(q);
      const matchPortion = i.portionDetails?.toLowerCase().includes(q);
      return matchName || matchDesc || matchPortion;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-[#101015] border border-[#272736] rounded-3xl text-[#faf7ee] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#20202c] bg-[#14141c]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1d1d28] border border-[#323246] flex items-center justify-center text-[#d8c59a]">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#faf7ee]">پنل مدیریت منو</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#24171a] hover:bg-[#331c22] text-[#ff7588] text-xs font-medium border border-[#4d2028] transition-colors"
              title="خروج از حساب مدیریت"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#1c1c26] border border-[#2c2c3c] text-[#8e897e] hover:text-[#faf7ee] transition-colors"
              title="بستن پنل"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackNotice && (
          <div className="bg-[#192b1b] border-b border-[#2d4d30] text-[#85e680] text-xs px-5 py-2 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{feedbackNotice}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-5 pt-2.5 pb-2 border-b border-[#1e1e28] bg-[#121218]">
          <button
            onClick={() => {
              setActiveTab('items');
              setEditingItem(null);
              setIsAddingItem(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'items'
                ? 'bg-[#f5f0e6] text-[#0d0d0f] font-bold shadow-md'
                : 'text-[#a6a092] hover:text-[#faf7ee] hover:bg-[#1a1a24]'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>آیتم‌ها</span>
            <span className="text-[10px] opacity-75 font-mono">({toPersianDigits(items.length)})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('categories');
              setEditingCategory(null);
              setIsAddingCategory(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'categories'
                ? 'bg-[#f5f0e6] text-[#0d0d0f] font-bold shadow-md'
                : 'text-[#a6a092] hover:text-[#faf7ee] hover:bg-[#1a1a24]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>دسته‌ها</span>
            <span className="text-[10px] opacity-75 font-mono">({toPersianDigits(categories.length)})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-[#f5f0e6] text-[#0d0d0f] font-bold shadow-md'
                : 'text-[#a6a092] hover:text-[#faf7ee] hover:bg-[#1a1a24]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>تنظیمات</span>
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ======================= TAB 1: MENU ITEMS ======================= */}
          {activeTab === 'items' && (
            <div>
              {editingItem ? (
                /* Item Edit / Add Form */
                <form onSubmit={handleSaveItem} className="space-y-4 max-w-2xl mx-auto bg-[#14141d] p-5 rounded-2xl border border-[#272738]">
                  <div className="flex items-center justify-between pb-3 border-b border-[#252535]">
                    <h3 className="text-sm font-bold text-[#faf7ee] flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-[#d8c59a]" />
                      <span>{isAddingItem ? 'افزودن غذای جدید به منو' : `ویرایش «${editingItem.name || 'آیتم'}»`}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(null);
                        setIsAddingItem(false);
                      }}
                      className="text-xs text-[#8e897e] hover:text-[#faf7ee]"
                    >
                      انصراف و بازگشت
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Item Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#b5ad9e]">نام غذا / آیتم *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        placeholder="مثال: چلو کباب کوبیده مخصوص"
                        className="w-full bg-[#1b1b26] border border-[#2d2d3e] focus:border-[#d8c59a] rounded-xl px-3 py-2 text-xs text-[#faf7ee] placeholder-[#6d685e] focus:outline-none"
                      />
                    </div>

                    {/* Price */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-[#b5ad9e]">قیمت (تومان) *</label>
                        <span className="text-[11px] text-[#d8c59a] font-mono">
                          {formatPrice(editingItem.price || 0)}
                        </span>
                      </div>
                      <input
                        type="number"
                        required
                        min="0"
                        step="1000"
                        value={editingItem.price}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, price: Number(e.target.value) || 0 })
                        }
                        placeholder="700000"
                        className="w-full bg-[#1b1b26] border border-[#2d2d3e] focus:border-[#d8c59a] rounded-xl px-3 py-2 text-xs text-[#faf7ee] placeholder-[#6d685e] focus:outline-none font-mono"
                        dir="ltr"
                      />
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#b5ad9e]">دسته‌بندی منو *</label>
                      <select
                        value={editingItem.categoryId}
                        onChange={(e) => setEditingItem({ ...editingItem, categoryId: e.target.value })}
                        className="w-full bg-[#1b1b26] border border-[#2d2d3e] focus:border-[#d8c59a] rounded-xl px-3 py-2 text-xs text-[#faf7ee] focus:outline-none"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Preparation Time */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#b5ad9e] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#d8c59a]" />
                        <span>زمان تقریبی آماده‌سازی</span>
                      </label>
                      <input
                        type="text"
                        value={editingItem.preparationTime || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, preparationTime: e.target.value })}
                        placeholder="مثال: ۱۵-۲۰ دقیقه"
                        className="w-full bg-[#1b1b26] border border-[#2d2d3e] focus:border-[#d8c59a] rounded-xl px-3 py-2 text-xs text-[#faf7ee] placeholder-[#6d685e] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Portion & Weight Details (ترکیب و وزن پرس) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#b5ad9e] flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-[#d8c59a]" />
                      <span>ترکیب و وزن پرس (مشخصات دقیق گرم و تعداد)</span>
                    </label>
                    <input
                      type="text"
                      value={editingItem.portionDetails || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, portionDetails: e.target.value })}
                      placeholder="مثال: ۲ سیخ کوبیده ۱۲۰ گرمی (۲۴۰ گرم خالص) + ۴۵۰ گرم برنج ایرانی + دورچین"
                      className="w-full bg-[#1b1b26] border border-[#2d2d3e] focus:border-[#d8c59a] rounded-xl px-3 py-2 text-xs text-[#faf7ee] placeholder-[#6d685e] focus:outline-none"
                    />
                  </div>

                  {/* Description (توضیحات و مشخصات) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#b5ad9e]">توضیحات و مشخصات طعم و طبخ</label>
                    <textarea
                      rows={3}
                      value={editingItem.description}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      placeholder="توضیحات درباره شیوه پخت، کیفیت مواد اولیه، طعم و جزئیات..."
                      className="w-full bg-[#1b1b26] border border-[#2d2d3e] focus:border-[#d8c59a] rounded-xl px-3 py-2 text-xs text-[#faf7ee] placeholder-[#6d685e] focus:outline-none leading-relaxed"
                    />
                  </div>

                  {/* Ingredients (محتویات و مواد تشکیل‌دهنده) */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#b5ad9e]">
                      محتویات و مواد تشکیل‌دهنده (افزودن مواد مجزا)
                    </label>
                    
                    {/* Active Ingredients Tags */}
                    <div className="flex flex-wrap gap-1.5 p-2 bg-[#1b1b26] rounded-xl border border-[#2d2d3e] min-h-[42px]">
                      {editingItem.ingredients && editingItem.ingredients.length > 0 ? (
                        editingItem.ingredients.map((ing, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#272738] text-[#faf7ee] text-xs border border-[#3b3b50]"
                          >
                            <span>{ing}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredient(idx)}
                              className="text-[#ff7588] hover:text-[#ff94a3]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-[#6d685e] py-1">ماده‌ای افزوده نشده است.</span>
                      )}
                    </div>

                    {/* Add Ingredient Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newIngredientInput}
                        onChange={(e) => setNewIngredientInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddIngredient();
                          }
                        }}
                        placeholder="افزودن ماده اولیه (مثلاً: زعفران قائنات، کره حیوانی، گوشت گرم گوساله...)"
                        className="flex-1 bg-[#1b1b26] border border-[#2d2d3e] focus:border-[#d8c59a] rounded-xl px-3 py-2 text-xs text-[#faf7ee] placeholder-[#6d685e] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddIngredient}
                        className="px-3 py-2 rounded-xl bg-[#29293a] hover:bg-[#36364d] text-xs font-medium text-[#e8dfc8] border border-[#3c3c52] flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>افزودن</span>
                      </button>
                    </div>
                  </div>

                  {/* Icon Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#b5ad9e]">آیکون نمادین غذا</label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-2 bg-[#1b1b26] rounded-xl border border-[#2d2d3e]">
                      {AVAILABLE_ICONS.map((ic) => {
                        const isSelected = editingItem.iconType === ic.value;
                        return (
                          <button
                            key={ic.value}
                            type="button"
                            onClick={() => setEditingItem({ ...editingItem, iconType: ic.value })}
                            className={`flex items-center gap-1.5 p-2 rounded-lg text-xs transition-colors border ${
                              isSelected
                                ? 'bg-[#3b3524] border-[#d8c59a] text-[#f5f0e6] font-bold'
                                : 'bg-[#15151e] border-[#252533] text-[#8e897e] hover:text-[#faf7ee]'
                            }`}
                          >
                            <MenuIcon type={ic.value} size={15} />
                            <span className="truncate">{ic.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tags Badges */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#b5ad9e]">برچسب‌های ویژه (انتخابی)</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleTag('popular')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1 transition-colors ${
                          editingItem.tags?.includes('popular')
                            ? 'bg-[#3d1e17] border-[#ff7b5c] text-[#ff9879]'
                            : 'bg-[#1b1b26] border-[#2d2d3e] text-[#8e897e]'
                        }`}
                      >
                        <Flame className="w-3 h-3" />
                        <span>پرطرفدار</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleTag('economy')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1 transition-colors ${
                          editingItem.tags?.includes('economy')
                            ? 'bg-[#183324] border-[#5ce69a] text-[#7ee3a4]'
                            : 'bg-[#1b1b26] border-[#2d2d3e] text-[#8e897e]'
                        }`}
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>اقتصادی</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleTag('special')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1 transition-colors ${
                          editingItem.tags?.includes('special')
                            ? 'bg-[#362f18] border-[#f5d77f] text-[#f5d77f]'
                            : 'bg-[#1b1b26] border-[#2d2d3e] text-[#8e897e]'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>ویژه و سرآشپز</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleTag('protein')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1 transition-colors ${
                          editingItem.tags?.includes('protein')
                            ? 'bg-[#1d2c42] border-[#7cb4fa] text-[#8cbef5]'
                            : 'bg-[#1b1b26] border-[#2d2d3e] text-[#8e897e]'
                        }`}
                      >
                        <Dumbbell className="w-3 h-3" />
                        <span>پرپروتئین</span>
                      </button>
                    </div>
                  </div>

                  {/* Save buttons */}
                  <div className="pt-4 border-t border-[#252535] flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(null);
                        setIsAddingItem(false);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#1b1b26] hover:bg-[#272738] text-xs text-[#a6a092] font-medium"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#e8dfc8] hover:bg-[#f5f0e6] text-[#0d0d0f] font-bold text-xs shadow-md flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>ذخیره تغییرات آیتم</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Items List View */
                <div className="space-y-4">
                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#14141c] p-3 rounded-2xl border border-[#222230]">
                    {/* Add Item Button */}
                    <button
                      onClick={handleStartAddItem}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e8dfc8] hover:bg-[#f5f0e6] text-[#0d0d0f] font-bold text-xs shadow-md transition-transform active:scale-98"
                    >
                      <Plus className="w-4 h-4" />
                      <span>افزودن آیتم</span>
                    </button>

                    {/* Filter & Search */}
                    <div className="flex items-center gap-2 flex-1 sm:justify-end">
                      {/* Category filter */}
                      <select
                        value={selectedCategoryFilter}
                        onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                        className="bg-[#1b1b26] border border-[#2d2d3e] rounded-xl px-2.5 py-2 text-xs text-[#faf7ee] focus:outline-none"
                      >
                        <option value="all">دسته‌ها ({toPersianDigits(items.length)})</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>

                      {/* Search */}
                      <div className="relative flex-1 sm:max-w-xs">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="جستجوی غذا..."
                          className="w-full bg-[#1b1b26] border border-[#2d2d3e] rounded-xl py-2 pr-8 pl-3 text-xs text-[#faf7ee] placeholder-[#6d685e] focus:outline-none"
                        />
                        <Search className="w-3.5 h-3.5 text-[#8e897e] absolute right-2.5 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>

                  {/* Items List Table / Cards */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredItems.map((item) => {
                      const itemCat = categories.find((c) => c.id === item.categoryId);
                      return (
                        <div
                          key={item.id}
                          className="bg-[#14141d] border border-[#242433] hover:border-[#3a3a50] rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#1b1b28] border border-[#2d2d40] flex items-center justify-center text-[#d8c59a] flex-shrink-0">
                              <MenuIcon type={item.iconType} size={20} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-[#faf7ee]">{item.name}</h4>
                                <span className="text-[10px] bg-[#1d1d2b] text-[#b8b0a1] px-2 py-0.5 rounded-md border border-[#2c2c3e]">
                                  {itemCat ? itemCat.title : item.categoryId}
                                </span>
                              </div>

                              <p className="text-xs text-[#8e897e] line-clamp-1 mt-0.5">
                                {item.portionDetails || item.description}
                              </p>

                              {item.ingredients && item.ingredients.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.ingredients.slice(0, 3).map((ing, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] bg-[#191924] text-[#8e897e] px-1.5 py-0.2 rounded"
                                    >
                                      {ing}
                                    </span>
                                  ))}
                                  {item.ingredients.length > 3 && (
                                    <span className="text-[10px] text-[#6d685e]">
                                      +{toPersianDigits(item.ingredients.length - 3)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#20202e]">
                            <span className="text-sm font-bold text-[#f5f0e6] font-mono">
                              {formatPrice(item.price)}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartEditItem(item)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1f1f2c] hover:bg-[#2b2b3d] text-xs text-[#e8dfc8] border border-[#303042] transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>ویرایش</span>
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                className="p-1.5 rounded-lg bg-[#26181b] hover:bg-[#361e23] text-[#ff7588] border border-[#482028] transition-colors"
                                title="حذف آیتم"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {filteredItems.length === 0 && (
                      <div className="text-center py-10 bg-[#14141c] rounded-2xl border border-[#222230] text-xs text-[#8e897e]">
                        هیچ غذایی با این فیلتر یا جستجو یافت نشد.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= TAB 2: CATEGORIES ======================= */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              {isAddingCategory || editingCategory ? (
                /* Category Form */
                <form
                  onSubmit={handleSaveCategory}
                  className="space-y-4 max-w-lg mx-auto bg-[#14141d] p-5 rounded-2xl border border-[#272738]"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[#252535]">
                    <h3 className="text-sm font-bold text-[#faf7ee]">
                      {isAddingCategory ? 'افزودن دسته‌بندی جدید' : `ویرایش دسته‌بندی «${editingCategory?.title}»`}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setEditingCategory(null);
                      }}
                      className="text-xs text-[#8e897e] hover:text-[#faf7ee]"
                    >
                      انصراف
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#b5ad9e]">عنوان دسته‌بندی (فارسی) *</label>
                      <input
                        type="text"
                        required
                        value={categoryForm.title}
                        onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
                        placeholder="مثال: نوشیدنی و بار گرم"
                        className="w-full bg-[#1b1b26] border border-[#2d2d3e] focus:border-[#d8c59a] rounded-xl px-3 py-2 text-xs text-[#faf7ee] placeholder-[#6d685e] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#b5ad9e]">توضیحات کوتاه زیر عنوان</label>
                      <input
                        type="text"
                        value={categoryForm.subtitle}
                        onChange={(e) => setCategoryForm({ ...categoryForm, subtitle: e.target.value })}
                        placeholder="مثال: انواع قهوه‌های دمی، اسپرسو و دمنوش‌های گیاهی"
                        className="w-full bg-[#1b1b26] border border-[#2d2d3e] focus:border-[#d8c59a] rounded-xl px-3 py-2 text-xs text-[#faf7ee] placeholder-[#6d685e] focus:outline-none"
                      />
                    </div>

                    {isAddingCategory && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[#b5ad9e]">شناسه انگلیسی (اختیاری)</label>
                        <input
                          type="text"
                          value={categoryForm.id}
                          onChange={(e) => setCategoryForm({ ...categoryForm, id: e.target.value })}
                          placeholder="drinks"
                          className="w-full bg-[#1b1b26] border border-[#2d2d3e] focus:border-[#d8c59a] rounded-xl px-3 py-2 text-xs text-[#faf7ee] placeholder-[#6d685e] focus:outline-none font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#252535] flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategory(false);
                        setEditingCategory(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#1b1b26] hover:bg-[#272738] text-xs text-[#a6a092]"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#e8dfc8] hover:bg-[#f5f0e6] text-[#0d0d0f] font-bold text-xs shadow-md"
                    >
                      ذخیره دسته‌بندی
                    </button>
                  </div>
                </form>
              ) : (
                /* Category List */
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-[#14141c] p-3 rounded-2xl border border-[#222230]">
                    <span className="text-xs text-[#b5ad9e]">
                      دسته‌بندی‌های فعال در نوار بالای منو
                    </span>
                    <button
                      onClick={handleStartAddCategory}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e8dfc8] hover:bg-[#f5f0e6] text-[#0d0d0f] font-bold text-xs shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن دسته‌بندی جدید</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {categories.map((cat) => {
                      const itemCount = items.filter((i) => i.categoryId === cat.id).length;
                      return (
                        <div
                          key={cat.id}
                          className="bg-[#14141d] border border-[#242433] rounded-2xl p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#1b1b28] border border-[#2d2d40] flex items-center justify-center text-[#d8c59a]">
                              <MenuIcon
                                type={
                                  cat.id === 'breakfast'
                                    ? 'category-breakfast'
                                    : cat.id === 'iranian'
                                    ? 'category-iranian'
                                    : cat.id === 'fastfood'
                                    ? 'category-fastfood'
                                    : 'drink'
                                }
                                size={18}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-[#faf7ee]">{cat.title}</h4>
                                <span className="text-[10px] bg-[#1d1d2b] text-[#8e897e] px-2 py-0.5 rounded-md font-mono">
                                  {toPersianDigits(itemCount)} غذا
                                </span>
                              </div>
                              <p className="text-xs text-[#8e897e] mt-0.5">{cat.subtitle}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartEditCategory(cat)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#1f1f2c] hover:bg-[#2b2b3d] text-xs text-[#e8dfc8] border border-[#303042] flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>ویرایش</span>
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat.id, cat.title)}
                              className="p-1.5 rounded-lg bg-[#26181b] hover:bg-[#361e23] text-[#ff7588] border border-[#482028]"
                              title="حذف دسته‌بندی"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= TAB 3: SETTINGS ======================= */}
          {activeTab === 'settings' && (
            <div className="max-w-xl mx-auto space-y-4 pt-2">
              {/* Order Phone Number Setting */}
              <div className="bg-[#14141d] border border-[#242433] rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-[#faf7ee] flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-[#7ce075]" />
                  <span>تنظیم شماره تماس ثبت سفارش</span>
                </h3>
                <p className="text-xs text-[#8e897e] leading-relaxed">
                  شماره‌ای که در دکمه «ثبت سفارش» پایین منو قرار می‌گیرد و مشتریان با لمس آن تماس می‌گیرند:
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={phoneNumberInput}
                      onChange={(e) => setPhoneNumberInput(e.target.value)}
                      placeholder="02188880000"
                      className="w-full bg-[#1b1b26] border border-[#2e2e40] focus:border-[#7ce075] rounded-xl py-2.5 pr-9 pl-3 text-xs text-[#faf7ee] placeholder-[#6e685c] focus:outline-none transition-all font-mono text-left"
                      dir="ltr"
                    />
                    <Phone className="w-3.5 h-3.5 text-[#8e897e] absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!phoneNumberInput.trim()) {
                        alert('لطفاً شماره تماس را وارد کنید');
                        return;
                      }
                      onUpdateOrderPhone(phoneNumberInput.trim());
                      showNotice(`شماره تماس ثبت سفارش ذخیره شد: ${phoneNumberInput.trim()}`);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#1f3825] hover:bg-[#284a30] text-[#8ae685] font-bold text-xs border border-[#32613b] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>ذخیره شماره تماس</span>
                  </button>
                </div>
              </div>

              {/* Server Database Configuration */}
              <div className="bg-[#14141d] border border-[#242433] rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#faf7ee] flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#70b5ff]" />
                    <span>دیتابیس متمرکز سرور</span>
                  </h3>
                  <span className="px-2.5 py-1 rounded-full bg-[#172d1f] text-[#7ce075] border border-[#235332] text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-[#7ce075] animate-pulse"></span>
                    فعال و متصل
                  </span>
                </div>

                <p className="text-xs text-[#a6a092] leading-relaxed">
                  اطلاعات منو منحصراً و به صورت زنده از دیتابیس سرور دریافت و ثبت می‌شوند و هیچ‌گونه داده موقت روی مرورگر ذخیره نمی‌گردد. تمام تغییرات (افزودن، ویرایش و حذف غذاها و دسته‌بندی‌ها) به صورت مستقیم در سرور پایدار می‌شوند.
                </p>

                {/* Test Connection Button & Status */}
                <div className="pt-2 border-t border-[#232332] flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="text-xs text-[#8e897e] flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#70b5ff]" />
                    <span>وضعیت دیتابیس: <span className="text-[#7ce075] font-bold">همگام‌سازی زنده فعال</span></span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestServerConnection}
                    disabled={pingStatus.status === 'testing'}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-[#1a2333] hover:bg-[#23324a] text-[#70b5ff] text-xs font-bold border border-[#2d4263] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <Activity className={`w-3.5 h-3.5 ${pingStatus.status === 'testing' ? 'animate-spin' : ''}`} />
                    <span>
                      {pingStatus.status === 'testing'
                        ? 'در حال سنجش اتصال...'
                        : pingStatus.latency !== null
                        ? `تست مجدد اتصال (${toPersianDigits(pingStatus.latency)} میلی‌ثانیه)`
                        : 'تست اتصال با دیتابیس سرور'}
                    </span>
                  </button>
                </div>

                {/* Backup & Restore Tools */}
                <div className="pt-2 border-t border-[#232332] space-y-2">
                  <span className="text-[11px] font-bold text-[#faf7ee] block">پشتیبان‌گیری و بازیابی داده‌ها (JSON):</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="py-2.5 px-3 rounded-xl bg-[#1b2620] hover:bg-[#23332a] text-[#7ce075] text-xs font-bold border border-[#2b4c38] transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>دانلود فایل پشتیبان کامل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2.5 px-3 rounded-xl bg-[#26201b] hover:bg-[#332b24] text-[#ffb075] text-xs font-bold border border-[#4d3a2b] transition-colors flex items-center justify-center gap-2"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>بازیابی از فایل پشتیبان</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportBackup}
                      accept=".json"
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Reset to Default */}
              <div className="bg-[#14141d] border border-[#242433] rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-[#faf7ee] flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#ff7588]" />
                  <span>بازنشانی به منوی اولیه کارخانه</span>
                </h3>
                <p className="text-xs text-[#8e897e] leading-relaxed">
                  در صورت نیاز، می‌توانید تمام تغییرات را پاک کرده و منو را به حالت پیش‌فرض اولیه برگردانید:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        'آیا مطمئن هستید که می‌خواهید تمام تغییرات، قیمت‌ها و غذاهای ویرایش‌شده را به حالت پیش‌فرض بازگردانید؟'
                      )
                    ) {
                      onResetToDefault();
                      showNotice('منو با موفقیت به حالت پیش‌فرض بازگردانده شد');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-[#2b171c] hover:bg-[#3d1e26] text-[#ff7588] font-medium text-xs border border-[#4d242d] transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>بازگردانی منو به حالت پیش‌فرض اولیه</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
