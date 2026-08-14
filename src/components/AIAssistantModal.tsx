import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import DietAI from './DietAI';
import HealthChat from './HealthChat';
import { 
  Sparkles, 
  Utensils, 
  MessageSquare, 
  X
} from 'lucide-react';

export default function AIAssistantModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'diet' | 'chat'>('diet');

  return (
    <>
      {/* Floating AI Assistant Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center justify-center gap-1.5 bg-gradient-to-r from-teal-600 via-teal-700 to-sky-700 hover:from-teal-500 hover:to-sky-600 text-white font-bold h-[38px] px-2.5 py-1.5 rounded-full shadow-lg border border-teal-400/30 cursor-pointer text-[11px] leading-none whitespace-nowrap tracking-tight"
        id="btn-floating-ai-assistant"
      >
        <div className="p-0.5 bg-white/20 rounded-full animate-pulse shrink-0">
          <Sparkles className="w-[13px] h-[13px] text-amber-300" />
        </div>
        <span>✨ AI Health Assistant</span>
      </motion.button>

      {/* Modal Overlay & Container */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
            >
              {/* Modal Top Bar */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-teal-500/20 border border-teal-400/30 rounded-2xl text-teal-300">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                      <span>✨ AI Health Assistant</span>
                    </h2>
                    <p className="text-xs text-slate-300 font-medium">
                      Smart Gemini AI Clinical & Nutrition Guidance
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                  id="btn-close-ai-modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Compact AI Assistant Menu Tabs */}
              <div className="p-2 bg-slate-100 border-b border-slate-200 flex items-center justify-start gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('diet')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    activeTab === 'diet'
                      ? 'bg-white text-teal-700 shadow-xs border-slate-200'
                      : 'bg-transparent text-slate-600 hover:bg-slate-200/70 border-transparent'
                  }`}
                  id="tab-ai-diet"
                >
                  <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                  <span>🥗 Diet AI</span>
                </button>

                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    activeTab === 'chat'
                      ? 'bg-white text-sky-700 shadow-xs border-slate-200'
                      : 'bg-transparent text-slate-600 hover:bg-slate-200/70 border-transparent'
                  }`}
                  id="tab-ai-chat"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
                  <span>💬 Health Chat</span>
                </button>
              </div>

              {/* Modal Body Content */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50">
                {activeTab === 'diet' && <DietAI onClose={() => setIsOpen(false)} />}
                {activeTab === 'chat' && <HealthChat onClose={() => setIsOpen(false)} />}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
