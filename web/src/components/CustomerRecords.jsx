import React, { useEffect, useState } from 'react';
import { invoiceApi, medicalApi } from '../api/clinic';
import { Modal } from '../design-system/components';
import { formatMoney } from './BookingWizard';

const date = value => value ? new Date(value).toLocaleDateString('vi-VN') : 'Chưa cập nhật';
const invoiceStatus = { PAID: 'Đã thanh toán', ISSUED: 'Chờ thanh toán', PENDING_PAYMENT: 'Chờ thanh toán',
  PARTIALLY_PAID: 'Thanh toán một phần', CANCELLED: 'Đã hủy', REFUNDED: 'Đã hoàn tiền' };

export default function CustomerRecords({ tab, pets, token }) {
  const [petId, setPetId] = useState('');
  const [records, setRecords] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const selectedPet = pets.find(pet => pet.id === petId);

  useEffect(() => {
    if (!pets.length) { setPetId(''); return; }
    if (!pets.some(pet => pet.id === petId)) setPetId(pets[0].id);
  }, [pets, petId]);

  useEffect(() => {
    let active = true;
    setError('');
    if (tab === 'health' && !petId) { setLoading(false); return; }
    setLoading(true);
    const request = tab === 'health'
      ? Promise.all([medicalApi.listRecordsByPet(petId, token), medicalApi.listVaccinationsByPet(petId, token)])
      : invoiceApi.listInvoices(token, { page: 0, size: 50 }).then(async first => {
        const rest = await Promise.all(Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, page) =>
          invoiceApi.listInvoices(token, { page: page + 1, size: 50 })));
        return [first, ...rest].flatMap(page => page.content || []);
      });
    request.then(result => {
      if (!active) return;
      if (tab === 'health') { setRecords(result[0] || []); setVaccinations(result[1] || []); }
      else setInvoices(result);
    }).catch(err => { if (active) setError(err.message || 'Không tải được dữ liệu.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab, petId, token, retry]);

  async function showInvoice(id) {
    setError('');
    try { setSelectedInvoice(await invoiceApi.getInvoice(id, token)); }
    catch (err) { setError(err.message || 'Không mở được hóa đơn.'); }
  }

  return <section className="pc-light pc-panel space-y-5">
    <div className="pc-heading"><div><h1>{tab === 'health' ? 'Sức khỏe của bé' : 'Hóa đơn của tôi'}</h1>
      <p>{tab === 'health' ? 'Bệnh án và lịch tiêm phòng đã được phòng khám ghi nhận.' : 'Xem chi tiết các hóa đơn dịch vụ của bạn.'}</p></div></div>
    {tab === 'health' && pets.length > 0 && <label className="pc-field">Chọn thú cưng
      <select value={petId} onChange={event => setPetId(event.target.value)}>
        {pets.map(pet => <option key={pet.id} value={pet.id}>{pet.name}</option>)}
      </select></label>}
    {loading && <p role="status">Đang tải dữ liệu…</p>}
    {error && <div className="pc-notice" role="alert">{error}<button type="button" className="pc-text-button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div>}
    {!loading && !error && tab === 'health' && (pets.length === 0 ? <p className="pc-muted">Thêm thú cưng để xem hồ sơ sức khỏe.</p> : <>
      <div><h2 className="pc-section-title">Bệnh án · {selectedPet?.name}</h2>
        {records.length ? <div className="space-y-3">{records.map(record => <article key={record.id} className="rounded-xl border border-slate-200 p-4">
          <strong>{date(record.visitDate)} · {record.diagnosis || 'Lần khám'}</strong>
          {record.vetName && <p>Bác sĩ {record.vetName}</p>}
          {record.treatment && <p>Điều trị: {record.treatment}</p>}
          {record.notes && <p>Ghi chú: {record.notes}</p>}
        </article>)}</div> : <p className="pc-muted">Bé chưa có bệnh án.</p>}
      </div>
      <div><h2 className="pc-section-title">Tiêm phòng · {selectedPet?.name}</h2>
        {vaccinations.length ? <div className="space-y-3">{vaccinations.map(vaccine => <article key={vaccine.id} className="rounded-xl border border-slate-200 p-4">
          <strong>{vaccine.vaccineName}</strong><p>Đã tiêm: {date(vaccine.administeredDate)}</p>
          {vaccine.nextDueDate && <p>Nhắc tiêm tiếp: {date(vaccine.nextDueDate)}</p>}
          {vaccine.vetName && <p>Bác sĩ {vaccine.vetName}</p>}
        </article>)}</div> : <p className="pc-muted">Bé chưa có thông tin tiêm phòng.</p>}
      </div>
    </>)}
    {!loading && !error && tab === 'invoices' && (invoices.length ? <div className="space-y-3">{invoices.map(invoice =>
      <article key={invoice.id} className="rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4">
        <div><strong>{invoice.invoiceNumber}</strong><p>{date(invoice.issuedAt)} · {invoiceStatus[invoice.status] || invoice.status}</p>
          <p>{formatMoney(invoice.totalAmount)}</p></div>
        <button type="button" className="pc-button pc-button--soft pc-button--small" onClick={() => showInvoice(invoice.id)}>Xem chi tiết</button>
      </article>)}</div> : <p className="pc-muted">Bạn chưa có hóa đơn.</p>)}
    <Modal isOpen={Boolean(selectedInvoice)} onClose={() => setSelectedInvoice(null)} title="Chi tiết hóa đơn" className="pc-light pc-dialog">
      {selectedInvoice && <div className="pc-invoice-print space-y-4">
        <h2>Pet Service · Hóa đơn {selectedInvoice.invoiceNumber}</h2>
        <p>Ngày phát hành: {date(selectedInvoice.issuedAt)}</p>
        <div className="space-y-2">{selectedInvoice.items.map((item, index) => <div key={index} className="flex justify-between gap-4">
          <span>{item.description} × {item.quantity}</span><strong>{formatMoney(item.subtotal)}</strong>
        </div>)}</div>
        <div className="border-t pt-3 flex justify-between"><strong>Tổng cộng</strong><strong>{formatMoney(selectedInvoice.totalAmount)}</strong></div>
        <p>{invoiceStatus[selectedInvoice.status] || selectedInvoice.status}</p>
        <button type="button" className="pc-button pc-invoice-print-action" onClick={() => window.print()}>In hoặc lưu PDF</button>
      </div>}
    </Modal>
  </section>;
}
