/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserCheck, FileText, Download, Edit2, Check, Copy, RefreshCw, Sparkles, Printer, ArrowRight, Heart, HelpCircle 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { GRADES, scopedKey } from '../utils';

interface ReferenceData {
  studentName: string;
  grade: string;
  officialReference: string;
  recommendationsForParents: string[];
  supportTips: string[];
}

export default function ParentCharacterReference() {
  const [studentName, setStudentName] = useState('Төлегенов Санжар Ақылбекұлы');
  const [grade, setGrade] = useState(GRADES[5]); // 5-сынып
  const [behavior, setBehavior] = useState('Өте сыпайы, үлкендерді сыйлайды, ұстамды және жауапкершілігі мол.');
  const [performance, setPerformance] = useState('Сабақ үлгерімі өте жақсы, әсіресе жаратылыстану бағытындағы пәндерге қызығушылығы зор.');
  const [activity, setActivity] = useState('Сынып өміріне белсенді араласады, қоғамдық жұмыстарға өз еркімен көмектеседі.');
  const [attendance, setAttendance] = useState('Сабақты себепсіз босатпайды, мектепке үнемі уақытылы келеді.');
  const [relationships, setRelationships] = useState('Сыныптастарымен достық қарым-қатынаста, дау-дамайларға бой алдырмайды, ортада беделді.');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<ReferenceData | null>(null);

  // Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editReference, setEditReference] = useState('');
  const [editRecommendations, setEditRecommendations] = useState<string[]>([]);
  const [editTips, setEditTips] = useState<string[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setGeneratedData(null);

    try {
      const response = await fetch('/api/gemini/generate-parent-reference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName,
          grade,
          behavior,
          performance,
          activity,
          attendance,
          relationships
        }),
      });

      if (!response.ok) {
        let errMsg = 'Ата-анаға мінездеме құрастыруда серверден қате кетті.';
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
      
      setEditReference(data.officialReference);
      setEditRecommendations(data.recommendationsForParents || []);
      setEditTips(data.supportTips || []);

      setSuccess('Ата-анаға арналған мінездеме сәтті жасалды!');
      setTimeout(() => setSuccess(null), 3000);

      // Save to library
      saveToLibrary(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Мінездеме құру сәтсіз аяқталды.');
    } finally {
      setLoading(false);
    }
  };

  const saveToLibrary = (data: ReferenceData) => {
    try {
      const savedDocsStr = localStorage.getItem(scopedKey('ustaz_saved_documents'));
      let savedDocs: any[] = savedDocsStr ? JSON.parse(savedDocsStr) : [];
      
      const payload = {
        id: 'ref_' + Date.now(),
        title: `Ата-анаға мінездеме: ${data.studentName}`,
        module: 'minezdeme', // Map to Character References section in library
        moduleName: 'Ата-анаға мінездеме',
        recipientName: data.studentName,
        description: `Сыныбы: ${data.grade}. Психологиялық-педагогикалық мінездеме және ата-анаға арналған кеңестер.`,
        organization: 'Педагогикалық мінездемелер жиынтығы',
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
      officialReference: editReference,
      recommendationsForParents: editRecommendations,
      supportTips: editTips
    });
    setIsEditing(false);
    setSuccess('Мінездеме сәтті өзгертілді!');
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('reference-print-area');
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
      pdf.save(`Minezdeme_${studentName.replace(/\s+/g, '_')}.pdf`);
      setSuccess('PDF мінездеме сәтті жүктелді!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setError('PDF экспорттауда қате орын алды.');
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
          <title>Оқушының ата-анасына педагогикалық мінездеме</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 30px; line-height: 1.6; }
            h2 { text-align: center; font-size: 15pt; font-weight: bold; margin-bottom: 25px; text-transform: uppercase; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .info-table td { padding: 6px; font-size: 11pt; border: none; }
            .info-table td.label { font-weight: bold; width: 25%; }
            h3 { font-size: 12pt; color: #1a365d; border-bottom: 1.5px solid #2b6cb0; padding-bottom: 4px; margin-top: 25px; font-weight: bold; }
            p { font-size: 11pt; text-align: justify; text-indent: 1.25cm; margin-bottom: 15px; }
            ol, ul { margin-top: 5px; padding-left: 20px; }
            li { font-size: 11pt; margin-bottom: 6px; text-align: justify; }
          </style>
        </head>
        <body>
          <h2>Оқушыға Ата-анаға арналған мінездеме</h2>
          
          <table class="info-table">
            <tr>
              <td class="label">Оқушының аты-жөні:</td>
              <td>${generatedData.studentName}</td>
            </tr>
            <tr>
              <td class="label">Сыныбы / Тобы:</td>
              <td>${generatedData.grade}</td>
            </tr>
            <tr>
              <td class="label">Дайындалған күні:</td>
              <td>${new Date().toLocaleDateString('kk-KZ')}</td>
            </tr>
          </table>

          <h3>1. Ресми педагогикалық-психологиялық мінездеме</h3>
          <p>${generatedData.officialReference}</p>

          <h3>2. Үйде дамыту және тәрбиелеу бойынша ата-анаға ұсыныстар</h3>
          <ul>
            ${generatedData.recommendationsForParents.map(r => `<li>${r}</li>`).join('')}
          </ul>

          <h3>3. Психологиялық қолдау көрсету бойынша кеңестер</h3>
          <ul>
            ${generatedData.supportTips.map(t => `<li>${t}</li>`).join('')}
          </ul>
          
          <br><br>
          <p style="text-align: right; text-indent: 0;">Сынып жетекшісі: ________________ / ________________</p>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Minezdeme_${generatedData.studentName.replace(/\s+/g, '_')}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setSuccess('Word (DOC) файлы сәтті жүктелді!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      console.error(e);
      setError('Word файлын жасауда қате кетті.');
    }
  };

  const handleCopyText = () => {
    if (!generatedData) return;

    let text = `АТА-АНАҒА МІНЕЗДЕМЕ ЖӘНЕ ҰСЫНЫСТАР\n\n`;
    text += `Оқушы аты-жөні: ${generatedData.studentName}\n`;
    text += `Сыныбы: ${generatedData.grade}\n\n`;
    text += `=== 1. Ресми мінездеме ===\n${generatedData.officialReference}\n\n`;
    text += `=== 2. Ата-анаға ұсыныстар ===\n` + generatedData.recommendationsForParents.map(r => `  - ${r}`).join('\n') + '\n\n';
    text += `=== 3. Қолдау бойынша кеңестер ===\n` + generatedData.supportTips.map(t => `  - ${t}`).join('\n') + '\n';

    navigator.clipboard.writeText(text);
    setSuccess('Мінездеме мәтіні буферге көшірілді!');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Parameters Panel */}
      <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-soft border border-slate-100 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Ата-анаға Мінездеме
          </h2>
          <p className="text-xs text-slate-400 mt-1">Оқушының мінез-құлқын, үлгерімін және ортадағы қарым-қатынасын сипаттаңыз</p>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Оқушының аты-жөні</label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Мысалы: Сейітова Амина"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
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

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Мінез-құлқы</label>
            <textarea
              rows={2}
              value={behavior}
              onChange={(e) => setBehavior(e.target.value)}
              placeholder="Жалпы тәртібі, жауапкершілігі, ережелерді сақтауы"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Үлгерімі</label>
            <textarea
              rows={2}
              value={performance}
              onChange={(e) => setPerformance(e.target.value)}
              placeholder="Оқуға деген ынтасы, қызығатын пәндері мен қиындықтары"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Белсенділігі</label>
            <input
              type="text"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="Сынып өміріне, іс-шараларға атсалысуы"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Сабаққа қатысуы</label>
            <input
              type="text"
              value={attendance}
              onChange={(e) => setAttendance(e.target.value)}
              placeholder="Мектепке кешікпей келуі, себепсіз қалдыру деңгейі"
              className="w-full text-xs border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Сыныптастарымен қарым-қатынасы</label>
            <input
              type="text"
              value={relationships}
              onChange={(e) => setRelationships(e.target.value)}
              placeholder="Достық қарым-қатынас, ұжымға бейімделу деңгейі"
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
                <span>Мінездеме құрылуда (AI)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Ресми мінездеме құрастыру</span>
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

      {/* Showcase area */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {generatedData ? (
          <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-soft flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-500">Әрекеттер:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  {isEditing ? 'Сақтауға оралу' : 'Мінездемені өңдеу'}
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
                <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">Мінездемені өңдеу</h3>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">Ресми мінездеме мәтіні</label>
                  <textarea
                    rows={8}
                    value={editReference}
                    onChange={(e) => setEditReference(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">Ата-анаға ұсыныстар (әр жолда біреуден)</label>
                  <textarea
                    rows={4}
                    value={editRecommendations.join('\n')}
                    onChange={(e) => setEditRecommendations(e.target.value.split('\n'))}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">Қолдау бойынша кеңестер (әр жолда біреуден)</label>
                  <textarea
                    rows={4}
                    value={editTips.join('\n')}
                    onChange={(e) => setEditTips(e.target.value.split('\n'))}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition"
                  >
                    Артқа қайту
                  </button>
                  <button
                    onClick={saveEditing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Сақтау
                  </button>
                </div>
              </div>
            ) : (
              <div id="reference-print-area" className="bg-white p-8 rounded-2xl border border-slate-100 shadow-soft flex flex-col gap-6">
                
                {/* School Header style */}
                <div className="border-b-2 border-[#2563EB] pb-5 text-center flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Ата-анаға арналған педагогикалық кепілдеме</span>
                  <h3 className="text-base font-display font-black text-slate-800">
                    ОҚУШЫНЫҢ ПЕДАГОГИКАЛЫҚ-ПСИХОЛОГИЯЛЫҚ МІНЕЗДЕМЕСІ
                  </h3>
                  <div className="flex justify-center gap-2 text-[10px] font-bold text-slate-400 mt-1 uppercase">
                    <span>Сыныбы: {generatedData.grade}</span>
                    <span>•</span>
                    <span>Оқушы: {generatedData.studentName}</span>
                  </div>
                </div>

                {/* Reference Text */}
                <div className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">1. Жалпы мінездеме және педагогикалық қорытынды</h4>
                  <p className="text-xs text-slate-600 leading-relaxed text-justify bg-slate-50 p-4 rounded-xl border border-slate-100/80 indent-8">
                    {generatedData.officialReference}
                  </p>
                </div>

                {/* Tips & Recommendations lists */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-2">
                  
                  {/* Recommendations */}
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Ата-аналарға ұсыныстар
                    </span>
                    <div className="flex flex-col gap-2">
                      {generatedData.recommendationsForParents.filter(r => r.trim()).map((r, idx) => (
                        <div key={idx} className="flex gap-2 items-start text-xs text-slate-600">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">{r}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Support tips */}
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold text-[#2563EB] flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      Үйдегі қолдау кеңестері
                    </span>
                    <div className="flex flex-col gap-2">
                      {generatedData.supportTips.filter(t => t.trim()).map((t, idx) => (
                        <div key={idx} className="flex gap-2 items-start text-xs text-slate-600">
                          <Check className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">{t}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Official signature footer */}
                <div className="mt-8 border-t border-slate-100 pt-6 flex justify-between items-center text-xs text-slate-400 font-medium">
                  <span>Сынып жетекшісі: _________________</span>
                  <span>Күні: {new Date().toLocaleDateString('kk-KZ')}</span>
                </div>

              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-16 rounded-2xl border border-slate-100 shadow-soft flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <UserCheck className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Ата-анаға ресми мінездеме жасау</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Сол жақтағы оқушының тәртібін, белсенділігін және ортадағы қарым-қатынасын сипаттап, "AI Ресми мінездеме құрастыру" батырмасын басыңыз.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
