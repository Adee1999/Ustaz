/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Sparkles, AlertCircle, CheckCircle, Download, Copy, Edit3, Trash2, Plus, ArrowRight, Eye, RefreshCw, FileText
} from 'lucide-react';
import { BJBData, BJBQuestion } from '../types';
import { SUBJECTS, GRADES, QUARTERS, BLOOM_LEVELS, DIFFICULTIES, scopedKey } from '../utils';

export default function BJBConstructor() {
  // Form State
  const [assessmentType, setAssessmentType] = useState<'BJB' | 'TJB'>('BJB');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade] = useState(GRADES[5]); // 5-grade default
  const [quarter, setQuarter] = useState(QUARTERS[0]);
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [bloomTaxonomy, setBloomTaxonomy] = useState(BLOOM_LEVELS[4]); // All
  const [difficulty, setDifficulty] = useState(DIFFICULTIES[1]); // Medium

  // App State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<BJBData | null>(null);
  const [savedLists, setSavedLists] = useState<BJBData[]>([]);

  // Editing state
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editMaxScore, setEditMaxScore] = useState(1);
  const [editLevel, setEditLevel] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  // Auto-saved storage loading
  useEffect(() => {
    const saved = localStorage.getItem(scopedKey('ustaz_bjb_saved'));
    if (saved) {
      try {
        setSavedLists(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Loading animations steps
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  const loadingStatuses = [
    'Педагогикалық талаптар мен Мемлекеттік стандарттар (МЖББС) талдануда...',
    'Тақырыпқа сай оқу мақсаттары мен бағалау критерийлері құрастырылуда...',
    'Блум таксономиясы бойынша сұрақтар мен дескрипторлар генерациялануда...',
    'Дұрыс жауап кілті мен ұпай қою кестесі жинақталуда...'
  ];

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Өтініш, БЖБ/ТЖБ тақырыбын немесе бөлімін жазыңыз.');
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setError(null);
    setGeneratedData(null);

    try {
      const response = await fetch('/api/gemini/generate-bjb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          grade,
          quarter,
          topic: assessmentType === 'TJB' ? `[ТЖБ Тоқсандық Бағалау] ${topic}` : topic,
          questionCount,
          bloomTaxonomy,
          difficulty
        })
      });

      if (!response.ok) {
        let errMsg = 'БЖБ генерациялау кезінде қате кетті.';
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
      
      const newBjb: BJBData = {
        id: 'bjb_' + Date.now(),
        subject: data.subject || subject,
        grade: data.grade || grade,
        quarter: data.quarter || quarter,
        topic: data.topic || topic,
        questionCount: Number(questionCount),
        bloomTaxonomy: data.bloomTaxonomy || bloomTaxonomy,
        difficulty: data.difficulty || difficulty,
        questions: data.questions || [],
        criteria: data.criteria || [],
        overallInstructions: data.overallInstructions || 'Нұсқаулық: Барлық тапсырмаларды мұқият оқып шығып, тиісті жауаптарды көрсетіңіз.',
        createdAt: new Date().toLocaleDateString('kk-KZ')
      };

      setGeneratedData(newBjb);
      
      // Save to saved list
      const updatedSaved = [newBjb, ...savedLists];
      setSavedLists(updatedSaved);
      localStorage.setItem(scopedKey('ustaz_bjb_saved'), JSON.stringify(updatedSaved));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Сервермен байланыс үзілді немесе қате орын алды.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestion = (q: BJBQuestion) => {
    setEditingQuestionId(q.number);
    setEditQuestionText(q.question);
    setEditMaxScore(q.maxScore);
    setEditLevel(q.level);
    setEditAnswer(q.answerKey);
  };

  const handleSaveQuestionEdit = () => {
    if (!generatedData) return;
    
    const updatedQuestions = generatedData.questions.map((q) => {
      if (q.number === editingQuestionId) {
        return {
          ...q,
          question: editQuestionText,
          maxScore: Number(editMaxScore),
          level: editLevel,
          answerKey: editAnswer
        };
      }
      return q;
    });

    const updatedData = {
      ...generatedData,
      questions: updatedQuestions
    };

    setGeneratedData(updatedData);
    setEditingQuestionId(null);

    // Save update to local list
    const updatedLists = savedLists.map(item => item.id === generatedData.id ? updatedData : item);
    setSavedLists(updatedLists);
    localStorage.setItem(scopedKey('ustaz_bjb_saved'), JSON.stringify(updatedLists));
  };

  const handleDeleteQuestion = (num: number) => {
    if (!generatedData) return;
    const filtered = generatedData.questions.filter((q) => q.number !== num);
    // Re-index questions
    const reindexed = filtered.map((q, idx) => ({
      ...q,
      number: idx + 1
    }));
    
    const updatedData = {
      ...generatedData,
      questions: reindexed
    };
    setGeneratedData(updatedData);
  };

  const handleAddQuestion = () => {
    if (!generatedData) return;
    const newNum = generatedData.questions.length + 1;
    const newQ: BJBQuestion = {
      id: 'q_' + Date.now(),
      number: newNum,
      question: 'Жаңа тапсырма мәтінін осында енгізіңіз...',
      level: 'Білу және түсіну',
      descriptor: ['Сұрақты оқиды', 'Дұрыс жауапты анықтайды'],
      maxScore: 1,
      answerKey: 'Дұрыс жауап нұсқасы немесе шешуі'
    };

    const updatedData = {
      ...generatedData,
      questions: [...generatedData.questions, newQ]
    };
    setGeneratedData(updatedData);
  };

  const handleCopyText = () => {
    if (!generatedData) return;
    
    let text = `БЖБ / ТЖБ ЖИНАҒЫ\n`;
    text += `Пән: ${generatedData.subject}\n`;
    text += `Сынып: ${generatedData.grade}\n`;
    text += `Тоқсан: ${generatedData.quarter}\n`;
    text += `Тақырып: ${generatedData.topic}\n`;
    text += `Қиындық деңгейі: ${generatedData.difficulty}\n\n`;
    text += `Жалпы нұсқаулық:\n${generatedData.overallInstructions}\n\n`;
    
    text += `Бағалау критерийлері:\n`;
    generatedData.criteria.forEach((c, i) => {
      text += `${i + 1}. ${c}\n`;
    });
    text += `\nТАПСЫРМАЛАР:\n\n`;
    
    generatedData.questions.forEach((q) => {
      text += `${q.number}-тапсырма (${q.level} - Макс: ${q.maxScore} балл)\n`;
      text += `Сұрақ: ${q.question}\n`;
      if (q.options && q.options.length > 0) {
        text += `Нұсқалар:\n` + q.options.map(o => `  ${o}`).join('\n') + '\n';
      }
      text += `Дескрипторлары:\n` + q.descriptor.map(d => `  - ${d}`).join('\n') + '\n';
      text += `Жауабы / Шығарылуы: ${q.answerKey}\n\n`;
    });

    navigator.clipboard.writeText(text);
    alert('Материал мәтіні алмасу буферіне сәтті көшірілді!');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Parameters Panel */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-display font-semibold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Бағалау Жиынтығы
          </h2>
          <p className="text-xs text-slate-400 mt-1">Оқу мақсаттары мен бағдарламаға сай жиынтық бағалау құрастырыңыз</p>
        </div>

        {/* BJB / TJB Tab Switcher */}
        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setAssessmentType('BJB')}
            className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition ${
              assessmentType === 'BJB' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            БЖБ (Бөлімдік)
          </button>
          <button
            onClick={() => setAssessmentType('TJB')}
            className={`py-2 text-xs font-bold rounded-lg cursor-pointer transition ${
              assessmentType === 'TJB' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ТЖБ (Тоқсандық)
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Subject */}
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

          {/* Grade */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Сынып / Топ</label>
              <select 
                value={grade} 
                onChange={(e) => setGrade(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
              >
                {GRADES.map((g, idx) => (
                  <option key={idx} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Quarter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600">Оқу Тоқсаны</label>
              <select 
                value={quarter} 
                onChange={(e) => setQuarter(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
              >
                {QUARTERS.map((q, idx) => (
                  <option key={idx} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Topic */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Бөлім / Тақырып атауы</label>
            <input 
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Мысалы: Квадрат теңдеулер, Табиғат зоналары, Дыбыстар мен әріптер"
              className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
            />
          </div>

          {/* Question Count Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-600">Тапсырмалар саны</label>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{questionCount} сұрақ</span>
            </div>
            <input 
              type="range" 
              min={3} 
              max={15} 
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Bloom Taxonomy */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Блум таксономиясы</label>
            <select 
              value={bloomTaxonomy} 
              onChange={(e) => setBloomTaxonomy(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
            >
              {BLOOM_LEVELS.map((b, idx) => (
                <option key={idx} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Қиындық деңгейі</label>
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
            >
              {DIFFICULTIES.map((d, idx) => (
                <option key={idx} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl border border-red-100 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium text-sm py-3 px-4 rounded-xl shadow-md shadow-blue-100 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
          )}
          {loading ? 'Генерациялануда...' : 'Тапсырмаларды жасау'}
        </button>

        {/* Saved lists list */}
        {savedLists.length > 0 && (
          <div className="border-t border-slate-100 pt-4 mt-2">
            <h3 className="text-xs font-semibold text-slate-500 mb-2">Сақталғандар жинағы:</h3>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
              {savedLists.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setGeneratedData(item)}
                  className={`w-full text-left text-xs p-2.5 rounded-lg border flex flex-col gap-0.5 transition ${
                    generatedData?.id === item.id 
                    ? 'border-blue-500 bg-blue-50/50 text-blue-900' 
                    : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="font-medium truncate">{item.topic}</span>
                  <span className="text-[10px] text-slate-400">{item.subject} • {item.grade}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Output Panel */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white p-12 rounded-2xl shadow-soft border border-slate-100 flex flex-col items-center justify-center text-center min-h-[500px]"
            >
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin" />
                <Sparkles className="w-6 h-6 text-amber-500 animate-bounce absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h3 className="text-lg font-display font-semibold text-slate-800">БЖБ/ТЖБ Материалы жасалуда</h3>
              <p className="text-sm text-slate-500 max-w-md mt-2">Оқу сапасын арттыру мақсатында кәсіби дескрипторлар таңдалуда. Күте тұрыңыз...</p>
              
              {/* Stepper with progress explanation */}
              <div className="mt-8 bg-slate-50 px-6 py-4 rounded-xl border border-slate-100 text-xs text-slate-600 font-medium max-w-md w-full flex items-center justify-center gap-2">
                <span className="animate-pulse">●</span>
                <span>{loadingStatuses[loadingStep]}</span>
              </div>
            </motion.div>
          ) : generatedData ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden flex flex-col"
            >
              {/* Header actions */}
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex flex-wrap justify-between items-center gap-4 no-print">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">Генерация Сәтті Аяқталды</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl cursor-pointer transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Көшіру
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm cursor-pointer transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Баспаға жіберу (PDF)
                  </button>
                </div>
              </div>

              {/* Editable Document Layout */}
              <div id="bjb-print-area" className="p-8 flex flex-col gap-6 text-slate-800">
                {/* School title / branding */}
                <div className="text-center border-b border-slate-100 pb-6">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest font-display">USTAZ STUDIO • ӘДІСТЕМЕЛІК МАТЕРИАЛ</p>
                  <h1 className="text-2xl font-display font-extrabold text-slate-900 mt-1">ЖИЫНТЫҚ БАҒАЛАУ ТАПСЫРМАЛАРЫ</h1>
                  <p className="text-sm text-slate-500 mt-1">Пән: <b>{generatedData.subject}</b> • Сынып: <b>{generatedData.grade}</b> • Тоқсан: <b>{generatedData.quarter}</b></p>
                </div>

                {/* Sub headers details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400">Бөлім/Тақырып:</span>
                    <p className="font-semibold text-slate-700">{generatedData.topic}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Бағалау бағыты:</span>
                    <p className="font-semibold text-slate-700">{generatedData.bloomTaxonomy}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Деңгей:</span>
                    <p className="font-semibold text-slate-700">{generatedData.difficulty}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Жалпы нұсқаулық:</span>
                    <input 
                      type="text" 
                      value={generatedData.overallInstructions}
                      onChange={(e) => setGeneratedData({...generatedData, overallInstructions: e.target.value})}
                      className="w-full font-medium text-slate-700 bg-transparent focus:bg-white border-b border-transparent focus:border-slate-300 outline-none"
                    />
                  </div>
                </div>

                {/* Criteria */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-2 border-l-2 border-blue-500 pl-2">Бағалау критерийлері:</h3>
                  <ul className="list-disc list-inside text-xs text-slate-600 flex flex-col gap-1 pl-1">
                    {generatedData.criteria.map((c, i) => (
                      <li key={i}>
                        <input
                          type="text"
                          value={c}
                          onChange={(e) => {
                            const updated = [...generatedData.criteria];
                            updated[i] = e.target.value;
                            setGeneratedData({...generatedData, criteria: updated});
                          }}
                          className="bg-transparent hover:bg-slate-50 border-b border-transparent focus:border-slate-300 focus:bg-white outline-none w-[90%] inline-block px-1"
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tasks loop */}
                <div className="flex flex-col gap-6 mt-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Тапсырмалар жинағы
                    </h3>
                    <button
                      onClick={handleAddQuestion}
                      className="no-print text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Тапсырма қосу
                    </button>
                  </div>

                  {generatedData.questions.map((q, idx) => (
                    <div 
                      key={q.number}
                      className="group relative border border-slate-100 hover:border-blue-100 p-5 rounded-xl transition hover:shadow-sm"
                    >
                      {/* Action buttons on hover */}
                      <div className="no-print absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleEditQuestion(q)}
                          className="p-1 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded transition cursor-pointer"
                          title="Өңдеу"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.number)}
                          className="p-1 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded transition cursor-pointer"
                          title="Өшіру"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Header line */}
                      <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                        <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                          {q.number}-Тапсырма
                        </span>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>Деңгейі: <b className="text-slate-600">{q.level}</b></span>
                          <span>Ұпай: <b className="text-slate-600">{q.maxScore} балл</b></span>
                        </div>
                      </div>

                      {/* Editing panel inline */}
                      {editingQuestionId === q.number ? (
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-3 flex flex-col gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500">Сұрақ / Тапсырма мәтіні</label>
                            <textarea
                              value={editQuestionText}
                              onChange={(e) => setEditQuestionText(e.target.value)}
                              rows={3}
                              className="w-full text-sm border border-slate-300 rounded p-2 bg-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500">Максималды балл</label>
                              <input
                                type="number"
                                value={editMaxScore}
                                onChange={(e) => setEditMaxScore(Number(e.target.value))}
                                className="w-full text-sm border border-slate-300 rounded p-1.5 bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500">Таксономия деңгейі</label>
                              <input
                                type="text"
                                value={editLevel}
                                onChange={(e) => setEditLevel(e.target.value)}
                                className="w-full text-sm border border-slate-300 rounded p-1.5 bg-white"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-500">Шешуі / Дұрыс жауабы</label>
                            <input
                              type="text"
                              value={editAnswer}
                              onChange={(e) => setEditAnswer(e.target.value)}
                              className="w-full text-sm border border-slate-300 rounded p-2 bg-white"
                            />
                          </div>
                          <div className="flex justify-end gap-2 mt-1">
                            <button
                              onClick={() => setEditingQuestionId(null)}
                              className="text-xs text-slate-500 hover:text-slate-700 bg-slate-200 px-3 py-1.5 rounded cursor-pointer"
                            >
                              Болдырмау
                            </button>
                            <button
                              onClick={handleSaveQuestionEdit}
                              className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded cursor-pointer"
                            >
                              Сақтау
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-line mb-3">
                          {q.question}
                        </p>
                      )}

                      {/* Descriptors */}
                      <div className="bg-slate-50/50 p-3 rounded-lg border border-dashed border-slate-100 text-xs text-slate-600 flex flex-col gap-1">
                        <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider">Дескрипторлар:</span>
                        <div className="flex flex-col gap-1">
                          {q.descriptor.map((desc, dIdx) => (
                            <div key={dIdx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                              <input
                                type="text"
                                value={desc}
                                onChange={(e) => {
                                  const updatedQuestions = [...generatedData.questions];
                                  updatedQuestions[idx].descriptor[dIdx] = e.target.value;
                                  setGeneratedData({...generatedData, questions: updatedQuestions});
                                }}
                                className="bg-transparent hover:bg-slate-50 border-b border-transparent focus:border-slate-300 focus:bg-white outline-none w-full py-0.5"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Answers key block */}
                <div className="border-t border-slate-100 pt-6 mt-4">
                  <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-2 border-emerald-500 pl-2">
                    Жауаптар кілті және бағалау шкаласы:
                  </h3>
                  <div className="flex flex-col gap-3 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/50">
                    {generatedData.questions.map((q) => (
                      <div key={q.number} className="text-xs">
                        <p className="font-bold text-slate-700">{q.number}-тапсырма жауабы:</p>
                        <p className="text-slate-600 mt-0.5 pl-1">{q.answerKey}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-12 rounded-2xl shadow-soft border border-slate-100 flex flex-col items-center justify-center text-center min-h-[500px]"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-display font-semibold text-slate-800">БЖБ/ТЖБ Материалдары Дайын Емес</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-2">Параметрлерді таңдап, "Тапсырмаларды жасау" батырмасын басыңыз.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
