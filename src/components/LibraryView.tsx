/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Folder, Bookmark, Trash2, Calendar, FileText, Eye, 
  Download, Star, Filter, FolderOpen, RefreshCw
} from 'lucide-react';
import { scopedKey } from '../utils';

interface LibraryItem {
  id: string;
  title: string;
  module: string;
  moduleName: string;
  recipientName?: string;
  description?: string;
  organization?: string;
  date: string;
  isFavorite: boolean;
  createdAt: string;
}

export default function LibraryView() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = () => {
    setLoading(true);
    try {
      // Load from central saved documents
      const docsStr = localStorage.getItem(scopedKey('ustaz_saved_documents'));
      let centralDocs: LibraryItem[] = docsStr ? JSON.parse(docsStr) : [];
      
      // Load from plans saved
      const plansStr = localStorage.getItem(scopedKey('ustaz_plans_saved'));
      let planDocs: any[] = plansStr ? JSON.parse(plansStr) : [];
      const formattedPlans: LibraryItem[] = planDocs.map(p => ({
        id: p.id,
        title: p.topic,
        module: p.type,
        moduleName: p.type === 'qmj' ? 'Қысқа мерзімді жоспар (ҚМЖ)' : 
                    p.type === 'umj' ? 'Ұзақ мерзімді жоспар (ҰМЖ)' : 
                    p.type === 'tarbie' ? 'Тәрбие сағаты' : 'Балабақша жоспары',
        recipientName: p.grade,
        description: p.objectives?.join(', ') || p.topic,
        organization: p.subject,
        date: p.createdAt,
        isFavorite: p.isFavorite || false,
        createdAt: p.createdAt
      }));

      // Merge and remove duplicates
      const merged = [...centralDocs];
      formattedPlans.forEach(plan => {
        if (!merged.some(m => m.id === plan.id)) {
          merged.push(plan);
        }
      });

      // Sort by creation date
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems(merged);
    } catch (e) {
      console.error('Error loading library:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, isFavorite: !item.isFavorite };
      }
      return item;
    });
    setItems(updated);
    
    // Sync back to local storage
    try {
      const docsStr = localStorage.getItem(scopedKey('ustaz_saved_documents'));
      if (docsStr) {
        let centralDocs: LibraryItem[] = JSON.parse(docsStr);
        const idx = centralDocs.findIndex(d => d.id === id);
        if (idx !== -1) {
          centralDocs[idx].isFavorite = !centralDocs[idx].isFavorite;
          localStorage.setItem(scopedKey('ustaz_saved_documents'), JSON.stringify(centralDocs));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Осы құжатты материалдар кітапханасынан жоюды растайсыз ба?')) return;

    const filtered = items.filter(item => item.id !== id);
    setItems(filtered);

    // Sync to local storage
    try {
      // Central docs
      const docsStr = localStorage.getItem(scopedKey('ustaz_saved_documents'));
      if (docsStr) {
        let centralDocs: LibraryItem[] = JSON.parse(docsStr);
        localStorage.setItem(scopedKey('ustaz_saved_documents'), JSON.stringify(centralDocs.filter(d => d.id !== id)));
      }

      // Plans
      const plansStr = localStorage.getItem(scopedKey('ustaz_plans_saved'));
      if (plansStr) {
        let planDocs: any[] = JSON.parse(plansStr);
        localStorage.setItem(scopedKey('ustaz_plans_saved'), JSON.stringify(planDocs.filter(p => p.id !== id)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.moduleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.recipientName && item.recipientName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'favorites') return matchesSearch && item.isFavorite;
    if (activeFilter === 'assessments') return matchesSearch && ['bjb', 'tjb'].includes(item.module);
    if (activeFilter === 'lessons') return matchesSearch && ['qmj', 'umj', 'tarbie', 'balabaqsha'].includes(item.module);
    
    return matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6">
      
      {/* Search and Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-soft flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Құжат аты, сынып немесе пән бойынша іздеу..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition"
          />
        </div>

        {/* Categories filters */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {[
            { id: 'all', label: 'Барлық материалдар' },
            { id: 'favorites', label: 'Таңдаулылар ⭐' },
            { id: 'lessons', label: 'Сабақ жоспарлары' },
            { id: 'assessments', label: 'БЖБ/ТЖБ жинақтары' }
          ].map((filt) => (
            <button
              key={filt.id}
              onClick={() => setActiveFilter(filt.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                activeFilter === filt.id 
                  ? 'bg-[#2563EB] text-white shadow-sm' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
              }`}
            >
              {filt.label}
            </button>
          ))}
          <button 
            onClick={loadLibrary}
            className="p-1.5 rounded-lg hover:bg-slate-100 border border-slate-100 text-slate-500 cursor-pointer"
            title="Жаңарту"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of items */}
      {loading ? (
        <div className="bg-white p-20 rounded-2xl shadow-soft border border-slate-100 flex flex-col items-center justify-center text-center gap-2">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xs font-bold text-slate-500">Кітапхана жүктелуде...</span>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredItems.map((item) => {
              const isLesson = ['qmj', 'umj', 'tarbie', 'balabaqsha'].includes(item.module);
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between group"
                >
                  <div className="p-5 flex flex-col gap-3">
                    {/* Folder label tag & Favorite trigger */}
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        isLesson ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {item.moduleName}
                      </span>
                      
                      <button
                        onClick={(e) => handleToggleFavorite(item.id, e)}
                        className="text-slate-300 hover:text-amber-500 transition cursor-pointer"
                      >
                        <Star className={`w-4 h-4 ${item.isFavorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                      </button>
                    </div>

                    {/* Title */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">
                        {item.title}
                      </h4>
                      {item.recipientName && (
                        <p className="text-[11px] text-slate-400 mt-1 font-semibold flex items-center gap-1">
                          <span>Сыныбы / Иесі:</span>
                          <span className="text-slate-600">{item.recipientName}</span>
                        </p>
                      )}
                    </div>

                    {/* Short preview body */}
                    <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed border-t border-slate-50 pt-2.5">
                      {item.description || 'Құжат мазмұны көрсетілмеген.'}
                    </p>
                  </div>

                  {/* Card bottom metadata & actions */}
                  <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100/55 flex justify-between items-center text-[10px]">
                    <div className="flex items-center gap-1.5 text-slate-400 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{item.date}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer transition"
                        title="Жою"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white p-16 rounded-2xl border border-slate-100 shadow-soft flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Материалдар табылмады</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Конструкторлар арқылы БЖБ/ТЖБ немесе сабақ жоспарларын жасаңыз, сонда олар осында автоматты түрде сақталады.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
