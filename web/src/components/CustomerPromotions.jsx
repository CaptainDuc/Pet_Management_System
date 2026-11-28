import React, { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Gift, RefreshCw } from 'lucide-react';
import { promotionApi } from '../api/clinic';
import { formatMoney, localDate } from './BookingWizard';

export default function CustomerPromotions({ token, onBook }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    promotionApi.mine(token)
      .then(rows => { if (alive) setItems(rows || []); })
      .catch(err => { if (alive) setError(err.message || 'Không tải được ưu đãi.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, reload]);

  return <>
    <div className="pc-heading"><div><h1>Ưu đãi của tôi</h1><p>Những mã phòng khám đã tặng bạn, sẵn sàng dùng khi đặt lịch cho bé.</p></div></div>
    {loading ? <div className="pc-empty" role="status"><RefreshCw /><p>Đang tải ưu đãi...</p></div>
      : error ? <div className="pc-notice" role="alert"><AlertCircle size={18} /><span>{error}</span><button className="pc-text-button" onClick={() => setReload(value => value + 1)}>Thử lại</button></div>
        : items.length === 0 ? <div className="pc-empty"><Gift /><h3>Chưa có mã ưu đãi</h3><p>Khi phòng khám tặng mã cho bạn, mã sẽ xuất hiện tại đây. Bạn vẫn có thể đặt lịch chăm sóc cho bé.</p><button className="pc-button pc-button--soft" onClick={() => onBook(null)}><CalendarDays size={18} />Đặt lịch</button></div>
          : <div className="space-y-4">{items.map(item => {
            const today = localDate();
            const available = item.active && (!item.startDate || item.startDate <= today) && (item.maxUses == null || item.usedCount < item.maxUses);
            return <article className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[#e1eaf4] bg-white p-5" key={item.id}>
              <div className="space-y-1"><h2 className="text-lg font-bold">{item.name}</h2><p className="font-semibold text-[var(--color-role-customer-main)]">{item.code}</p><p className="pc-muted">Giảm {item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : formatMoney(item.discountValue)}{Number(item.minOrderAmount) > 0 ? ` · Đơn từ ${formatMoney(item.minOrderAmount)}` : ''}{item.endDate ? ` · Đến ${new Date(`${item.endDate}T00:00:00`).toLocaleDateString('vi-VN')}` : ''}</p>{!available && <p className="pc-muted">{!item.active ? 'Chương trình đang tạm dừng.' : item.startDate > today ? `Dùng từ ${new Date(`${item.startDate}T00:00:00`).toLocaleDateString('vi-VN')}.` : 'Mã đã hết lượt sử dụng.'}</p>}</div>
              {available && <button className="pc-button pc-button--small" onClick={() => onBook(item)}><CalendarDays size={16} />Đặt lịch với mã này</button>}
            </article>;
          })}</div>}
  </>;
}
