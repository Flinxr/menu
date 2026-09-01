/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CategoryId, MenuItem, CategoryInfo } from './types';
import { CATEGORIES as INITIAL_CATEGORIES, MENU_ITEMS as INITIAL_MENU_ITEMS } from './data/menuData';
import { 
  fetchMenuFromCloud, 
  saveMenuToCloud, 
  resetMenuOnCloud,
  subscribeToCloudMenu, 
  CloudMenuPayload 
} from './lib/cloudMenuService';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { FilterBar, FilterTag } from './components/FilterBar';
import { MenuItemCard } from './components/MenuItemCard';
import { ItemDetailModal } from './components/ItemDetailModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { MenuIcon } from './components/MenuIcon';
import { toPersianDigits } from './utils/formatters';
import { 
  CheckCircle2, 
  SearchX,
  ShieldCheck,
  Edit3,
  Phone,
  PhoneCall,
  Loader2,
  AlertCircle
} from 'lucide-react';

const STORAGE_KEY_ADMIN_AUTH = 'digital_menu_admin_auth_v2';

export default function App() {
  // ---------------- State: Categories & Menu Items ----------------
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderPhoneNumber, setOrderPhoneNumber] = useState<string>('09900674112');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // ---------------- Cloud Database Realtime Sync & Hydration ----------------
  const refreshFromCloud = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    try {
      setCloudError(null);
      const cloudData = await fetchMenuFromCloud();
      if (cloudData && (cloudData.items.length > 0 || cloudData.categories.length > 0)) {
        setCategories(cloudData.categories);
        setMenuItems(cloudData.items);
        if (cloudData.orderPhoneNumber) {
          setOrderPhoneNumber(cloudData.orderPhoneNumber);
        }
      } else {
        // If database is completely empty on first deploy, initialize it with default items directly into Cloud Firestore
        await saveMenuToCloud({
          categories: INITIAL_CATEGORIES,
          items: INITIAL_MENU_ITEMS,
          orderPhoneNumber: '09900674112',
        });
        setCategories(INITIAL_CATEGORIES);
        setMenuItems(INITIAL_MENU_ITEMS);
        setOrderPhoneNumber('09900674112');
      }
    } catch (err: any) {
      console.error('Failed to sync menu with server database:', err);
      setCloudError('اتصال به دیتابیس با مشکل مواجه شد');
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount for all devices and IPs
    refreshFromCloud(true);

    // Subscribe to realtime updates
    const unsubscribe = subscribeToCloudMenu(
      (data: CloudMenuPayload) => {
        if (data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
        if (data.items && Array.isArray(data.items)) {
          setMenuItems(data.items);
        }
        if (data.orderPhoneNumber) {
          setOrderPhoneNumber(data.orderPhoneNumber);
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn('Realtime listener fallback note:', error);
      }
    );

    // Refresh on window focus / visibility change with debounce
    let lastRefreshTime = Date.now();
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastRefreshTime > 20000) {
        lastRefreshTime = now;
        refreshFromCloud(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastRefreshTime > 20000) {
          lastRefreshTime = now;
          refreshFromCloud(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshFromCloud]);

  // ---------------- State: Navigation & Filters ----------------
  const [activeCategory, setActiveCategory] = useState<CategoryId | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<FilterTag>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetailItem, setSelectedDetailItem] = useState<MenuItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ---------------- State: Admin Auth & Modals ----------------
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY_ADMIN_AUTH) === 'true';
    } catch {
      return false;
    }
  });
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [editingItemInAdmin, setEditingItemInAdmin] = useState<MenuItem | null>(null);

  // Dynamic section refs for categories
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY_ADMIN_AUTH, isAdminLoggedIn ? 'true' : 'false');
  }, [isAdminLoggedIn]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // ---------------- Admin Actions ----------------
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setIsAdminLoginOpen(false);
    setIsAdminPanelOpen(true);
    showToast('خوش آمدید! وارد پنل مدیریت شدید');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setIsAdminPanelOpen(false);
    sessionStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    showToast('از حساب مدیریت خارج شدید');
  };

  const handleUpdateItems = async (updated: MenuItem[]) => {
    setMenuItems(updated);
    if (selectedDetailItem) {
      const fresh = updated.find((i) => i.id === selectedDetailItem.id);
      setSelectedDetailItem(fresh || null);
    }
    setIsSyncing(true);
    try {
      await saveMenuToCloud({ items: updated, categories, orderPhoneNumber });
      showToast('تغییرات با موفقیت در دیتابیس ذخیره و سراسری شد');
    } catch (err) {
      console.error('Error saving items to database:', err);
      showToast('خطا در ذخیره دیتابیس. لطفاً اتصال را بررسی کنید');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateCategories = async (updated: CategoryInfo[]) => {
    setCategories(updated);
    setIsSyncing(true);
    try {
      await saveMenuToCloud({ categories: updated, items: menuItems, orderPhoneNumber });
      showToast('دسته‌بندی‌ها در دیتابیس ذخیره شدند');
    } catch (err) {
      console.error('Error saving categories to database:', err);
      showToast('خطا در ذخیره اطلاعات');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateOrderPhone = async (newPhone: string) => {
    setOrderPhoneNumber(newPhone);
    setIsSyncing(true);
    try {
      await saveMenuToCloud({ orderPhoneNumber: newPhone, categories, items: menuItems });
      showToast('شماره تماس در دیتابیس ذخیره و در تمام دیوایس‌ها همگام شد');
    } catch (err) {
      console.error('Error saving phone to database:', err);
      showToast('خطا در ذخیره شماره تماس');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetToDefault = async () => {
    setIsSyncing(true);
    try {
      const resetData = await resetMenuOnCloud();
      setCategories(resetData.categories);
      setMenuItems(resetData.items);
      setOrderPhoneNumber(resetData.orderPhoneNumber);
      showToast('منو در دیتابیس به حالت اولیه بازگردانده شد');
    } catch (err) {
      console.error('Error resetting menu on database:', err);
      showToast('خطا در بازنشانی دیتابیس');
    } finally {
      setIsSyncing(false);
    }
  };

  // ---------------- Share Action ----------------
  const handleShareMenu = () => {
    if (navigator.share) {
      navigator
        .share({
          title: 'منوی دیجیتال رستوران',
          text: 'منوی آنلاین غذاها و مشخصات کامل ترکیبات',
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('لینک منو در کلیپ‌بورد کپی شد');
    }
  };

  // ---------------- Category Selection & Scroll ----------------
  const handleSelectCategory = (catId: CategoryId | 'all') => {
    setActiveCategory(catId);
    if (catId !== 'all') {
      const targetElement = sectionRefs.current[catId];
      if (targetElement) {
        const yOffset = -140;
        const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ---------------- Filter & Search Logic ----------------
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categories.forEach((c) => {
      counts[c.id] = 0;
    });
    menuItems.forEach((item) => {
      counts[item.categoryId] = (counts[item.categoryId] || 0) + 1;
    });
    return counts;
  }, [categories, menuItems]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category filter
      if (activeCategory !== 'all' && item.categoryId !== activeCategory) {
        return false;
      }

      // Tag filter
      if (activeFilter !== 'all') {
        if (!item.tags?.includes(activeFilter)) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchIngredients = item.ingredients?.some((ing) =>
          ing.toLowerCase().includes(q)
        );
        const matchPortion = item.portionDetails?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchIngredients && !matchPortion) {
          return false;
        }
      }

      return true;
    });
  }, [menuItems, activeCategory, activeFilter, searchQuery]);

  // Group items by category for section display when activeCategory === 'all' and not searching
  const isBrowsingAll = activeCategory === 'all' && !searchQuery.trim() && activeFilter === 'all';

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f5f0e6] font-['Vazirmatn',sans-serif] pb-24">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-[#1b1b24] text-[#faf7ee] border border-[#363648] px-3.5 py-2 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#7ce075]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Quick Bar (If Logged In) */}
      {isAdminLoggedIn && (
        <div className="bg-[#152418] border-b border-[#234427] px-3.5 py-1.5 text-xs flex items-center justify-between text-[#8ce287] max-w-md mx-auto">
          <div className="flex items-center gap-1.5 font-medium text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#7ce075]" />
            <span>حالت مدیریت فعال است</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdminPanelOpen(true)}
              className="bg-[#1f3d23] hover:bg-[#284f2e] text-[#faf7ee] px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>ویرایش منو</span>
            </button>
            <button
              onClick={handleAdminLogout}
              className="text-[#ff98a6] hover:underline text-[10px]"
            >
              خروج
            </button>
          </div>
        </div>
      )}

      {/* Sticky Top Header & Category Navigation Bar */}
      <div className="sticky top-0 z-40 bg-[#0d0d0f]/95 border-b border-[#1f1f26] backdrop-blur-md shadow-sm">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onShareMenu={handleShareMenu}
          onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          isAdminLoggedIn={isAdminLoggedIn}
          onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        />
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          categoryCounts={categoryCounts}
        />
      </div>

      {/* Secondary Filter Chips */}
      <FilterBar
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
      />

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-3.5 pt-2.5">
        {/* Loading State */}
        {isLoading && menuItems.length === 0 ? (
          <div className="py-20 text-center bg-[#101014] border border-[#1e1e26] rounded-2xl p-6 mt-4">
            <Loader2 className="w-8 h-8 text-[#e8dfc8] animate-spin mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#faf7ee]">در حال اتصال به دیتابیس ابری رستوران...</h3>
            <p className="text-xs text-[#8e897e] mt-1.5 leading-relaxed">
              در حال دریافت آخرین نسخه منو، قیمت‌ها و غذاهای تازه
            </p>
          </div>
        ) : cloudError && menuItems.length === 0 ? (
          <div className="py-12 text-center bg-[#181112] border border-[#3d1e22] rounded-2xl p-5 mt-4">
            <AlertCircle className="w-8 h-8 text-[#ff7588] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#faf7ee]">{cloudError}</h3>
            <p className="text-xs text-[#a88a8f] mt-1 leading-relaxed">
              ارتباط با سرور ابری موقتاً قطع شده است.
            </p>
            <button
              onClick={() => refreshFromCloud(true)}
              className="mt-3 px-4 py-1.5 bg-[#ff7588] text-[#09090b] font-bold text-xs rounded-xl hover:bg-[#ff8f9f] transition-colors"
            >
              تلاش مجدد
            </button>
          </div>
        ) : (
          <>
            {(searchQuery || activeFilter !== 'all') && (
              <div className="flex items-center justify-between bg-[#121216] border border-[#202028] p-2 rounded-xl mb-2.5 text-xs">
                <span className="text-[#a6a092] text-[11px]">
                  {searchQuery
                    ? `نتایج برای "${searchQuery}" (${toPersianDigits(filteredItems.length)} مورد)`
                    : `فیلتر: ${
                        activeFilter === 'popular'
                          ? 'پرطرفدار'
                          : activeFilter === 'economy'
                          ? 'اقتصادی'
                          : activeFilter === 'protein'
                          ? 'پرپروتئین'
                          : 'ویژه'
                      } (${toPersianDigits(filteredItems.length)} مورد)`}
                </span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                    setActiveCategory('all');
                  }}
                  className="text-[#e5dcc7] hover:underline text-[10px] font-medium"
                >
                  نمایش همه
                </button>
              </div>
            )}

            {/* Empty State */}
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center bg-[#101014] border border-[#1e1e26] rounded-2xl p-5 mt-3">
                <div className="w-12 h-12 mx-auto rounded-xl bg-[#16161e] border border-[#262634] flex items-center justify-center text-[#8e897e] mb-2.5">
                  <SearchX className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#faf7ee]">هیچ غذایی یافت نشد</h3>
                <p className="text-xs text-[#8e897e] max-w-xs mx-auto mt-1 leading-relaxed">
                  عبارت دیگری را جستجو کنید یا فیلترهای انتخابی را تغییر دهید.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                    setActiveCategory('all');
                  }}
                  className="mt-3.5 px-3.5 py-1.5 rounded-xl bg-[#20202c] text-xs text-[#faf7ee] font-medium hover:bg-[#2b2b3b] transition-colors"
                >
                  مشاهده کل منو
                </button>
              </div>
            ) : isBrowsingAll ? (
          /* Render by categories sequentially */
          <div className="space-y-6">
            {categories.map((category) => {
              const catItems = filteredItems.filter((i) => i.categoryId === category.id);
              if (catItems.length === 0) return null;

              const iconType =
                category.id === 'breakfast'
                  ? 'category-breakfast'
                  : category.id === 'iranian'
                  ? 'category-iranian'
                  : category.id === 'fastfood'
                  ? 'category-fastfood'
                  : 'drink';

              return (
                <section
                  key={category.id}
                  ref={(el) => {
                    sectionRefs.current[category.id] = el;
                  }}
                  id={`section-${category.id}`}
                  className="space-y-2.5 pt-1"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#1b1b22]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#16161e] border border-[#242432] flex items-center justify-center text-[#e8dfc8]">
                        <MenuIcon type={iconType} size={14} />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-[#faf7ee] tracking-tight">
                          {category.title}
                        </h2>
                        <span className="text-[10px] text-[#8e897e] block">
                          {category.subtitle}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] text-[#9c9688] bg-[#14141a] px-2 py-0.2 rounded-md border border-[#202028]">
                      {toPersianDigits(catItems.length)} غذا
                    </span>
                  </div>

                  {/* Items Grid */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {catItems.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        onClickDetail={setSelectedDetailItem}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          /* Single Flat Grid for active category / search / filter */
          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onClickDetail={setSelectedDetailItem}
              />
            ))}
          </div>
        )}
        </>
        )}
      </main>

      {/* Sticky Order Action Footer Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c10]/95 border-t border-[#1e1e28] backdrop-blur-md py-2.5 px-3.5 shadow-[0_-4px_24px_rgba(0,0,0,0.7)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#15151e] border border-[#262636] flex items-center justify-center text-[#d8c59a]">
              <PhoneCall className="w-4 h-4 text-[#7ce075]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-[#8e897e] leading-tight">سفارش و تماس تلفنی</span>
              <span className="text-xs font-bold text-[#faf7ee] font-mono tracking-wide" dir="ltr">
                {toPersianDigits(orderPhoneNumber)}
              </span>
            </div>
          </div>

          <a
            id="order-phone-call-btn"
            href={`tel:${orderPhoneNumber.replace(/[^0-9+]/g, '')}`}
            className="flex-1 max-w-[150px] py-2 px-3 rounded-xl bg-[#e8dfc8] hover:bg-[#faf7ee] text-[#0d0d0f] font-bold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5 fill-current" />
            <span>ثبت سفارش</span>
          </a>
        </div>
      </footer>

      {/* Item Detail Modal */}
      <ItemDetailModal
        item={selectedDetailItem}
        categories={categories}
        onClose={() => setSelectedDetailItem(null)}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenEditItem={(item) => {
          setEditingItemInAdmin(item);
          setIsAdminPanelOpen(true);
        }}
      />

      {/* Admin Login Modal (Triggered by holding logo) */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* Admin Panel Modal */}
      <AdminPanelModal
        isOpen={isAdminPanelOpen}
        onClose={() => {
          setIsAdminPanelOpen(false);
          setEditingItemInAdmin(null);
        }}
        categories={categories}
        items={menuItems}
        orderPhoneNumber={orderPhoneNumber}
        onUpdateCategories={handleUpdateCategories}
        onUpdateItems={handleUpdateItems}
        onUpdateOrderPhone={handleUpdateOrderPhone}
        onResetToDefault={handleResetToDefault}
        onLogout={handleAdminLogout}
        initialEditingItem={editingItemInAdmin}
      />
    </div>
  );
}

