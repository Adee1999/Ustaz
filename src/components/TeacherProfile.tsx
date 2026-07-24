/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Building, BookOpen, Award, CheckCircle, Save, Settings, 
  Shield, Moon, Sun, Database, RefreshCw, Star, BarChart3, Clock, 
  Calendar, FileText, ChevronRight, GraduationCap, TrendingUp, Sparkles, FolderOpen, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { scopedKey } from '../utils';

interface ProfileState {
  fullName: string;
  schoolName: string;
  subjects: string[];
  grades: string[];
  city: string;
  position: string;
  autosave: boolean;
  theme: 'light' | 'dark';
  standardConformity: string;
}

interface TeacherProfileProps {
  initialTab?: 'dashboard' | 'profile' | 'settings';
  onNavigate?: (module: any) => void;
}

export default function TeacherProfile({ initialTab = 'dashboard', onNavigate }: TeacherProfileProps) {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'settings'>(initialTab);

  // Local editable copy of the account's profile fields. Synced from `user`
  // (the source of truth, persisted server-side per account) whenever it
  // changes, and pushed back via updateProfile() on save.
  const [profile, setProfile] = useState<ProfileState>({
    fullName: user?.fullName || '',
    schoolName: user?.schoolName || '',
    subjects: user?.subjects || [],
    grades: user?.grades || [],
    city: user?.city || '',
    position: user?.position || '',
    autosave: user?.autosave ?? true,
    theme: user?.theme || 'light',
    standardConformity: user?.standardConformity || 'МЖББС (2026 жаңартылған мазмұны)'
  });

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState('');
  const [newGrade, setNewGrade] = useState('');

  // Stats State
  const [stats, setStats] = useState({
    bjbCount: 0,
    tjbCount: 0,
    qmjCount: 0,
    ktjCount: 0,
    totalCount: 0
  });
  const [recentDocs, setRecentDocs] = useState<any[]>([]);

  // Keep the local editable form in sync whenever the logged-in account's
  // profile changes (e.g. right after login, or a refetch).
  useEffect(() => {
    if (!user) return;
    setProfile({
      fullName: user.fullName,
      schoolName: user.schoolName,
      subjects: user.subjects,
      grades: user.grades,
      city: user.city,
      position: user.position,
      autosave: user.autosave,
      theme: user.theme,
      standardConformity: user.standardConformity
    });
  }, [user]);

  useEffect(() => {
    calculateStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const calculateStats = () => {
    try {
      // BJB & TJB Stats (scoped to the logged-in account)
      const bjbStr = localStorage.getItem(scopedKey('ustaz_bjb_saved'));
      const bjbList = bjbStr ? JSON.parse(bjbStr) : [];
      const bjbCount = bjbList.filter((item: any) => item.assessmentType === 'BJB').length;
      const tjbCount = bjbList.filter((item: any) => item.assessmentType === 'TJB').length;

      // Lesson plans stats
      const plansStr = localStorage.getItem(scopedKey('ustaz_plans_saved'));
      const plansList = plansStr ? JSON.parse(plansStr) : [];
      const qmjCount = plansList.filter((item: any) => item.type === 'qmj').length;

      // KTJ and other saved central documents
      const docsStr = localStorage.getItem(scopedKey('ustaz_saved_documents'));
      const docsList = docsStr ? JSON.parse(docsStr) : [];
      const ktjCount = docsList.filter((item: any) => item.id?.startsWith('ktj_') || item.moduleName?.includes('КТЖ')).length;

      const totalCount = bjbList.length + plansList.length + docsList.length;

      setStats({
        bjbCount,
        tjbCount,
        qmjCount,
        ktjCount,
        totalCount
      });

      // Compile Recent Materials list (max 5)
      const allMerged: any[] = [];

      bjbList.forEach((item: any, idx: number) => {
        allMerged.push({
          id: item.id || `bjb_${idx}`,
          title: `${item.assessmentType}: ${item.topic || 'Бөлім тақырыбы'}`,
          module: 'bjb',
          moduleName: item.assessmentType === 'BJB' ? 'БЖБ Конструкторы' : 'ТЖБ Конструкторы',
          date: item.createdAt || 'Бүгін',
          subject: item.subject,
          grade: item.grade
        });
      });

      plansList.forEach((item: any, idx: number) => {
        const typeNames: Record<string, string> = {
          qmj: 'Қысқа мерзімді жоспар (ҚМЖ)',
          umj: 'Ұзақ мерзімді жоспар (ҰМЖ)',
          tarbie: 'Тәрбие сағаты',
          balabaqsha: 'Балабақша жоспары'
        };
        allMerged.push({
          id: item.id || `plan_${idx}`,
          module: 'lesson',
          title: item.topic || 'Сабақ тақырыбы',
          moduleName: typeNames[item.type] || 'Сабақ жоспары',
          date: item.createdAt || 'Бүгін',
          subject: item.subject,
          grade: item.grade
        });
      });

      docsList.forEach((item: any) => {
        // Exclude duplicate KTJ ids if they were added
        if (!allMerged.some(x => x.id === item.id)) {
          let moduleKey = 'library';
          if (item.id?.startsWith('ktj_')) moduleKey = 'ktj';
          else if (item.id?.startsWith('ach_')) moduleKey = 'achievements';
          else if (item.id?.startsWith('ref_')) moduleKey = 'parent-ref';

          allMerged.push({
            id: item.id,
            title: item.title,
            module: moduleKey,
            moduleName: item.moduleName || 'Құжат',
            date: item.date || 'Бүгін',
            subject: item.organization || 'Жалпы',
            grade: item.recipientName
          });
        }
      });

      // Sort newest first
      allMerged.sort((a, b) => b.id?.localeCompare(a.id) || 0);
      setRecentDocs(allMerged.slice(0, 5));

    } catch (e) {
      console.error('Error calculating statistics:', e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    setSaveError(null);

    try {
      await updateProfile(profile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Сақтау мүмкін болмады. Қайталап көріңіз.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSubject = () => {
    if (newSubject.trim() && !profile.subjects.includes(newSubject.trim())) {
      setProfile({
        ...profile,
        subjects: [...profile.subjects, newSubject.trim()]
      });
      setNewSubject('');
    }
  };

  const handleRemoveSubject = (sub: string) => {
    setProfile({
      ...profile,
      subjects: profile.subjects.filter(s => s !== sub)
    });
  };

  const handleAddGrade = () => {
    if (newGrade.trim() && !profile.grades.includes(newGrade.trim())) {
      setProfile({
        ...profile,
        grades: [...profile.grades, newGrade.trim()]
      });
      setNewGrade('');
    }
  };

  const handleRemoveGrade = (gr: string) => {
    setProfile({
      ...profile,
      grades: profile.grades.filter(g => g !== gr)
    });
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Tab Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-100/80 text-[#2563EB] flex items-center justify-center font-display font-black text-lg shadow-inner uppercase">
            {profile.fullName.slice(0, 2)}
          </div>
          <div>
            <h3 className="text-base font-display font-bold text-slate-800 flex flex-wrap items-center gap-2">
              {profile.fullName}
              <span className="text-[9px] font-bold bg-blue-50 text-[#2563EB] border border-blue-100 px-2 py-0.5 rounded-full uppercase">
                Педагог-зерттеуші
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">{profile.position} • {profile.schoolName}</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Бақылау тақтасы</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'profile' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Профиль деректері</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 md:flex-initial px-4 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'settings' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Баптаулар</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            {/* Welcome Quote Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-soft relative overflow-hidden">
              <div className="relative z-10 max-w-xl">
                <span className="text-[10px] font-bold bg-white/20 text-blue-100 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 w-fit mb-3">
                  <Sparkles className="w-3 h-3 text-yellow-300" /> Ustaz Studio Интеллектісі
                </span>
                <h4 className="text-lg font-display font-extrabold leading-tight">
                  Құрметті {profile.fullName.split(' ')[1] || profile.fullName}, жұмыс кеңістігіңізге қош келдіңіз!
                </h4>
                <p className="text-xs text-blue-100/90 mt-2 leading-relaxed">
                  Бүгінгі күнге жоспарланған оқу бағдарламасы мен БЖБ/ТЖБ талаптарын реттеу үшін сол жақтағы арнайы шеберханаларды пайдаланыңыз. Барлық материалдар мемлекеттік стандарттарға сәйкес дайындалады.
                </p>
              </div>
              <div className="absolute right-6 bottom-0 top-0 items-center justify-center hidden lg:flex opacity-15">
                <GraduationCap className="w-40 h-40 text-white" />
              </div>
            </div>

            {/* Statistics Bento Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Stat 1: БЖБ */}
              <div 
                onClick={() => onNavigate && onNavigate('bjb')}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft flex items-center gap-4 hover:border-blue-200 hover:shadow-md transition duration-300 cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition duration-300">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Жасалған БЖБ</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-slate-800">{stats.bjbCount}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">дайындама</span>
                  </div>
                </div>
              </div>

              {/* Stat 2: ТЖБ */}
              <div 
                onClick={() => onNavigate && onNavigate('bjb')}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft flex items-center gap-4 hover:border-indigo-200 hover:shadow-md transition duration-300 cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition duration-300">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Жасалған ТЖБ</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-slate-800">{stats.tjbCount}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">дайындама</span>
                  </div>
                </div>
              </div>

              {/* Stat 3: Ашық сабақтар */}
              <div 
                onClick={() => onNavigate && onNavigate('lesson')}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft flex items-center gap-4 hover:border-emerald-200 hover:shadow-md transition duration-300 cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition duration-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ашық сабақтар</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-slate-800">{stats.qmjCount}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">жоспар</span>
                  </div>
                </div>
              </div>

              {/* Stat 4: КТЖ */}
              <div 
                onClick={() => onNavigate && onNavigate('ktj')}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft flex items-center gap-4 hover:border-amber-200 hover:shadow-md transition duration-300 cursor-pointer group"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition duration-300">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">КТЖ</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black text-slate-800">{stats.ktjCount}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">құжат</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Materials & Quick Actions Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Recent Materials Table */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Соңғы материалдар
                  </h4>
                  <button 
                    onClick={() => onNavigate && onNavigate('library')}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
                  >
                    Кітапхананы ашу
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {recentDocs.length > 0 ? (
                  <div className="flex flex-col divide-y divide-slate-100">
                    {recentDocs.map((doc, idx) => (
                      <div 
                        key={doc.id || idx} 
                        className="py-3 flex justify-between items-center hover:bg-slate-50/50 px-2 rounded-lg transition"
                      >
                        <div className="flex flex-col gap-0.5 max-w-md">
                          <span className="text-xs font-bold text-slate-800 truncate">{doc.title}</span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md font-semibold text-[9px] uppercase">
                              {doc.moduleName}
                            </span>
                            <span>•</span>
                            <span>{doc.subject}</span>
                            {doc.grade && (
                              <>
                                <span>•</span>
                                <span>{doc.grade}</span>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-bold">{doc.date}</span>
                          <button
                            onClick={() => onNavigate && onNavigate(doc.module)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Ашу"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Әлі ешқандай материал жоқ</span>
                      <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs leading-normal">
                        Бағдарлама арқылы жаңа БЖБ/ТЖБ немесе сабақ жоспарларын жасаңыз, сонда олар осында көрінеді.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Mini Widgets */}
              <div className="flex flex-col gap-6">
                {/* School Standard Regulations Widget */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-[#2563EB] bg-[#2563EB]/10 px-2.5 py-1 rounded-full w-fit uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Құжат регламенті
                  </span>
                  <h4 className="text-xs font-bold text-slate-800">Нормативтік сәйкестік</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Құралдардың барлық мазмұны ҚР Оқу-ағарту министрлігі бекіткен <strong>МЖББС (2026 жаңартылған мазмұны)</strong> нормалары мен Типтік оқу бағдарламаларына толықтай сәйкес келеді.
                  </p>
                  <div className="border-t border-slate-50 pt-2 flex justify-between items-center text-[10px] text-slate-400">
                    <span>Ағымдағы стандарт:</span>
                    <span className="font-bold text-slate-700">{profile.standardConformity}</span>
                  </div>
                </div>

                {/* Ustaz Tip card */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-6 rounded-2xl border border-amber-100/50 flex flex-col gap-2">
                  <span className="text-[9px] font-extrabold text-amber-800 uppercase tracking-wider bg-amber-100/75 px-2 py-0.5 rounded-md w-fit flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-700 fill-amber-700" /> Нұсқаулық
                  </span>
                  <h4 className="text-xs font-bold text-amber-900">БЖБ/ТЖБ құрастыру кеңесі</h4>
                  <p className="text-[10px] text-amber-800/80 leading-relaxed">
                    Сұрақтар санын арттырғанда Блум таксономиясы деңгейлерін «Барлық деңгейлер» деп таңдау ұсынылады. Бұл оқушылардың білу, қолдану және талдау дағдыларын жан-жақты тексеруге мүмкіндік береді.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Column: Form Info */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Full name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">Аты-жөніңіз (Толық)</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={profile.fullName}
                        onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Position */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">Лауазымыңыз / Санатыңыз</label>
                    <div className="relative">
                      <Award className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={profile.position}
                        onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* School */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">Білім беру мекемесі</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={profile.schoolName}
                        onChange={(e) => setProfile({ ...profile, schoolName: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* City */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-500">Қала / Аймақ</label>
                    <div className="relative">
                      <Database className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={profile.city}
                        onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Subjects Section */}
                <div className="border-t border-slate-100 pt-5 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Оқытатын пәндеріңіз</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.subjects.map((sub, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-lg flex items-center gap-1.5"
                      >
                        {sub}
                        <button 
                          onClick={() => handleRemoveSubject(sub)}
                          className="text-blue-400 hover:text-blue-700 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 max-w-xs mt-1">
                    <input
                      type="text"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="Жаңа пән қосу..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white transition"
                    />
                    <button
                      onClick={handleAddSubject}
                      className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition"
                    >
                      Қосу
                    </button>
                  </div>
                </div>

                {/* Grades Section */}
                <div className="border-t border-slate-100 pt-5 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Оқытатын сыныптарыңыз</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.grades.map((gr, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-lg flex items-center gap-1.5"
                      >
                        {gr}
                        <button 
                          onClick={() => handleRemoveGrade(gr)}
                          className="text-slate-400 hover:text-slate-700 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 max-w-xs mt-1">
                    <input
                      type="text"
                      value={newGrade}
                      onChange={(e) => setNewGrade(e.target.value)}
                      placeholder="Жаңа сынып..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none bg-slate-50 focus:bg-white transition"
                    />
                    <button
                      onClick={handleAddGrade}
                      className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition"
                    >
                      Қосу
                    </button>
                  </div>
                </div>

                {/* Save Profile Button */}
                <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
                  <p className="text-[10px] text-slate-400">Өзгерістер автоматты түрде жаңадан шығарылатын материалдарда көрінеді.</p>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm disabled:bg-blue-400 transition"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Өзгерістерді сақтау
                  </button>
                </div>

                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Профиль сәтті жаңартылды!
                  </motion.div>
                )}

                {saveError && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    {saveError}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Right Column: Profile Sidecard info */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col gap-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  Жеке портфолио мәртебесі
                </h4>
                
                <div className="flex flex-col gap-3 text-xs text-slate-600">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-slate-400">Педагог санаты:</span>
                    <span className="font-bold text-slate-800">Педагог-зерттеуші</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-slate-400">Пәндер саны:</span>
                    <span className="font-bold text-slate-800">{profile.subjects.length} пән</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-slate-400">Сыныптар саны:</span>
                    <span className="font-bold text-slate-800">{profile.grades.length} сынып</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Жалпы дайындамалар:</span>
                    <span className="font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-md">{stats.totalCount} құжат</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Column: Settings Fields */}
            <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col gap-6">
              {/* Theme Select */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Жұмыс беті режимі</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Интерфейстің жарық және қараңғы түстері</p>
                </div>
                
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setProfile({ ...profile, theme: 'light' })}
                    className={`p-1.5 rounded-md cursor-pointer transition ${profile.theme === 'light' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    <Sun className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setProfile({ ...profile, theme: 'dark' })}
                    className={`p-1.5 rounded-md cursor-pointer transition ${profile.theme === 'dark' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                  >
                    <Moon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Autosave Switch */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Автоматты түрде сақтау</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Материалдарды кітапханаға автоматты түрде синхрондау</p>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={profile.autosave}
                    onChange={(e) => setProfile({ ...profile, autosave: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Standards Selection */}
              <div className="flex flex-col gap-1.5 pb-2">
                <label className="text-xs font-bold text-slate-700">Мемлекеттік Оқу стандартының регламенті</label>
                <select
                  value={profile.standardConformity}
                  onChange={(e) => setProfile({ ...profile, standardConformity: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition"
                >
                  <option value="МЖББС (2026 жаңартылған мазмұны)">МЖББС (2026 жаңартылған мазмұны)</option>
                  <option value="Мектепке дейінгі тәрбие стандарты 2026">Мектепке дейінгі тәрбие стандарты 2026</option>
                  <option value="Типтік оқу бағдарламасы 2025">Типтік оқу бағдарламасы 2025</option>
                </select>
              </div>

              {/* Save Settings Trigger */}
              <div className="border-t border-slate-100 pt-5 flex items-center justify-end gap-3">
                {success && (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Сақталды
                  </span>
                )}
                {saveError && (
                  <span className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" /> {saveError}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm disabled:bg-blue-400 transition"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Баптауларды сақтау
                </button>
              </div>
            </div>

            {/* Right Column: Settings Meta */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex flex-col gap-3">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Техникалық қауіпсіздік
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Платформа оқу деректерінің толық қауіпсіздігіне және Қазақстан Республикасының Білім министрлігі бекіткен соңғы оқу жоспарларына, сондай-ақ іс-қағаздарын жүргізу қағидаларына сәйкестігіне кепілдік береді.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
