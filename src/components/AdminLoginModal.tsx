import React, { useState } from 'react';
import { Lock, User, KeyRound, X, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Exact credentials: ID: ramin, password: 1223
    if (username.trim() === 'ramin' && password === '1223') {
      onSuccess();
      setUsername('');
      setPassword('');
    } else {
      setError('شناسه کاربری یا رمز عبور نامعتبر است.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#121217] border border-[#272733] rounded-3xl p-6 text-[#faf7ee] shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 p-2 rounded-xl bg-[#191922] border border-[#2c2c38] text-[#8e897e] hover:text-[#faf7ee] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center pb-4 border-b border-[#20202a]">
          <div className="w-11 h-11 mx-auto rounded-2xl bg-[#1d1d28] border border-[#333345] flex items-center justify-center text-[#d8c59a] mb-2.5 shadow-inner">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-[#faf7ee]">ورود به پنل مدیریت</h2>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="pt-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#32171c] border border-[#682430] text-[#ff7588] text-xs font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#b5ad9e] block">
              شناسه کاربری (ID)
            </label>
            <div className="relative">
              <input
                id="admin-login-id"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                className="w-full bg-[#171720] border border-[#292938] focus:border-[#d8c59a] rounded-xl py-2.5 pr-10 pl-4 text-sm text-[#faf7ee] focus:outline-none transition-all font-mono text-left"
                dir="ltr"
                autoFocus
              />
              <User className="w-4 h-4 text-[#8a8477] absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#b5ad9e] block">
              رمز عبور (Password)
            </label>
            <div className="relative">
              <input
                id="admin-login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="w-full bg-[#171720] border border-[#292938] focus:border-[#d8c59a] rounded-xl py-2.5 pr-10 pl-10 text-sm text-[#faf7ee] focus:outline-none transition-all font-mono text-left"
                dir="ltr"
              />
              <KeyRound className="w-4 h-4 text-[#8a8477] absolute right-3 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-[#8a8477] hover:text-[#faf7ee] absolute left-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#191922] hover:bg-[#242432] text-xs text-[#a6a092] font-medium transition-colors"
            >
              انصراف
            </button>
            <button
              id="admin-login-submit"
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#e8dfc8] hover:bg-[#f5f0e6] text-[#0d0d0f] font-bold text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ورود به مدیریت</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
