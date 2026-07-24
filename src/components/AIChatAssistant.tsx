/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Sparkles, AlertCircle, RefreshCw, Bot, User, HelpCircle, BookOpen, Smile, Award
} from 'lucide-react';
import { ChatMessage } from '../types';
import { scopedKey } from '../utils';

// Kazakh pedagogical quick chips
const SUGGESTED_PROMPTS = [
  { text: '8 сынып география бойынша БЖБ жаса', icon: BookOpen },
  { text: 'Тәрбие сағатының қызықты жоспарын жаз', icon: Smile },
  { text: 'Балабақша ересек тобына арналған ойын', icon: Bot },
  { text: 'Оқушыларды марапаттау мәтінін дайында', icon: Award }
];

export default function AIChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(scopedKey('ustaz_chat_history'));
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Add a welcoming message in Kazakh
      const welcome: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Сәлеметсіз бе! Мен **Ustaz Studio** платформасының интеллектуалды педагогикалық көмекшісімін. 

Сізге бүгін қандай көмек қажет? 
Мұғалімдер мен тәрбиешілерге пайдалы мысалдар:
- Сабақ жоспарын немесе қызықты ойындар құрастыру
- Пәндік БЖБ/ТЖБ дескрипторларын жазу
- Әкімшілік баяндамалар мен ашық сабақ сценарийлерін әзірлеу

Төмендегі дайын сұрақтардың бірін таңдаңыз немесе өз сұрағыңызды жазыңыз!`,
        timestamp: new Date().toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([welcome]);
    }
  }, []);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(scopedKey('ustaz_chat_history'), JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-10) // pass recent context
        })
      });

      if (!response.ok) {
        let errMsg = 'Көмекші жауап бере алмады. Байланысты тексеріңіз.';
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

      const aiMsg: ChatMessage = {
        id: 'msg_ai_' + Date.now(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ішкі қателік орын алды.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Барлық чат тарихын өшіргіңіз келе ме?')) {
      const welcome: ChatMessage = {
        id: 'welcome_' + Date.now(),
        role: 'assistant',
        content: 'Сәлеметсіз бе! Мен тағы да дайынмын. Маған сұрағыңызды қойыңыз!',
        timestamp: new Date().toLocaleTimeString('kk-KZ', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([welcome]);
      localStorage.removeItem(scopedKey('ustaz_chat_history'));
    }
  };

  // Safe renderer for bold markdown in responses
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Basic markdown parser for **bold** text and lists
      let html = line;
      
      // replace lists
      if (line.trim().startsWith('- ')) {
        html = line.replace('- ', '• ');
      } else if (line.trim().startsWith('* ')) {
        html = line.replace('* ', '• ');
      }

      // bold markers replacement
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(html)) !== null) {
        if (match.index > lastIndex) {
          parts.push(html.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-bold text-slate-900">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < html.length) {
        parts.push(html.substring(lastIndex));
      }

      return (
        <p key={idx} className="min-h-[1rem] leading-relaxed">
          {parts.length > 0 ? parts : html}
        </p>
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 flex flex-col h-[650px] overflow-hidden">
      {/* Assistant Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white relative">
            <Bot className="w-5 h-5 animate-pulse" />
            <Sparkles className="w-3 h-3 text-amber-300 absolute -top-0.5 -right-0.5" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-slate-800">Интеллектуалды Көмекші</h3>
            <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Белсенді • AI 3.5
            </span>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition"
        >
          Тарихты өшіру
        </button>
      </div>

      {/* Messages stream area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${
              msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
            }`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble wrapper */}
            <div className="flex flex-col gap-1">
              <div className={`p-4 rounded-2xl text-xs flex flex-col gap-1 shadow-sm leading-relaxed ${
                msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-50 text-slate-700 rounded-tl-none border border-slate-100'
              }`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-line">{msg.content}</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {renderMessageContent(msg.content)}
                  </div>
                )}
              </div>
              <span className={`text-[9px] text-slate-400 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-[80%] self-start">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-500 rounded-tl-none flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              Жауап дайындалып жатыр...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl border border-red-100 flex items-center gap-2 max-w-[80%] self-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips (No-print) */}
      {messages.length <= 2 && (
        <div className="px-6 py-2 flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50">
          {SUGGESTED_PROMPTS.map((chip, idx) => {
            const ChipIcon = chip.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.text)}
                className="text-[10px] font-bold text-slate-600 hover:text-blue-700 hover:bg-blue-50 bg-white border border-slate-150 px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1 transition"
              >
                <ChipIcon className="w-3.5 h-3.5 text-blue-500" />
                {chip.text}
              </button>
            );
          })}
        </div>
      )}

      {/* Input box */}
      <div className="p-4 border-t border-slate-150 bg-white flex items-center gap-3">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
          placeholder="Педагогикалық көмекшіден сұраңыз..."
          disabled={loading}
          className="flex-1 text-xs border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition disabled:bg-slate-100"
        />
        <button
          onClick={() => handleSendMessage(input)}
          disabled={!input.trim() || loading}
          className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl shadow-md shadow-blue-100 cursor-pointer transition flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
