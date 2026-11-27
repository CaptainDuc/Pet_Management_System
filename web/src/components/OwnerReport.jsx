import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Card } from '../design-system/components';
import { clinicApi } from '../api/clinic';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const number = new Intl.NumberFormat('vi-VN');

export default function OwnerReport({ token }) {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReport(null);
    setError('');
    clinicApi.ownerReport(token)
      .then(data => { if (active) setReport(data); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, reload]);

  const monthLabel = report && report.month.split('-').reverse().join('/');
  const metrics = report && [
    ['Doanh thu đã thu', money.format(report.totalRevenue), `${number.format(report.paidBookings)} lịch đã thanh toán trong tháng, tính theo ngày thu tiền.`],
    ['Lịch hẹn tạo mới', number.format(report.totalBookings), 'Tính theo ngày tạo, bao gồm cả lịch sau đó đã hủy.'],
    ['Lượt đã hoàn tất', number.format(report.completedBookings), 'Tính theo ngày chuyển lịch sang trạng thái hoàn tất.'],
  ];

  return <section className="space-y-5" aria-label="Báo cáo hoạt động">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-bold text-slate-900">Báo cáo hoạt động{report && ` · Tháng ${monthLabel}`}</h2>
      <Button variant="ghost" size="sm" disabled={loading} onClick={() => setReload(n => n + 1)}
        leftIcon={<RefreshCw size={15} />}>Cập nhật số liệu</Button>
    </div>
    {loading && <p role="status">Đang tải báo cáo…</p>}
    {error && <p role="alert" className="pc-notice">Chưa tải được báo cáo. {error}</p>}
    {report && <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map(([label, value, note]) => <Card key={label} variant="outlined" padding="md">
          <Card.Title className="text-sm">{label}</Card.Title>
          <p className="my-2 text-2xl font-bold text-slate-900">{value}</p>
          <Card.Description>{note}</Card.Description>
        </Card>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card variant="outlined" padding="md">
          <Card.Title>Doanh thu theo chi nhánh</Card.Title>
          {report.branches.length ? <dl className="mt-3 divide-y">{report.branches.map(branch =>
            <div key={branch.branchId || 'unassigned'} className="flex items-baseline justify-between gap-3 py-2">
              <dt>{branch.name}</dt><dd className="font-semibold whitespace-nowrap">{money.format(branch.revenue)}</dd>
            </div>)}</dl> : <p className="pc-muted mt-3">Tháng này chưa có lịch ghi nhận thanh toán.</p>}
        </Card>
        <Card variant="outlined" padding="md">
          <Card.Title>Dịch vụ trong lịch tạo mới</Card.Title>
          {report.services.length ? <dl className="mt-3 divide-y">{report.services.map(service =>
            <div key={service.serviceId} className="flex items-baseline justify-between gap-3 py-2">
              <dt>{service.name}</dt><dd className="font-semibold whitespace-nowrap">{number.format(service.quantity)} lượt</dd>
            </div>)}</dl> : <p className="pc-muted mt-3">Chưa có dịch vụ nào được đặt trong tháng.</p>}
        </Card>
      </div>
      <Card variant="outlined" padding="md">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><dt className="font-semibold">Đánh giá của khách hàng</dt>
            <dd className="pc-muted mt-1">{report.ratings.count
              ? `${number.format(report.ratings.average)} / 5 từ ${number.format(report.ratings.count)} đánh giá đã công khai, gửi trong tháng.`
              : 'Chưa có đánh giá công khai được gửi trong tháng.'}</dd></div>
          <div><dt className="font-semibold">Lợi nhuận gộp</dt>
            <dd className="pc-muted mt-1">Chưa có dữ liệu chi phí để tính lợi nhuận.</dd></div>
        </dl>
        {report.recentFeedback?.length > 0 && <div className="mt-4">
          <h3 className="font-semibold">Phản hồi gần đây trong tháng</h3>
          <ul className="divide-y">{report.recentFeedback.map(r => <li key={r.bookingId} className="py-2">
            <strong>{r.rating}/5 sao</strong> · BK-{r.bookingId.slice(0, 8).toUpperCase()} · {r.published ? 'Công khai' : 'Riêng tư'}
            {r.comment && <p className="break-words">{r.comment}</p>}
          </li>)}</ul>
        </div>}
      </Card>
    </>}
  </section>;
}
