import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchHealthChatReply, ChatMessage } from '../services/gemini';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  User, 
  Bot, 
  HeartPulse, 
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

interface HealthChatProps {
  onClose?: () => void;
}

export default function HealthChat({ onClose }: HealthChatProps) {
  const { userData } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: `Hello ${userData?.name ? userData.name.split(' ')[0] : 'there'}! 👋 I am your AI Health Chat Assistant.

I can help explain medical terms, answer general wellness questions, or discuss healthy habits in simple language.

What health question would you like to ask today?`
    }
  ]);

  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "What are common causes of headaches?",
    "What does high blood pressure mean?",
    "How can I improve my sleep quality?",
    "What does BMI measure?",
    "What should I do if I feel dehydrated?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setError('');
    setInput('');

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: text }
    ];

    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetchHealthChatReply({
        messages: newMessages,
        userProfile: {
          age: userData?.age ?? '',
          gender: userData?.gender ?? '',
          height: userData?.height ?? '',
          weight: userData?.weight ?? '',
          bloodGroup: userData?.bloodGroup ?? ''
        }
      });

      setMessages([
        ...newMessages,
        { role: 'model', content: response.content }
      ]);
    } catch (err: any) {
      setError(err?.message || 'Failed to get a response from AI Health Chat. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleClearChat() {
    setMessages([
      {
        role: 'model',
        content: `Conversation restarted. Hello ${userData?.name ? userData.name.split(' ')[0] : 'there'}! How can I assist you with general health or medical concepts today?`
      }
    ]);
    setError('');
    setInput('');
  }

  return (
    <div className="flex flex-col h-[580px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-50 via-teal-50 to-indigo-50 border-b border-slate-200 p-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-sm shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>AI Health Chat</span>
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                Interactive Session
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              General Educational Guidance & Health Explanations
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
          title="Clear chat and start fresh"
          id="btn-clear-chat"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* Quick Prompts Bar (When chat is fresh) */}
      {messages.length <= 2 && (
        <div className="p-3 bg-slate-50 border-b border-slate-150 shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-sky-600" />
            <span>Suggested Health Topics:</span>
          </p>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="px-3 py-1.5 bg-white hover:bg-sky-50 hover:text-sky-700 text-slate-700 border border-slate-200 hover:border-sky-200 rounded-xl whitespace-nowrap text-xs font-medium transition cursor-pointer shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                isUser ? 'bg-teal-600' : 'bg-sky-600'
              }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs space-y-2 ${
                isUser 
                  ? 'bg-teal-600 text-white rounded-tr-xs font-medium' 
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
              }`}>
                {/* Content text with clean paragraph formatting */}
                <div className="whitespace-pre-wrap font-sans">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-3.5 text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
              <span className="font-semibold">AI Health Assistant is typing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask any general health question (e.g. causes of headache, sleep advice)..."
            disabled={loading}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
            id="input-health-chat"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            id="btn-send-chat"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Medical Safety Disclaimer */}
        <p className="text-[10px] text-slate-400 text-center font-medium leading-tight px-2">
          AI-generated information is for educational purposes only and is not a medical diagnosis. Please consult a qualified healthcare professional for medical advice.
        </p>
      </div>
    </div>
  );
}
