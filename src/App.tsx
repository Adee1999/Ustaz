/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, Sparkles, Layers, Bot, Award, Heart, HelpCircle, GraduationCap, Menu, X, ChevronRight,
  Folder, User, Calendar, TrendingUp, UserCheck, Settings, Users, FileText, LogOut
} from 'lucide-react';
import BJBConstructor from './components/BJBConstructor';
import LessonPlanner from './components/LessonPlanner';
import AIChatAssistant from './components/AIChatAssistant';
import LibraryView from './components/LibraryView';
import TeacherProfile from './components/TeacherProfile';
import CalendarThematicPlan from './components/CalendarThematicPlan';
import StudentAchievementsReport from './components/StudentAchievementsReport';
import ParentCharacterReference from './components/ParentCharacterReference';
import AuthScreen from './components/AuthScreen';
import { useAuth } from './contexts/AuthContext';

type ActiveModule = 
  | 'bjb' 
  | 'lesson' 
  | 'ktj' 
  | 'achievements' 
  | 'parent-ref' 
  | 'assistant' 
  | 'library' 
  | 'profile' 
  | 'settings';

export default function App() {
  const { user, loading, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<ActiveModule>('bjb');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white animate-pulse">
            <GraduationCap className="w-5.5 h-5.5" />
          </div>
          <p className="text-xs font-bold text-slate-400">Жүктелуде...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col xl:flex-row">
      
      {/* 1. LEFT SIDEBAR (Professional Polish style) */}
      <aside 
        className={`bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 no-print z-50 ${
          sidebarOpen ? 'w-full xl:w-64' : 'w-full xl:w-0 overflow-hidden'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-md shadow-blue-100">
              <GraduationCap className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-lg font-display font-black tracking-tight text-slate-800">Ustaz Studio</h1>
              <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-widest">Педагог орталығы</p>
            </div>
          </div>
          
          <button 
            onClick={() => setSidebarOpen(false)}
            className="xl:hidden p-2 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Modules */}
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">📚 Шеберханалар:</span>
          
          {/* Module: БЖБ / ТЖБ Конструкторы */}
          <button
            onClick={() => { setActiveModule('bjb'); if (window.innerWidth < 1280) setSidebarOpen(false); }}
            className={`w-full text-left px-4 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between transition-all duration-200 cursor-pointer ${
              activeModule === 'bjb' 
              ? 'bg-[#2563EB10] text-[#2563EB] shadow-sm' 
              : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>БЖБ / ТЖБ Конструкторы</span>
            </div>
            <ChevronRight className={`w-3 h-3 transition-transform ${activeModule === 'bjb' ? 'text-[#2563EB] translate-x-0.5' : 'text-slate-400'}`} />
          </button>

          {/* Module: Ашық сабақ материалдары */}
          <button
            onClick={() => { setActiveModule('lesson'); if (window.innerWidth < 1280) setSidebarOpen(false); }}
            className={`w-full text-left px-4 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between transition-all duration-200 cursor-pointer ${
              activeModule === 'lesson' 
              ? 'bg-[#2563EB10] text-[#2563EB] shadow-sm' 
              : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Ашық сабақ материалдары</span>
            </div>
            <ChevronRight className={`w-3 h-3 transition-transform ${activeModule === 'lesson' ? 'text-[#2563EB] translate-x-0.5' : 'text-slate-400'}`} />
          </button>

          {/* Module: Күнтізбелік-тақырыптық жоспар (КТЖ) */}
          <button
            onClick={() => { setActiveModule('ktj'); if (window.innerWidth < 1280) setSidebarOpen(false); }}
            className={`w-full text-left px-4 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between transition-all duration-200 cursor-pointer ${
              activeModule === 'ktj' 
              ? 'bg-[#2563EB10] text-[#2563EB] shadow-sm' 
              : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Күнтізбелік-тақырыптық жоспар (КТЖ)</span>
            </div>
            <ChevronRight className={`w-3 h-3 transition-transform ${activeModule === 'ktj' ? 'text-[#2563EB] translate-x-0.5' : 'text-slate-400'}`} />
          </button>

          {/* Module: Оқушы жетістіктерінің есебі */}
          <button
            onClick={() => { setActiveModule('achievements'); if (window.innerWidth < 1280) setSidebarOpen(false); }}
            className={`w-full text-left px-4 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between transition-all duration-200 cursor-pointer ${
              activeModule === 'achievements' 
              ? 'bg-[#2563EB10] text-[#2563EB] shadow-sm' 
              : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>Оқушы жетістіктерінің есебі</span>
            </div>
            <ChevronRight className={`w-3 h-3 transition-transform ${activeModule === 'achievements' ? 'text-[#2563EB] translate-x-0.5' : 'text-slate-400'}`} />
          </button>

          {/* Module: Ата-анаға мінездеме */}
          <button
            onClick={() => { setActiveModule('parent-ref'); if (window.innerWidth < 1280) setSidebarOpen(false); }}
            className={`w-full text-left px-4 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between transition-all duration-200 cursor-pointer ${
              activeModule === 'parent-ref' 
              ? 'bg-[#2563EB10] text-[#2563EB] shadow-sm' 
              : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Ата-анаға мінездеме</span>
            </div>
            <ChevronRight className={`w-3 h-3 transition-transform ${activeModule === 'parent-ref' ? 'text-[#2563EB] translate-x-0.5' : 'text-slate-400'}`} />
          </button>

          {/* Module: Педагог AI Көмекшісі */}
          <button
            onClick={() => { setActiveModule('assistant'); if (window.innerWidth < 1280) setSidebarOpen(false); }}
            className={`w-full text-left px-4 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between transition-all duration-200 cursor-pointer ${
              activeModule === 'assistant' 
              ? 'bg-[#2563EB10] text-[#2563EB] shadow-sm' 
              : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Bot className="w-3.5 h-3.5 shrink-0 animate-pulse" />
              <span>Педагог AI Көмекшісі</span>
            </div>
            <ChevronRight className={`w-3 h-3 transition-transform ${activeModule === 'assistant' ? 'text-[#2563EB] translate-x-0.5' : 'text-slate-400'}`} />
          </button>

          <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-3 mb-1.5">👤 Жеке кабинет:</span>

          {/* Module: Материалдар кітапханасы */}
          <button
            onClick={() => { setActiveModule('library'); if (window.innerWidth < 1280) setSidebarOpen(false); }}
            className={`w-full text-left px-4 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between transition-all duration-200 cursor-pointer ${
              activeModule === 'library' 
              ? 'bg-[#2563EB10] text-[#2563EB] shadow-sm' 
              : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Folder className="w-3.5 h-3.5 shrink-0" />
              <span>Материалдар кітапханасы</span>
            </div>
            <ChevronRight className={`w-3 h-3 transition-transform ${activeModule === 'library' ? 'text-[#2563EB] translate-x-0.5' : 'text-slate-400'}`} />
          </button>

          {/* Module: Профиль */}
          <button
            onClick={() => { setActiveModule('profile'); if (window.innerWidth < 1280) setSidebarOpen(false); }}
            className={`w-full text-left px-4 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between transition-all duration-200 cursor-pointer ${
              activeModule === 'profile' 
              ? 'bg-[#2563EB10] text-[#2563EB] shadow-sm' 
              : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>Профиль</span>
            </div>
            <ChevronRight className={`w-3 h-3 transition-transform ${activeModule === 'profile' ? 'text-[#2563EB] translate-x-0.5' : 'text-slate-400'}`} />
          </button>

          {/* Module: Баптаулар */}
          <button
            onClick={() => { setActiveModule('settings'); if (window.innerWidth < 1280) setSidebarOpen(false); }}
            className={`w-full text-left px-4 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between transition-all duration-200 cursor-pointer ${
              activeModule === 'settings' 
              ? 'bg-[#2563EB10] text-[#2563EB] shadow-sm' 
              : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span>Баптаулар</span>
            </div>
            <ChevronRight className={`w-3 h-3 transition-transform ${activeModule === 'settings' ? 'text-[#2563EB] translate-x-0.5' : 'text-slate-400'}`} />
          </button>
        </nav>

        {/* Sidebar Generation Limit tracker */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Генерация лимиті</span>
              <span className="text-xs font-bold text-[#2563EB]">85%</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#2563EB] h-1.5 rounded-full transition-all" style={{ width: '85%' }}></div>
            </div>
          </div>
        </div>

        {/* Logged-in teacher + logout */}
        <div className="px-4 pb-3">
          <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-[#2563EB] flex items-center justify-center font-display font-black text-xs shrink-0 uppercase">
                {user.fullName.slice(0, 2)}
              </div>
              <span className="text-[11px] font-bold text-slate-700 truncate">{user.fullName}</span>
            </div>
            <button
              onClick={logout}
              title="Жүйеден шығу"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-5 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>Қазақстан ұстаздарына арналған</span>
          </div>
          <p className="text-[9px] text-slate-400 leading-normal">Платформа толықтай мемлекеттік білім беру стандарттарына сәйкес жасалған.</p>
        </div>
      </aside>

      {/* 2. MAIN BODY WRAPPER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Navigation Top Header Bar (No-print) */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center no-print shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              title="Мәзірді ашу/жабу"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-display font-bold text-slate-800">
                {activeModule === 'bjb' && 'Бөлім бойынша (БЖБ) және тоқсандық (ТЖБ) жиынтық бағалау конструкторы'}
                {activeModule === 'lesson' && 'Кәсіби ашық сабақ жоспарлары мен таратпа жұмыс парақтары'}
                {activeModule === 'ktj' && 'Күнтізбелік-тақырыптық жоспар (КТЖ) конструкторы'}
                {activeModule === 'achievements' && 'Оқушы жетістіктері мен үлгерімінің талдау есебі'}
                {activeModule === 'parent-ref' && 'Ата-анаға арналған оқушы мінездемесі мен кеңестер'}
                {activeModule === 'assistant' && 'Интеллектуалды AI көмекшімен тікелей сұхбат'}
                {activeModule === 'library' && 'Сақталған материалдар мен оқу-әдістемелік жинақ кітапханасы'}
                {activeModule === 'profile' && 'Жеке педагог профилі мен жетістіктері'}
                {activeModule === 'settings' && 'Платформа параметрлері мен жүйелік баптаулар'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-[#2563EB] bg-[#2563EB]/10 px-3 py-1.5 rounded-full border border-blue-100">
              Тегін Қазақша AI
            </span>
          </div>
        </header>

        {/* Work Area Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {activeModule === 'bjb' && <BJBConstructor />}
            {activeModule === 'lesson' && <LessonPlanner />}
            {activeModule === 'ktj' && <CalendarThematicPlan />}
            {activeModule === 'achievements' && <StudentAchievementsReport />}
            {activeModule === 'parent-ref' && <ParentCharacterReference />}
            {activeModule === 'assistant' && <AIChatAssistant />}
            {activeModule === 'library' && <LibraryView />}
            {activeModule === 'profile' && <TeacherProfile initialTab="dashboard" onNavigate={setActiveModule} />}
            {activeModule === 'settings' && <TeacherProfile initialTab="settings" onNavigate={setActiveModule} />}
          </motion.div>
        </main>
      </div>

    </div>
  );
}
