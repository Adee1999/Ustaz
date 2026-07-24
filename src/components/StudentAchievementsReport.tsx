/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, FileText, Download, Plus, Trash2, Edit2, Check, Copy, RefreshCw, Sparkles, Printer, ArrowRight, UserCheck, TrendingUp, Sparkle 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { SUBJECTS, GRADES, scopedKey } from '../utils';

interface AchievementData {
  studentName: string;
  grade: string;
  subject: string;
  achievementReport: string;
  performanceAnalysis: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export default function StudentAchievementsReport() {
  const [grade, setGrade] = useState(GRADES[5]); // 5-сынып
  const [student, setStudent] = useState('Ахметова Аружан Берікқызы');
  const [subject, setSubject] = useState(SUBJECTS[0]); // Қазақ тілі
  const [results, setResults] = useState('БЖБ-1: 9/10, БЖБ-2: 10/10, ТЖБ: 28/30. Тоқсандық баға: "5"');
  const [olympiad, setOlympiad] = useState('Аудандық қазақ тілі мен әдебиеті олимпиадасында 2-орын');
  const [competitions, setCompetitions] = useState('"Ақ бота" интеллектуалды марафонының лауреаты');
  const [clubs, setClubs] = useState('Көркемсөз оқу үйірмесінің белсенді мүшесі');
  const [attendance, setAttendance] = useState('Қатысу көрсеткіші: 100% (Денсаулығы бойынша жіберген сабақтар жоқ)');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<AchievementData | null>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editReport, setEditReport] = useState('');
  const [editAnalysis, setEditAnalysis] = useState('');
  const [editStrengths, setEditStrengths] = useState<string[]>([]);
  const [editWeaknesses, setEditWeaknesses] = useState<string[]>([]);
  const [editRecommendations, setEditRecommendations] = useState<string[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setGeneratedData(null);

    try {
      const response = await fetch('/api/gemini/generate-achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grade,
          student,
          subject,
          results,
          olympiad,
          competitions,
          clubs,
          attendance
        }),
      });

      if (!response.ok) {
        let errMsg = 'Жетістіктер есебін жасау кезінде қате кетті.';
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
      
      // Initialize editing states
      setEditReport(data.achievementReport);
      setEditAnalysis(data.performanceAnalysis);
      setEditStrengths(data.strengths || []);
      setEditWeaknesses(data.weaknesses || []);
      setEditRecommendations(data.recommendations || []);

      setSuccess('Жетістіктер есебі сәтті жасалды!');
      setTimeout(() => setSuccess(null), 3000);

      // Save to library
      saveToLibrary(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Есеп жасау сәтсіз аяқталды.');
    } finally {
      setLoading(false);
    }
  };

  const saveToLibrary = (data: AchievementData) => {
    try {
      const savedDocsStr = localStorage.getItem(scopedKey('ustaz_saved_documents'));
      let savedDocs: any[] = savedDocsStr ? JSON.parse(savedDocsStr) : [];
      
      const payload = {
        id: 'ach_' + Date.now(),
        title: `Оқушы жетістіктерінің есебі: ${data.studentName}`,
        module: 'bjb', // map to assessments/student profile in library
        moduleName: 'Оқушы жетістіктерінің есебі',
        recipientName: data.studentName,
        description: `Сыныбы: ${data.grade}. Пән: ${data.subject}. Үлгерім мен жетістіктерді талдау есебі.`,
        organization: data.subject,
        date: new Date().toLocaleDateString('kk-KZ'),
        isFavorite: false,
        createdAt: new Date().toISOString()
      };

      savedDocs.push(payload);
      localStorage.setItem(scopedKey('ustaz_saved_documents'), JSON.stringify(savedDocs));
    } catch (e) {
      console.error(e);
    }
  };

  const saveEditing = () => {
    if (!generatedData) return;
    setGeneratedData({
      ...generatedData,
      achievementReport: editReport,
      performanceAnalysis: editAnalysis,
      strengths: editStrengths,
      weaknesses: editWeaknesses,
      recommendations: editRecommendations
    });
    setIsEditing(false);
    setSuccess('Өзгерістер уақытша сақталды!');
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('achievement-print-area');
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
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`Esep_${student.replace(/\s+/g, '_')}.pdf`);
      setSuccess('PDF есебі сәтті жүктелді!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError('PDF жүктеу кезінде қате орын алды.');
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
          <title>Оқушы жетістіктерінің есебі</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 30px; line-height: 1.5; }
            h2 { text-align: center; font-size: 16pt; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; }
            .info-block { border: 1px solid #ccc; padding: 10px; margin-bottom: 20px; background-color: #f9f9f9; }
            .info-block p { margin: 5px 0; font-size: 11pt; }
            .info-block span.label { font-weight: bold; }
            h3 { font-size: 13pt; color: #2a3f54; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 25px; }
            p { font-size: 11pt; text-align: justify; }
            ul { margin-top: 5px; }
            li { font-size: 11pt; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <h2>Оқушы жетістіктерінің есебі</h2>
          
          <div class="info-block">
            <p><span class="label">Оқушының аты-жөні:</span> ${generatedData.studentName}</p>
            <p><span class="label">Сыныбы / Тобы:</span> ${generatedData.grade}</p>
            <p><span class="label">Талданатын пән:</span> ${generatedData.subject}</p>
            <p><span class="label">Күні:</span> ${new Date().toLocaleDateString('kk-KZ')}</p>
          </div>

          <h3>1. Жетістіктер мен үйірмелер бойынша есеп</h3>
          <p>${generatedData.achievementReport}</p>

          <h3>2. Үлгерімді педагогикалық-әдістемелік талдау</h3>
          <p>${generatedData.performanceAnalysis}</p>

          <h3>3. Күшті жақтары</h3>
          <ul>
            ${generatedData.strengths.map(s => `<li>${s}</li>`).join('')}
          </ul>

          <h3>4. Дамытуды және қолдауды қажет ететін тұстары</h3>
          <ul>
            ${generatedData.weaknesses.map(w => `<li>${w}</li>`).join('')}
          </ul>

          <h3>5. Педагог ұсыныстары мен даму бағдары</h3>
          <ul>
            ${generatedData.recommendations.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Esep_${generatedData.studentName.replace(/\s+/g, '_')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setSuccess('Word (DOC) файлы сәтті жүктелді!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Word файлын жасау сәтсіз аяқталды.');
    }
  };

  const handleCopyText = () => {
    if (!generatedData) return;

    let text = `ОҚУШЫ ЖЕТІСТІКТЕРІНІҢ ЕСЕБІ\n\n`;
    text += `Оқушының аты-жөні: ${generatedData.studentName}\n`;
    text += `Сыныбы: ${generatedData.grade}\n`;
    text += `Пән: ${generatedData.subject}\n\n`;
    text += `1. Жетістіктер есебі:\n${generatedData.achievementReport}\n\n`;
    text += `2. Үлгерім талдауы:\n${generatedData.performanceAnalysis}\n\n`;
    text += `3. Күшті жақтары:\n` + generatedData.strengths.map(s => `  - ${s}`).join('\n') + '\n\n';
    text += `4. Даму қажет тұстары:\n` + generatedData.weaknesses.map(w => `  - ${w}`).join('\n') + '\n\n';
    text += `5. Педагогикалық ұсыныстар:\n` + generatedData.recommendations.map(r => `  - ${r}`).join('\n') + '\n';

    navigator.clipboard.writeText(text);
    setSuccess('Есеп мәтіні буферге сәтті көшірілді!');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Parameters Panel */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Оқушы Жетістіктерінің Есебі
          </h2>
          <p className="text-xs text-slate-400 mt-1">Оқушының үлгерімін, конкурстарын және олимпиадалық жетістіктерін талдаңыз</p>
        </div>

        {/* Inputs Form */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Сынып таңдаңыз</label>
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

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Оқушының аты-жөні</label>
            <input
              type="text"
              value={student}
              onChange={(e) => setStudent(e.target.value)}
              placeholder="Мысалы: Сәбитова Жанель"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Пән</label>
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
            <label className="text-xs font-bold text-slate-500">Бағалау нәтижелері (БЖБ/ТЖБ)</label>
            <textarea
              rows={2}
              value={results}
              onChange={(e) => setResults(e.target.value)}
              placeholder="Мысалы: БЖБ-1: 9/10, ТЖБ: 27/30"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Олимпиада</label>
              <input
                type="text"
                value={olympiad}
                onChange={(e) => setOlympiad(e.target.value)}
                placeholder="Жүлделері мен қатысуы"
                className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Байқаулар</label>
              <input
                type="text"
                value={competitions}
                onChange={(e) => setCompetitions(e.target.value)}
                placeholder="Ғылыми жобалар немесе конкурстар"
                className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Үйірмелер (Секциялар)</label>
            <input
              type="text"
              value={clubs}
              onChange={(e) => setClubs(e.target.value)}
              placeholder="Қосымша спорт, өнер, ғылыми үйірмелері"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Сабаққа қатысу көрсеткіші</label>
            <input
              type="text"
              value={attendance}
              onChange={(e) => setAttendance(e.target.value)}
              placeholder="Сабақты жіберу жиілігі немесе себептері"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
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
                <span>Жетістіктер талдануда (AI)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Жетістіктер есебін жасау</span>
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

      {/* Report Showcase and Edit */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {generatedData ? (
          <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-soft flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-500">Баспа және Экспорт:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  {isEditing ? 'Сақтауға оралу' : 'Мәтінді өңдеу'}
                </button>
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

            {isEditing ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-soft flex flex-col gap-5">
                <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">Есепті өңдеу режимі</h3>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">1. Жетістіктер есебі</label>
                  <textarea
                    rows={4}
                    value={editReport}
                    onChange={(e) => setEditReport(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">2. Үлгерім талдауы</label>
                  <textarea
                    rows={4}
                    value={editAnalysis}
                    onChange={(e) => setEditAnalysis(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">3. Күшті жақтары (әр жолда біреуден)</label>
                  <textarea
                    rows={3}
                    value={editStrengths.join('\n')}
                    onChange={(e) => setEditStrengths(e.target.value.split('\n'))}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">4. Даму қажет тұстары (әр жолда біреуден)</label>
                  <textarea
                    rows={3}
                    value={editWeaknesses.join('\n')}
                    onChange={(e) => setEditWeaknesses(e.target.value.split('\n'))}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">5. Ұсыныстар (әр жолда біреуден)</label>
                  <textarea
                    rows={3}
                    value={editRecommendations.join('\n')}
                    onChange={(e) => setEditRecommendations(e.target.value.split('\n'))}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition"
                  >
                    Бас тарту
                  </button>
                  <button
                    onClick={saveEditing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Өзгерістерді сақтау
                  </button>
                </div>
              </div>
            ) : (
              <div id="achievement-print-area" className="bg-white p-8 rounded-2xl border border-slate-100 shadow-soft flex flex-col gap-6">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-5 gap-3">
                  <div>
                    <h3 className="text-base font-display font-black text-slate-800 leading-snug">
                      {generatedData.studentName}
                    </h3>
                    <p className="text-xs text-[#2563EB] font-bold">Оқушының даму және жетістіктер картасы</p>
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 uppercase tracking-wide">
                    {generatedData.grade} • {generatedData.subject}
                  </span>
                </div>

                {/* Grid stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-50 flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block">Үлгерім деңгейі</span>
                      <p className="text-xs text-slate-600 mt-1 leading-normal font-semibold">Оқу үрдісіне толық тартылған, нәтижелері өте жоғары.</p>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-50 flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <Sparkle className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-blue-700 block">Әлеуметтік белсенділік</span>
                      <p className="text-xs text-slate-600 mt-1 leading-normal font-semibold">Олимпиадалар мен қоғамдық шараларда жақсы көрсеткіштер бар.</p>
                    </div>
                  </div>
                </div>

                {/* Section 1: Achievement report */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Жетістіктер және үйірмелер бойынша есеп</h4>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {generatedData.achievementReport}
                  </p>
                </div>

                {/* Section 2: Performance analysis */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">2. Үлгерімді педагогикалық-әдістемелік талдау</h4>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {generatedData.performanceAnalysis}
                  </p>
                </div>

                {/* Strengths and Weaknesses bento-grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="border border-emerald-100 bg-emerald-50/20 p-5 rounded-2xl flex flex-col gap-3">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 border-b border-emerald-100 pb-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Оқушының күшті жақтары
                    </span>
                    <ul className="flex flex-col gap-1.5">
                      {generatedData.strengths.filter(s => s.trim()).map((s, idx) => (
                        <li key={idx} className="text-xs text-slate-600 list-disc list-inside leading-normal font-medium">{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="border border-amber-100 bg-amber-50/20 p-5 rounded-2xl flex flex-col gap-3">
                    <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5 border-b border-amber-100 pb-2">
                      <ArrowRight className="w-4 h-4 text-amber-600" />
                      Дамытуды қажет ететін тұстары
                    </span>
                    <ul className="flex flex-col gap-1.5">
                      {generatedData.weaknesses.filter(w => w.trim()).map((w, idx) => (
                        <li key={idx} className="text-xs text-slate-600 list-disc list-inside leading-normal font-medium">{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5. Педагогикалық ұсыныстар мен даму траекториясы</h4>
                  <div className="flex flex-col gap-2">
                    {generatedData.recommendations.filter(r => r.trim()).map((r, idx) => (
                      <div key={idx} className="flex gap-2.5 items-start text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="leading-normal">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer signatures */}
                <div className="mt-8 border-t border-slate-100 pt-6 flex justify-between items-center text-xs text-slate-400 font-medium">
                  <span>Есеп беруші педагог: ________________</span>
                  <span>Күні: {new Date().toLocaleDateString('kk-KZ')}</span>
                </div>

              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-16 rounded-2xl border border-slate-100 shadow-soft flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Оқушы жетістіктерінің есебін жасау</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Сол жақтағы оқушы нәтижелерін, олимпиадаларды және қатысу үлгерімдерін толтырып, "AI Жетістіктер есебін жасау" батырмасын басыңыз.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
