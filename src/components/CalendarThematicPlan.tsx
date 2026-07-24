/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, FileText, Download, Plus, Trash2, Edit2, Check, Copy, RefreshCw, Sparkles, Printer, ArrowRight 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SUBJECTS, GRADES, scopedKey } from '../utils';

interface Topic {
  lessonNumber: number;
  topic: string;
  hours: number;
  learningObjectives: string;
  section: string;
}

interface Quarter {
  quarterName: string;
  topics: Topic[];
}

interface KTJData {
  title: string;
  subject: string;
  grade: string;
  schoolYear: string;
  weeklyHours: string;
  curriculum: string;
  quarters: Quarter[];
}

export default function CalendarThematicPlan() {
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade] = useState(GRADES[5]); // 5-сынып by default
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [weeklyHours, setWeeklyHours] = useState('2');
  const [curriculum, setCurriculum] = useState('Үлгілік оқу жоспары (Жаңартылған мазмұн)');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<KTJData | null>(null);
  
  // Inline editing state
  const [editingIndex, setEditingIndex] = useState<{ quarterIdx: number; topicIdx: number } | null>(null);
  const [editTopic, setEditTopic] = useState<string>('');
  const [editObjectives, setEditObjectives] = useState<string>('');
  const [editHours, setEditHours] = useState<number>(1);
  const [editSection, setEditSection] = useState<string>('');

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setGeneratedData(null);

    try {
      const response = await fetch('/api/gemini/generate-ktj', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          grade,
          schoolYear,
          weeklyHours,
          curriculum
        }),
      });

      if (!response.ok) {
        let errMsg = 'Серверден КТЖ жасау кезінде қате кетті.';
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
      setGeneratedData(data);
      setSuccess('КТЖ жоспары сәтті жасалды!');
      setTimeout(() => setSuccess(null), 3000);

      // Save to library as central document
      saveToLibrary(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Жоспар құру сәтсіз аяқталды.');
    } finally {
      setLoading(false);
    }
  };

  const saveToLibrary = (data: KTJData) => {
    try {
      const savedDocsStr = localStorage.getItem(scopedKey('ustaz_saved_documents'));
      let savedDocs: any[] = savedDocsStr ? JSON.parse(savedDocsStr) : [];
      
      const payload = {
        id: 'ktj_' + Date.now(),
        title: `${data.title || 'Күнтізбелік-тақырыптық жоспар'} (${data.subject})`,
        module: 'qmj', // Map to lesson category in library
        moduleName: 'Күнтізбелік-тақырыптық жоспар (КТЖ)',
        recipientName: data.grade,
        description: `${data.schoolYear} оқу жылы. Апталық сағат саны: ${data.weeklyHours}. Бағдарлама: ${data.curriculum}`,
        organization: data.subject,
        date: new Date().toLocaleDateString('kk-KZ'),
        isFavorite: false,
        createdAt: new Date().toISOString()
      };

      savedDocs.push(payload);
      localStorage.setItem(scopedKey('ustaz_saved_documents'), JSON.stringify(savedDocs));
    } catch (e) {
      console.error('Error saving to library:', e);
    }
  };

  const startEditing = (quarterIdx: number, topicIdx: number, topic: Topic) => {
    setEditingIndex({ quarterIdx, topicIdx });
    setEditTopic(topic.topic);
    setEditObjectives(topic.learningObjectives);
    setEditHours(topic.hours);
    setEditSection(topic.section);
  };

  const saveEdit = () => {
    if (!generatedData || !editingIndex) return;
    const { quarterIdx, topicIdx } = editingIndex;

    const updatedQuarters = [...generatedData.quarters];
    updatedQuarters[quarterIdx].topics[topicIdx] = {
      ...updatedQuarters[quarterIdx].topics[topicIdx],
      topic: editTopic,
      learningObjectives: editObjectives,
      hours: Number(editHours),
      section: editSection
    };

    setGeneratedData({
      ...generatedData,
      quarters: updatedQuarters
    });
    setEditingIndex(null);
  };

  const addRow = (quarterIdx: number) => {
    if (!generatedData) return;
    const updatedQuarters = [...generatedData.quarters];
    const topics = updatedQuarters[quarterIdx].topics;
    const nextNum = topics.length > 0 ? Math.max(...topics.map(t => t.lessonNumber)) + 1 : 1;
    
    topics.push({
      lessonNumber: nextNum,
      topic: 'Жаңа сабақ тақырыбы',
      hours: 1,
      learningObjectives: 'Жаңа оқу мақсаттары',
      section: topics[topics.length - 1]?.section || 'Жаңа бөлім'
    });

    setGeneratedData({
      ...generatedData,
      quarters: updatedQuarters
    });
  };

  const deleteRow = (quarterIdx: number, topicIdx: number) => {
    if (!generatedData) return;
    const updatedQuarters = [...generatedData.quarters];
    updatedQuarters[quarterIdx].topics.splice(topicIdx, 1);
    
    // Re-index lesson numbers
    updatedQuarters[quarterIdx].topics = updatedQuarters[quarterIdx].topics.map((t, idx) => ({
      ...t,
      lessonNumber: idx + 1
    }));

    setGeneratedData({
      ...generatedData,
      quarters: updatedQuarters
    });
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('ktj-print-area');
    if (!element) return;

    setLoading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (const styleTag of Array.from(styleTags)) {
            let cssText = styleTag.innerHTML;
            if (cssText.includes('oklch')) {
              cssText = cssText.replace(/oklch\([^)]+\)/g, '#888888');
              styleTag.innerHTML = cssText;
            }
          }
          const allElements = clonedDoc.getElementsByTagName('*');
          for (const el of Array.from(allElements)) {
            const htmlEl = el as HTMLElement;
            if (htmlEl.style) {
              const inlineStyle = htmlEl.getAttribute('style');
              if (inlineStyle && inlineStyle.includes('oklch')) {
                htmlEl.setAttribute('style', inlineStyle.replace(/oklch\([^)]+\)/g, '#888888'));
              }
            }
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();

      // Simple scaling
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`KTJ_${subject.replace(/\s+/g, '_')}_${grade.replace(/\s+/g, '_')}.pdf`);
      setSuccess('PDF құжаты сәтті жүктелді!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError('PDF экспорттау кезінде қате шықты.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportWord = () => {
    if (!generatedData) return;

    try {
      let htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>${generatedData.title}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 20px; }
            h2 { text-align: center; font-size: 16pt; margin-bottom: 5px; }
            h3 { text-align: center; font-size: 14pt; color: #555; margin-bottom: 20px; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .info-table td { padding: 5px; font-size: 11pt; border: none; }
            .info-table td.label { font-weight: bold; width: 25%; }
            .main-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .main-table th, .main-table td { border: 1px solid black; padding: 8px; text-align: left; font-size: 10pt; }
            .main-table th { background-color: #f2f2f2; font-weight: bold; }
            .quarter-row { background-color: #e6e6e6; font-weight: bold; font-size: 11pt; }
          </style>
        </head>
        <body>
          <h2>${generatedData.title}</h2>
          <h3>Күнтізбелік-тақырыптық жоспар (КТЖ)</h3>
          
          <table class="info-table">
            <tr>
              <td class="label">Пән:</td>
              <td>${generatedData.subject}</td>
              <td class="label">Сынып:</td>
              <td>${generatedData.grade}</td>
            </tr>
            <tr>
              <td class="label">Оқу жылы:</td>
              <td>${generatedData.schoolYear}</td>
              <td class="label">Апталық сағат саны:</td>
              <td>${generatedData.weeklyHours}</td>
            </tr>
            <tr>
              <td class="label">Оқу бағдарламасы:</td>
              <td colspan="3">${generatedData.curriculum}</td>
            </tr>
          </table>

          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 5%">№</th>
                <th style="width: 15%">Бөлім / Тақырып аты</th>
                <th style="width: 35%">Сабақ тақырыбы</th>
                <th style="width: 10%">Сағат саны</th>
                <th style="width: 35%">Оқу мақсаттары (МЖББС сілтемесі)</th>
              </tr>
            </thead>
            <tbody>
      `;

      generatedData.quarters.forEach((q) => {
        htmlContent += `
          <tr class="quarter-row">
            <td colspan="5" style="text-align: center;">${q.quarterName}</td>
          </tr>
        `;
        q.topics.forEach((t) => {
          htmlContent += `
            <tr>
              <td style="text-align: center;">${t.lessonNumber}</td>
              <td>${t.section}</td>
              <td>${t.topic}</td>
              <td style="text-align: center;">${t.hours}</td>
              <td>${t.learningObjectives}</td>
            </tr>
          `;
        });
      });

      htmlContent += `
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KTJ_${generatedData.subject.replace(/\s+/g, '_')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setSuccess('Word (DOC) файлы сәтті жүктелді!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Word файлын жасау кезінде қате орын алды.');
    }
  };

  const handleCopyText = () => {
    if (!generatedData) return;
    
    let text = `${generatedData.title}\n\n`;
    text += `Пән: ${generatedData.subject}\n`;
    text += `Сынып: ${generatedData.grade}\n`;
    text += `Оқу жылы: ${generatedData.schoolYear}\n`;
    text += `Апталық сағат саны: ${generatedData.weeklyHours}\n`;
    text += `Оқу бағдарламасы: ${generatedData.curriculum}\n\n`;
    
    generatedData.quarters.forEach((q) => {
      text += `=== ${q.quarterName} ===\n`;
      q.topics.forEach((t) => {
        text += `${t.lessonNumber}. Бөлім: ${t.section} | Тақырып: ${t.topic} | Сағат: ${t.hours} | Мақсаттар: ${t.learningObjectives}\n`;
      });
      text += '\n';
    });

    navigator.clipboard.writeText(text);
    setSuccess('КТЖ мәтіні алмасу буферіне көшірілді!');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Parameters panel */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            КТЖ Конструкторы
          </h2>
          <p className="text-xs text-slate-400 mt-1">Оқу мақсаттары мен бағдарламаға сай Күнтізбелік-тақырыптық жоспар (КТЖ) жасаңыз</p>
        </div>

        {/* Inputs */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Пән таңдаңыз</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
            >
              {SUBJECTS.map((sub, idx) => (
                <option key={idx} value={sub}>{sub}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Сыныбы</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
            >
              {GRADES.map((gr, idx) => (
                <option key={idx} value={gr}>{gr}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Оқу жылы</label>
              <input
                type="text"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                placeholder="Мысалы: 2026-2027"
                className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Апталық сағат</label>
              <select
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
              >
                <option value="1">1 сағат</option>
                <option value="2">2 сағат</option>
                <option value="3">3 сағат</option>
                <option value="4">4 сағат</option>
                <option value="5">5 сағат</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Үлгілік оқу бағдарламасы</label>
            <textarea
              rows={2}
              value={curriculum}
              onChange={(e) => setCurriculum(e.target.value)}
              placeholder="Қолданылатын стандарт немесе бағдарлама туралы сипаттама"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 transition cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>КТЖ жоспары жасалуда...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Жүйелік КТЖ құрастыру (AI)</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-600 leading-normal">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-600 leading-normal">
            {success}
          </div>
        )}
      </div>

      {/* Preview and Edit Panel */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {generatedData ? (
          <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-soft flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-500">Әрекеттер:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyText}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Көшіру
                </button>
                <button
                  onClick={handleExportWord}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Word (DOC)
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF Жүктеу
                </button>
              </div>
            </div>

            {/* Document area */}
            <div id="ktj-print-area" className="bg-white p-8 rounded-2xl border border-slate-100 shadow-soft flex flex-col gap-6 overflow-x-auto">
              <div className="text-center border-b border-slate-100 pb-5">
                <h3 className="text-base font-display font-black text-slate-800 leading-snug">
                  {generatedData.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">Күнтізбелік-тақырыптық жоспар</p>
              </div>

              {/* Grid overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600">
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Пән:</span>
                  <span className="font-semibold text-slate-800">{generatedData.subject}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Сыныбы:</span>
                  <span className="font-semibold text-slate-800">{generatedData.grade}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Оқу жылы:</span>
                  <span className="font-semibold text-slate-800">{generatedData.schoolYear}</span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] uppercase font-bold">Апталық сағат:</span>
                  <span className="font-semibold text-slate-800">{generatedData.weeklyHours} сағат</span>
                </div>
              </div>

              {/* Curriculum line */}
              <p className="text-xs text-slate-500 italic bg-blue-50/50 p-3 rounded-lg border border-blue-50/70">
                <span className="font-bold text-blue-800 not-italic">Регламенттеуші бағдарлама: </span>
                {generatedData.curriculum}
              </p>

              {/* Quarters rendering */}
              {generatedData.quarters.map((quarter, qIdx) => (
                <div key={qIdx} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-sm font-bold text-[#2563EB] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>
                      {quarter.quarterName}
                    </h4>
                    <button
                      onClick={() => addRow(qIdx)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 cursor-pointer transition"
                    >
                      <Plus className="w-3 h-3" />
                      Сабақ тақырыбын қосу
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                          <th className="p-3 text-center w-12">№</th>
                          <th className="p-3 w-1/4">Бөлімі (Блок)</th>
                          <th className="p-3 w-1/3">Сабақ тақырыбы</th>
                          <th className="p-3 w-16 text-center">Сағат</th>
                          <th className="p-3">Оқу мақсаттары</th>
                          <th className="p-3 text-center w-20 no-print">Басқару</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quarter.topics.map((t, tIdx) => {
                          const isEditing = editingIndex?.quarterIdx === qIdx && editingIndex?.topicIdx === tIdx;
                          return (
                            <tr key={tIdx} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                              <td className="p-3 text-center font-bold text-slate-500">{t.lessonNumber}</td>
                              <td className="p-3 font-semibold text-slate-700">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editSection}
                                    onChange={(e) => setEditSection(e.target.value)}
                                    className="w-full p-1.5 border border-slate-200 rounded text-xs"
                                  />
                                ) : (
                                  t.section
                                )}
                              </td>
                              <td className="p-3">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editTopic}
                                    onChange={(e) => setEditTopic(e.target.value)}
                                    className="w-full p-1.5 border border-slate-200 rounded text-xs"
                                  />
                                ) : (
                                  t.topic
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editHours}
                                    onChange={(e) => setEditHours(Number(e.target.value))}
                                    className="w-12 p-1.5 border border-slate-200 rounded text-center text-xs"
                                  />
                                ) : (
                                  <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                    {t.hours}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-slate-500">
                                {isEditing ? (
                                  <textarea
                                    value={editObjectives}
                                    onChange={(e) => setEditObjectives(e.target.value)}
                                    className="w-full p-1.5 border border-slate-200 rounded text-xs resize-none"
                                    rows={2}
                                  />
                                ) : (
                                  t.learningObjectives
                                )}
                              </td>
                              <td className="p-3 text-center no-print">
                                <div className="flex items-center justify-center gap-1">
                                  {isEditing ? (
                                    <button
                                      onClick={saveEdit}
                                      className="p-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 cursor-pointer transition"
                                      title="Сақтау"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => startEditing(qIdx, tIdx, t)}
                                      className="p-1 rounded bg-slate-50 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 cursor-pointer transition"
                                      title="Өңдеу"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteRow(qIdx, tIdx)}
                                    className="p-1 rounded bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer transition"
                                    title="Жою"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white p-16 rounded-2xl border border-slate-100 shadow-soft flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Күнтізбелік-тақырыптық жоспар (КТЖ) құрастыру</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Сол жақтағы параметрлерді толтырып, "AI КТЖ құрастыру" батырмасын басыңыз. Сонда білім стандартына сай жылдық сабақ жоспарыңыз жасалады.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
