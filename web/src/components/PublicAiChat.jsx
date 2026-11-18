import React, { useEffect, useState } from 'react';
import { MessageCircle, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import AiMessageText from './AiMessageText';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const INITIAL_MESSAGE = {
  sender: 'ai',
  text: 'Xin chào! Mình là trợ lý AI thú y PetCare. Ở chế độ khách, mình chỉ tư vấn chẩn đoán, triệu chứng và chăm sóc. Đăng nhập để đặt lịch khám.',
};

export default function PublicAiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener('open-public-ai-chat', openChat);
    return () => window.removeEventListener('open-public-ai-chat', openChat);
  }, []);

  const handleSend = async (event) => {
    event.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setMessages(prev => [...prev, { sender: 'user', text: question }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/ai/tips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      let answer = data?.answer || data?.data?.answer
        || 'Xin lỗi, mình chưa có câu trả lời phù hợp. Bạn nên đưa thú cưng đến bác sĩ thú y để kiểm tra.';
      if (data?.needsLogin) {
        answer += '\n\nBạn có thể đăng nhập để đặt lịch khám.';
      }
      setMessages(prev => [...prev, { sender: 'ai', text: answer }]);
    } catch {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: 'Không kết nối được hệ thống tư vấn. Vui lòng thử lại sau.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 left-5 z-40">
      {open && (
        <div className="mb-3 flex h-[460px] w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Trợ lý AI Thú y</p>
                <p className="text-[10px] text-slate-500">Chế độ khách - chỉ chẩn đoán</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Đóng trợ lý AI"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3 text-xs">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    message.sender === 'user'
                      ? 'rounded-br-sm bg-blue-600 text-white'
                      : 'rounded-bl-sm border border-slate-200 bg-slate-100 text-slate-800'
                  }`}
                >
                  {message.sender === 'ai' ? (
                    <AiMessageText text={message.text} />
                  ) : (
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center space-x-2 text-slate-500">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                <span>AI đang phân tích...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-slate-200 p-2.5">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={event => setInput(event.target.value)}
                placeholder="Mô tả triệu chứng của thú cưng..."
                className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="flex h-9 items-center space-x-1 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                <span>Gửi</span>
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              <a href="/login" className="font-medium text-blue-600 hover:underline">Đăng nhập</a>
              {' '}để đặt lịch khám.
            </p>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-2xl shadow-blue-500/30 transition hover:scale-105"
        aria-label="Mở trợ lý AI thú y"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
