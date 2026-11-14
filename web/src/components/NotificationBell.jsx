import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { notificationApi } from '../api/notifications';

function formatRelative(value) {
  if (!value) return '';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

export default function NotificationBell({ token }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef(null);

  const loadUnread = async () => {
    if (!token) return;
    try {
      const data = await notificationApi.unreadCount(token);
      setUnread(Number(data?.count || 0));
    } catch {
      // service tạm thời không khả dụng, giữ badge cũ
    }
  };

  const loadItems = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const page = await notificationApi.list(token, { page: 0, size: 10 });
      setItems(page?.content || []);
    } catch (err) {
      setError(err.message || 'Không tải được thông báo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnread();
    const timer = setInterval(loadUnread, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!open) return;
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleItemClick = async (item) => {
    if (!item.isRead) {
      try {
        await notificationApi.markRead(item.id, token);
        setItems(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
        setUnread(prev => Math.max(0, prev - 1));
      } catch {
        // bỏ qua lỗi đánh dấu đã đọc
      }
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationApi.markAllRead(token);
      setItems(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      // bỏ qua lỗi
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
        aria-label="Thông báo"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-[60]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">Thông báo</h3>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unread === 0}
              className="inline-flex items-center space-x-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-300"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Đọc tất cả</span>
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="py-8 text-center text-xs text-slate-500">Đang tải thông báo...</div>
            )}
            {!loading && error && (
              <div className="py-8 px-4 text-center text-xs text-rose-600">{error}</div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="py-10 text-center text-xs text-slate-400">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                Chưa có thông báo nào
              </div>
            )}
            {!loading && !error && items.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition ${
                  item.isRead ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-start space-x-2">
                  {!item.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  <div className={item.isRead ? 'pl-4' : ''}>
                    <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{formatRelative(item.createdAt)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
