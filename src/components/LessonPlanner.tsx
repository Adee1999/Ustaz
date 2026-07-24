/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Sparkles, AlertCircle, CheckCircle, Download, Copy, Edit3, Trash2, Plus, 
  ArrowRight, Play, LayoutGrid, CheckSquare, RefreshCw, Layers, Printer, Calendar, BookOpen, Users, HelpCircle
} from 'lucide-react';
import { LessonPlanData } from '../types';
import { SUBJECTS, GRADES, scopedKey } from '../utils';

type PlannerType = 'qmj' | 'umj' | 'tarbie' | 'balabaqsha';

interface UniversalPlanData {
  id: string;
  type: PlannerType;
  subject: string;
  grade: string;
  topic: string;
  // KMJ detailed fields
  objectives?: string[];
  learningOutcomes?: string[];
  warmUp?: string;
  mainLesson?: string;
  reflection?: string;
  homework?: string;
  assessment?: string;
  presentationOutline?: string[];
  worksheets?: string[];
  // UMJ / Tarbie / Balabaqsha HTML fields
  title?: string;
  contentHtml?: string;
  createdAt: string;
}

export default function LessonPlanner() {
  const [plannerType, setPlannerType] = useState<PlannerType>('qmj');
  
  // Form parameters
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade] = useState(GRADES[5]); // 5-grade default
  const [topic, setTopic] = useState('');
  
  // States
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'presentation' | 'worksheets' | 'html'>('plan');
  
  // Generated and history states
  const [generatedPlan, setGeneratedPlan] = useState<UniversalPlanData | null>(null);
  const [savedPlans, setSavedPlans] = useState<UniversalPlanData[]>([]);

  // Loading stepper
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  // Loading texts based on planner type
  const loadingStatuses = {
    qmj: [
      'Мемлекеттік білім беру стандартына (МЖББС) сай оқу мақсаттары талдануда...',
      'Интерактивті ойындар, миға шабуыл және сергіту сәттері құрылуда...',
      'Сабаққа қажетті көрнекіліктер, слайдтар мен презентация жоспары жасалуда...',
      'Қалыптастырушы бағалау критерийлері мен жұмыс парақтары жинақталуда...'
    ],
    umj: [
      'Жылдық оқу жоспарының құрылымы мен тоқсандық бөлімдері реттелуде...',
      'Тақырыптардың логикалық жүйелілігі мен сағат сандары есептелуде...',
      'Әр бөлімге сай оқу мақсаттары мен күтілетін нәтижелер үйлестірілуде...',
      'Ұзақ мерзімді жылдық жоспарлау кестесі мемлекеттік нұсқаулыққа сай жинақталуда...'
    ],
    tarbie: [
      'Тәрбие сағатының бағыты мен адамгершілік-рухани құндылықтары анықталуда...',
      'Қызықты сценарий, пікірталас сұрақтары мен топтық тапсырмалар дайындалуда...',
      'Көрнекілік материалдар тізімі мен рефлексиялық жаттығулар таңдалуда...',
      'Мұғалім мен оқушының белсенді іс-әрекетіне негізделген сценарий құрастырылуда...'
    ],
    balabaqsha: [
      'Мектепке дейінгі тәрбие мен оқыту стандартына сай міндеттер айқындалуда...',
      'Дамытушы ойындар, шығармашылық жұмыстар мен сергіту жаттығулары құрылуда...',
      'Балалардың жас ерекшелігіне сай көрнекіліктер мен дидактикалық құралдар таңдалуда...',
      'Қауіпсіздік ережелері мен гигиеналық талаптарды қамтитын жоспар дайындалуда...'
    ]
  }[plannerType];

  // Reset active sub-tab on plannerType change
  useEffect(() => {
    if (plannerType === 'qmj') {
      setActiveTab('plan');
    } else {
      setActiveTab('html');
    }
    setError(null);
  }, [plannerType]);

  // Load plans from local storage
  useEffect(() => {
    const saved = localStorage.getItem(scopedKey('ustaz_plans_saved'));
    if (saved) {
      try {
        setSavedPlans(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // AI Planner generation
  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Өтініш, жоспардың тақырыбын немесе бөлімін жазыңыз.');
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setError(null);
    setGeneratedPlan(null);

    try {
      if (plannerType === 'qmj') {
        // Call short-term lesson plan builder
        const response = await fetch('/api/gemini/generate-lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, grade, topic })
        });

        if (!response.ok) {
          let errMsg = 'ҚМЖ жасау кезінде қате орын алды.';
          try {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
          } catch (e) {
            try {
              const errText = await response.text();
              if (errText) {
                errMsg = `${errMsg} (${errText.slice(0, 150)})`;
              }
            } catch (_) {}
          }
          throw new Error(errMsg);
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          throw new Error('Сервер жауабын оқу мүмкін болмады (JSON емес формат).');
        }
        
        const newPlan: UniversalPlanData = {
          id: 'plan_' + Date.now(),
          type: 'qmj',
          subject: data.subject || subject,
          grade: data.grade || grade,
          topic: data.topic || topic,
          objectives: data.objectives || [],
          learningOutcomes: data.learningOutcomes || [],
          warmUp: data.warmUp || '',
          mainLesson: data.mainLesson || '',
          reflection: data.reflection || '',
          homework: data.homework || '',
          assessment: data.assessment || '',
          presentationOutline: data.presentationOutline || [],
          worksheets: data.worksheets || [],
          createdAt: new Date().toLocaleDateString('kk-KZ')
        };

        setGeneratedPlan(newPlan);
        savePlanToLocalStorage(newPlan);
      } else {
        // Call universal document builder for umj, tarbie, balabaqsha
        const response = await fetch('/api/gemini/generate-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docType: plannerType,
            params: { subject, grade, topic }
          })
        });

        if (!response.ok) {
          let errMsg = 'Жоспар генерациясы сәтсіз аяқталды.';
          try {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
          } catch (e) {
            try {
              const errText = await response.text();
              if (errText) {
                errMsg = `${errMsg} (${errText.slice(0, 150)})`;
              }
            } catch (_) {}
          }
          throw new Error(errMsg);
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonErr) {
          throw new Error('Сервер жауабын оқу мүмкін болмады (JSON емес формат).');
        }

        const newPlan: UniversalPlanData = {
          id: 'plan_' + Date.now(),
          type: plannerType,
          subject: subject,
          grade: grade,
          topic: topic,
          title: data.title || topic.toUpperCase(),
          contentHtml: data.contentHtml || '',
          createdAt: new Date().toLocaleDateString('kk-KZ')
        };

        setGeneratedPlan(newPlan);
        savePlanToLocalStorage(newPlan);
      }
      
      setSuccess('Сабақ материалдары сәтті дайындалды!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Сервермен байланыс үзілді немесе қате орын алды.');
    } finally {
      setLoading(false);
    }
  };

  // Save to LocalStorage
  const savePlanToLocalStorage = (plan: UniversalPlanData) => {
    try {
      const updatedSaved = [plan, ...savedPlans];
      setSavedPlans(updatedSaved);
      localStorage.setItem(scopedKey('ustaz_plans_saved'), JSON.stringify(updatedSaved));

      // Also sync to central document library
      const savedDocsStr = localStorage.getItem(scopedKey('ustaz_saved_documents'));
      let savedDocs: any[] = savedDocsStr ? JSON.parse(savedDocsStr) : [];
      
      const typeNames: Record<string, string> = {
        qmj: 'Қысқа мерзімді жоспар (ҚМЖ)',
        umj: 'Ұзақ мерзімді жоспар (ҰМЖ)',
        tarbie: 'Тәрбие сағаты',
        balabaqsha: 'Балабақша жоспары'
      };

      const docPayload = {
        id: plan.id,
        title: plan.topic,
        module: plan.type,
        moduleName: typeNames[plan.type],
        recipientName: plan.grade,
        description: plan.type === 'qmj' ? (plan.objectives?.join(', ') || '') : (plan.title || ''),
        organization: plan.subject,
        signeeTitle: 'Ұстаз',
        signeeName: 'Менің жобам',
        docNumber: `№ LP-${Date.now().toString().slice(-6)}`,
        date: plan.createdAt,
        contentHtml: plan.contentHtml || '',
        isFavorite: false,
        createdAt: new Date().toISOString()
      };

      savedDocs.unshift(docPayload);
      localStorage.setItem(scopedKey('ustaz_saved_documents'), JSON.stringify(savedDocs));
    } catch (e) {
      console.error(e);
    }
  };

  // Export as Word Document (.doc formatting)
  const handleExportWord = () => {
    if (!generatedPlan) return;

    try {
      let content = '';
      if (generatedPlan.type === 'qmj') {
        content = `
          <h2>САБАҚ ЖОСПАРЫ: ${generatedPlan.topic}</h2>
          <p><b>Пән:</b> ${generatedPlan.subject} | <b>Сынып:</b> ${generatedPlan.grade}</p>
          <hr/>
          <h3>І. Сабақ мақсаттары</h3>
          <ul>${generatedPlan.objectives?.map(o => `<li>${o}</li>`).join('')}</ul>
          
          <h3>ІІ. Күтілетін нәтижелер</h3>
          <ul>${generatedPlan.learningOutcomes?.map(l => `<li>${l}</li>`).join('')}</ul>
          
          <h3>ІІІ. Сабақ барысы</h3>
          <p><b>1. Ұйымдастыру / Миға шабуыл:</b><br/>${generatedPlan.warmUp?.replace(/\n/g, '<br/>')}</p>
          <p><b>2. Негізгі бөлім:</b><br/>${generatedPlan.mainLesson?.replace(/\n/g, '<br/>')}</p>
          <p><b>3. Рефлексия:</b><br/>${generatedPlan.reflection?.replace(/\n/g, '<br/>')}</p>
          
          <h3>ІV. Үй тапсырмасы</h3>
          <p>${generatedPlan.homework?.replace(/\n/g, '<br/>')}</p>
          
          <h3>V. Бағалау критерийлері</h3>
          <p>${generatedPlan.assessment?.replace(/\n/g, '<br/>')}</p>
        `;
      } else {
        content = `
          <h2>${generatedPlan.title}</h2>
          <p><b>Пән/Бағыт:</b> ${generatedPlan.subject} | <b>Сынып/Топ:</b> ${generatedPlan.grade}</p>
          <hr/>
          <div>${generatedPlan.contentHtml}</div>
        `;
      }

      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
            "xmlns:w='urn:schemas-microsoft-com:office:word' "+
            "xmlns='http://www.w3.org/TR/REC-html40'>"+
            "<head><title>Document</title><style>body { font-family: 'Times New Roman', serif; }</style></head><body>";
      const footer = "</body></html>";
      
      const formattedHtml = header + content + footer;
      const blob = new Blob(['\ufeff' + formattedHtml], {
        type: 'application/msword'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedPlan.type.toUpperCase()}_${generatedPlan.topic.replace(/\s+/g, '_')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setSuccess('Word (DOC) құжаты жүктелді!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Word-қа экспорттау кезінде қате кетті.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (!generatedPlan) return;
    let text = '';
    if (generatedPlan.type === 'qmj') {
      text = `ҚМЖ: ${generatedPlan.topic}\nПән: ${generatedPlan.subject}\nСынып: ${generatedPlan.grade}\n\n`;
      text += `Мақсаттары:\n` + generatedPlan.objectives?.map(o => `  - ${o}`).join('\n') + `\n\n`;
      text += `Қызығушылық ояту:\n${generatedPlan.warmUp}\n\n`;
      text += `Негізгі бөлім:\n${generatedPlan.mainLesson}\n\n`;
      text += `Үй тапсырмасы: ${generatedPlan.homework}\n`;
    } else {
      text = `${generatedPlan.title}\nПән: ${generatedPlan.subject}\nСынып: ${generatedPlan.grade}\n\n`;
      // strip html
      text += generatedPlan.contentHtml?.replace(/<[^>]*>/g, '') || '';
    }
    navigator.clipboard.writeText(text);
    setSuccess('Сабақ жоспары буферге көшірілді!');
    setTimeout(() => setSuccess(null), 2500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* LEFT PARAMETERS SECTION */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col gap-6 no-print">
        
        {/* Planner Type Selector */}
        <div>
          <h2 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Жоспарлаушы түрі
          </h2>
          <p className="text-xs text-slate-400 mt-1">Оқу жоспарлары мен тәрбие материалдарының конструкторы</p>
          
          <div className="grid grid-cols-2 gap-2 mt-4">
            {[
              { type: 'qmj', label: 'ҚМЖ (Қысқа мерзімді)', desc: 'Күнделікті сабақ жоспары' },
              { type: 'umj', label: 'ҰМЖ (Ұзақ мерзімді)', desc: 'Жылдық бағдарлама' },
              { type: 'tarbie', label: 'Тәрбие сағаты', desc: 'Сынып сағаты сценариі' },
              { type: 'balabaqsha', label: 'Балабақша жоспары', desc: 'Ересектер мен кіші топтар' }
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => setPlannerType(item.type as PlannerType)}
                className={`p-3 text-left rounded-xl border flex flex-col gap-1 transition cursor-pointer ${
                  plannerType === item.type 
                    ? 'border-blue-500 bg-blue-50/40 text-blue-600 font-bold' 
                    : 'border-slate-100 hover:border-slate-200 text-slate-500'
                }`}
              >
                <span className="text-xs font-bold leading-tight">{item.label}</span>
                <span className="text-[9px] text-slate-400 font-normal leading-normal">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input parameters form */}
        <div className="flex flex-col gap-4 border-t border-slate-100 pt-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Параметрлерді баптау</h3>

          {/* Subject Selector */}
          {plannerType !== 'balabaqsha' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Оқу Пәні</label>
              <select 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
              >
                {SUBJECTS.map((sub, idx) => (
                  <option key={idx} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}

          {/* Grade Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">
              {plannerType === 'balabaqsha' ? 'Жас тобы' : 'Сынып / Деңгей'}
            </label>
            <select 
              value={grade} 
              onChange={(e) => setGrade(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
            >
              {plannerType === 'balabaqsha' ? (
                <>
                  <option value="Балабақша (Кіші топ)">Кіші топ (2-3 жас)</option>
                  <option value="Балабақша (Ортаңғы топ)">Ортаңғы топ (3-4 жас)</option>
                  <option value="Балабақша (Ересек топ)">Ересек топ (4-5 жас)</option>
                  <option value="Мектеп алды даярлық">Даярлық топ (5-6 жас)</option>
                </>
              ) : (
                GRADES.filter(g => !g.includes('Кіші')).map((g, idx) => (
                  <option key={idx} value={g}>{g}</option>
                ))
              )}
            </select>
          </div>

          {/* Topic / Objective Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">
              {plannerType === 'qmj' && 'Сабақтың тақырыбы'}
              {plannerType === 'umj' && 'ҰМЖ Бөлімі немесе Жылдық бағыт'}
              {plannerType === 'tarbie' && 'Тәрбие сағатының тақырыбы'}
              {plannerType === 'balabaqsha' && 'Ұйымдастырылған оқу қызметінің тақырыбы'}
            </label>
            <input 
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                plannerType === 'qmj' ? 'Мысалы: Күн жүйесінің құрылымы, Сын есім' :
                plannerType === 'umj' ? 'Мысалы: 7-сынып математика пәнінің жылдық жоспары' :
                plannerType === 'tarbie' ? 'Мысалы: Отанды сүю - бабалар аманаты' :
                'Мысалы: Құстар - біздің қанатты достарымыз'
              }
              className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
            />
          </div>

        </div>

        {/* Generate Trigger Button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-blue-100 disabled:bg-blue-300 disabled:shadow-none"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          Жоспар құру (AI генерация)
        </button>

      </div>

      {/* RIGHT PREVIEW & RESULTS AREA */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        
        {/* Loading and Steppers */}
        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white p-8 rounded-2xl border border-slate-100 shadow-soft flex flex-col items-center justify-center text-center gap-4 min-h-[450px]"
            >
              <div className="w-16 h-16 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin"></div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Педагогикалық AI материалды жинақтауда...</h3>
                <p className="text-xs text-blue-600 font-semibold animate-pulse mt-2 max-w-md mx-auto">
                  {loadingStatuses[loadingStep]}
                </p>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[0, 1, 2, 3].map((s) => (
                  <div key={s} className={`w-2.5 h-1.5 rounded-full transition-all duration-300 ${s === loadingStep ? 'bg-blue-600 w-6' : 'bg-slate-200'}`} />
                ))}
              </div>
            </motion.div>
          )}

          {!loading && error && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="bg-red-50 border border-red-100 p-4 rounded-xl text-xs font-bold text-red-600"
            >
              Қателік орын алды: {error}
            </motion.div>
          )}

          {!loading && success && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-xs font-bold text-emerald-600 no-print"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Display Material Outputs */}
        {!loading && generatedPlan && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 flex flex-col gap-6"
          >
            {/* Action Bar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 no-print">
              <div>
                <h3 className="text-lg font-display font-semibold text-slate-800 uppercase tracking-tight">
                  {generatedPlan.type === 'qmj' ? 'Қысқа мерзімді жоспар дайын' : generatedPlan.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Пән: {generatedPlan.subject} | Топ: {generatedPlan.grade}
                </p>
              </div>

              {/* Utility Export Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-2.5 rounded-xl border border-slate-100 cursor-pointer text-xs font-bold flex items-center gap-1.5 transition"
                  title="Мәтінді көшіру"
                >
                  <Copy className="w-4 h-4 text-blue-600" />
                  Көшіру
                </button>
                <button
                  onClick={handleExportWord}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-2.5 rounded-xl border border-emerald-100 cursor-pointer text-xs font-bold flex items-center gap-1.5 transition"
                  title="Word-қа жүктеу"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  Word
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-slate-800 hover:bg-slate-900 text-white p-2.5 rounded-xl cursor-pointer text-xs font-bold flex items-center gap-1.5 transition"
                  title="Баспаға шығару"
                >
                  <Printer className="w-4 h-4" />
                  Баспа (Print)
                </button>
              </div>
            </div>

            {/* Tab switchers for detailed KMJ */}
            {generatedPlan.type === 'qmj' && (
              <div className="flex border-b border-slate-100 no-print">
                <button
                  onClick={() => setActiveTab('plan')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                    activeTab === 'plan' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Сабақ барысы
                </button>
                <button
                  onClick={() => setActiveTab('presentation')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                    activeTab === 'presentation' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Презентация жоспары
                </button>
                <button
                  onClick={() => setActiveTab('worksheets')}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
                    activeTab === 'worksheets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Таратпа жұмыс парақтары
                </button>
              </div>
            )}

            {/* PRINT & PREVIEW CANVAS SHEET */}
            <div 
              id="document-print-area" 
              className="p-8 border border-slate-100 bg-slate-50/20 rounded-2xl select-text"
              style={{ fontFamily: '"Times New Roman", serif' }}
            >
              {/* RENDERING KMJ PLAN */}
              {generatedPlan.type === 'qmj' && activeTab === 'plan' && (
                <div className="flex flex-col gap-6 text-sm text-slate-800 leading-relaxed">
                  <div className="text-center font-bold text-base mb-2 uppercase">
                    Сабақ жоспары (Қысқа мерзімді)
                  </div>
                  
                  {/* Metadata header */}
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <p><b>Пән:</b> {generatedPlan.subject}</p>
                      <p><b>Сынып:</b> {generatedPlan.grade}</p>
                    </div>
                    <div className="text-right">
                      <p><b>Тақырыбы:</b> {generatedPlan.topic}</p>
                      <p><b>Уақыты:</b> {generatedPlan.createdAt}</p>
                    </div>
                  </div>

                  {/* Objectives */}
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm mb-1 uppercase">І. Сабақ Мақсаттары (МЖББС бойынша):</h4>
                    <ul className="list-disc pl-5 flex flex-col gap-0.5">
                      {generatedPlan.objectives?.map((o, idx) => (
                        <li key={idx}>
                          <input 
                            type="text" 
                            value={o} 
                            onChange={(e) => {
                              const updated = [...(generatedPlan.objectives || [])];
                              updated[idx] = e.target.value;
                              setGeneratedPlan({ ...generatedPlan, objectives: updated });
                            }}
                            className="w-full bg-transparent hover:bg-slate-50 border-b border-transparent focus:border-slate-300 outline-none py-0.5"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Outcomes */}
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm mb-1 uppercase">ІІ. Күтілетін Нәтижелер:</h4>
                    <ul className="list-disc pl-5 flex flex-col gap-0.5">
                      {generatedPlan.learningOutcomes?.map((o, idx) => (
                        <li key={idx}>
                          <input 
                            type="text" 
                            value={o} 
                            onChange={(e) => {
                              const updated = [...(generatedPlan.learningOutcomes || [])];
                              updated[idx] = e.target.value;
                              setGeneratedPlan({ ...generatedPlan, learningOutcomes: updated });
                            }}
                            className="w-full bg-transparent hover:bg-slate-50 border-b border-transparent focus:border-slate-300 outline-none py-0.5"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Warmup / Introduction */}
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm mb-1 uppercase">ІІІ. Ұйымдастыру кезеңі және қызығушылық ояту (Миға шабуыл):</h4>
                    <textarea
                      rows={4}
                      value={generatedPlan.warmUp}
                      onChange={(e) => setGeneratedPlan({ ...generatedPlan, warmUp: e.target.value })}
                      className="w-full bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded p-1 focus:border-slate-300 outline-none font-sans text-xs"
                    />
                  </div>

                  {/* Main Lesson Content */}
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm mb-1 uppercase">ІV. Жаңа сабақты түсіндіру және Тапсырмалар жинағы (Негізгі бөлім):</h4>
                    <textarea
                      rows={10}
                      value={generatedPlan.mainLesson}
                      onChange={(e) => setGeneratedPlan({ ...generatedPlan, mainLesson: e.target.value })}
                      className="w-full bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded p-1 focus:border-slate-300 outline-none font-sans text-xs"
                    />
                  </div>

                  {/* Reflection */}
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm mb-1 uppercase">V. Сабақты бекіту, Рефлексия және Кері байланыс:</h4>
                    <textarea
                      rows={4}
                      value={generatedPlan.reflection}
                      onChange={(e) => setGeneratedPlan({ ...generatedPlan, reflection: e.target.value })}
                      className="w-full bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded p-1 focus:border-slate-300 outline-none font-sans text-xs"
                    />
                  </div>

                  {/* Homework */}
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
                    <div>
                      <h4 className="font-bold text-blue-900 text-sm mb-1 uppercase">VІ. Үй тапсырмасы:</h4>
                      <textarea
                        rows={3}
                        value={generatedPlan.homework}
                        onChange={(e) => setGeneratedPlan({ ...generatedPlan, homework: e.target.value })}
                        className="w-full bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded p-1 focus:border-slate-300 outline-none font-sans text-xs"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-900 text-sm mb-1 uppercase">VІІ. Қалыптастырушы бағалау критерийлері:</h4>
                      <textarea
                        rows={3}
                        value={generatedPlan.assessment}
                        onChange={(e) => setGeneratedPlan({ ...generatedPlan, assessment: e.target.value })}
                        className="w-full bg-transparent hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded p-1 focus:border-slate-300 outline-none font-sans text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* RENDERING PRESENTATION OUTLINE */}
              {generatedPlan.type === 'qmj' && activeTab === 'presentation' && (
                <div className="flex flex-col gap-4 text-sm text-slate-800 leading-relaxed">
                  <h4 className="font-bold text-blue-950 text-sm border-b border-slate-200 pb-2 mb-2 uppercase">
                    Көрнекі Слайдтар құрылымы мен мазмұны:
                  </h4>
                  {generatedPlan.presentationOutline?.map((slide, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-4">
                      <span className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <textarea
                        rows={2}
                        value={slide}
                        onChange={(e) => {
                          const updated = [...(generatedPlan.presentationOutline || [])];
                          updated[idx] = e.target.value;
                          setGeneratedPlan({ ...generatedPlan, presentationOutline: updated });
                        }}
                        className="w-full bg-transparent hover:bg-white border border-transparent hover:border-slate-200 rounded p-1 focus:border-slate-300 outline-none text-xs font-sans"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* RENDERING WORKSHEETS */}
              {generatedPlan.type === 'qmj' && activeTab === 'worksheets' && (
                <div className="flex flex-col gap-4 text-sm text-slate-800 leading-relaxed">
                  <h4 className="font-bold text-blue-950 text-sm border-b border-slate-200 pb-2 mb-2 uppercase">
                    Дидактикалық жұмыс парақтары мен тапсырмалары:
                  </h4>
                  {generatedPlan.worksheets?.map((sheet, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-2">
                      <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Тапсырма {idx + 1}:</span>
                      <textarea
                        rows={4}
                        value={sheet}
                        onChange={(e) => {
                          const updated = [...(generatedPlan.worksheets || [])];
                          updated[idx] = e.target.value;
                          setGeneratedPlan({ ...generatedPlan, worksheets: updated });
                        }}
                        className="w-full bg-transparent hover:bg-white border border-transparent hover:border-slate-200 rounded p-1 focus:border-slate-300 outline-none text-xs font-sans"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* RENDERING HTML CONTENT (FOR UMJ, TARBIE, BALABAQSHA) */}
              {generatedPlan.type !== 'qmj' && (
                <div className="text-slate-800 text-sm leading-relaxed">
                  {/* Render raw html from Gemini with basic styles */}
                  <div 
                    className="prose max-w-none text-slate-800"
                    dangerouslySetInnerHTML={{ __html: generatedPlan.contentHtml || '' }}
                    style={{
                      fontFamily: '"Times New Roman", serif',
                    }}
                  />
                </div>
              )}

            </div>
          </motion.div>
        )}

        {/* Empty state when no generation has occurred */}
        {!loading && !generatedPlan && (
          <div className="bg-white p-12 rounded-2xl shadow-soft border border-slate-100 flex flex-col items-center justify-center text-center min-h-[500px]">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-display font-semibold text-slate-800">Сабақ жоспарлау материалдары дайын емес</h3>
            <p className="text-sm text-slate-500 max-w-sm mt-2">
              Сол жақтағы жоспар түрін (ҚМЖ, ҰМЖ, Тәрбие, Балабақша) таңдап, тақырыпты енгізіңіз және "Жоспар құру" батырмасын басыңыз.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
