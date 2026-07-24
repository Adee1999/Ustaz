/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Mail, Lock, User, Building, AlertCircle, RefreshCw, Award } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [position, setPosition] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ fullName, email, password, schoolName, position });
      }
    } catch (err: any) {
      setLocalError(err.message || 'Белгісіз қате орын алды.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setLocalError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-100">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-display font-black tracking-tight text-slate-800">Ustaz Studio</h1>
            <p className="text-[11px] font-bold text-[#2563EB] uppercase tracking-widest">Педагог орталығы</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-6">
          {/* Mode tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Кіру
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                mode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Тіркелу
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              {mode === 'register' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500">Аты-жөніңіз</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Мысалы: Төлегенов Ақылбек Нұрланұлы"
                      className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ustaz@mektep.kz"
                    className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500">Құпия сөз</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'Кемінде 6 таңба' : '••••••••'}
                    className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">Білім беру мекемесі (міндетті емес)</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="Мысалы: №17 IT лицей-интернаты"
                        className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">Лауазымыңыз (міндетті емес)</label>
                    <div className="relative">
                      <Award className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder="Мысалы: Математика пәнінің мұғалімі"
                        className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition"
                      />
                    </div>
                  </div>
                </>
              )}

              {localError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{localError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:bg-blue-400 transition"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {mode === 'login' ? 'Жүйеге кіру' : 'Тіркелу және бастау'}
              </button>
            </motion.form>
          </AnimatePresence>
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-6 leading-normal">
          Әр мұғалімнің өз аккаунты мен профилі бар. Деректеріңіз тек сізге тиесілі.
        </p>
      </div>
    </div>
  );
}
