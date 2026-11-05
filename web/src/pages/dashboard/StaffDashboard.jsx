import React, { useState } from 'react';
import {
  Bell, CreditCard, Users, Plus, Search, CheckCircle2,
  Clock, DollarSign, Printer, ArrowRight, X, Phone,
  FileText, Check, AlertCircle, Sparkles
} from 'lucide-react';

export default function StaffDashboard({ user, token, activeTab, setActiveTab }) {
  // Reception state
  const [receptionQueue, setReceptionQueue] = useState([
    {
      id: 'REC-101',
      time: '08:30',
      ownerName: 'Nguyễn Minh Anh',
      phone: '0901234567',
      petName: 'Lu Lu (Chó Husky)',
      service: 'Khám tổng quát & Tiêm dại',
      doctor: 'BS. Lê Minh Hoàng',
      status: 'WAITING_VET', // WAITING_CHECKIN | WAITING_VET | IN_EXAM | COMPLETED
      room: 'Phòng 1'
    },
    {
      id: 'REC-102',
      time: '09:00',
      ownerName: 'Trần Thu Hà',
      phone: '0988765432',
      petName: 'Miu Miu (Mèo Anh)',
      service: 'Tắm Spa & Vệ sinh tai',
      doctor: 'KTV. Thảo Vy',
      status: 'WAITING_CHECKIN',
      room: 'Phòng Spa 2'
    },
    {
      id: 'REC-103',
      time: '09:30',
      ownerName: 'Phạm Đức Duy',
      phone: '0912998877',
      petName: 'Cún Bông (Poodle)',
      service: 'Cạo vôi răng & Cắt tỉa lông',
      doctor: 'KTV. Tuấn Anh',
      status: 'IN_EXAM',
      room: 'Phòng Spa 1'
    }
  ]);

  const [showAddWalkinModal, setShowAddWalkinModal] = useState(false);
  const [newWalkin, setNewWalkin] = useState({
    ownerName: '',
    phone: '',
    petName: '',
    service: 'Khám tổng quát',
    doctor: 'BS. Lê Minh Hoàng'
  });

  // Billing / Invoices state
  const [invoices, setInvoices] = useState([
    {
      id: 'INV-2026-089',
      customer: 'Nguyễn Minh Anh (0901234567)',
      pet: 'Lu Lu (Husky)',
      items: 'Khám tổng quát (150.000) + Tiêm dại Rabisin (120.000) + Sữa tắm trị nấm (180.000)',
      total: 450000,
      discount: 45000,
      finalAmount: 405000,
      method: 'VNPay QR',
      status: 'PAID',
      time: '26/10/2026 10:15'
    },
    {
      id: 'INV-2026-090',
      customer: 'Trần Thu Hà (0988765432)',
      pet: 'Miu Miu (Mèo)',
      items: 'Vệ sinh tai trị ve (80.000) + Thuốc nhỏ tai Otomax (195.000)',
      total: 275000,
      discount: 0,
      finalAmount: 275000,
      method: 'Tiền mặt',
      status: 'PAID',
      time: '26/10/2026 11:20'
    },
    {
      id: 'INV-2026-091',
      customer: 'Hoàng Quốc Việt (0912334455)',
      pet: 'Bơ (Golden Retriever)',
      items: 'Cấp cứu viêm dạ dày (300.000) + Truyền dịch Ringer (150.000) + Thuốc men tiêu hóa (110.000)',
      total: 560000,
      discount: 50000,
      finalAmount: 510000,
      method: 'Chưa thanh toán',
      status: 'PENDING',
      time: '26/10/2026 11:45'
    }
  ]);

  const [showAddInvoiceModal, setShowAddInvoiceModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customer: '',
    pet: '',
    items: '',
    total: 350000,
    discount: 0,
    method: 'VNPay QR'
  });

  // Client Directory search state
  const [clientSearch, setClientSearch] = useState('');
  const [clients] = useState([
    {
      id: 'CLI-01',
      fullName: 'Nguyễn Minh Anh',
      phone: '0901234567',
      email: 'minhanh.nguyen@gmail.com',
      tier: 'GOLD',
      totalSpent: '4.850.000 đ',
      pets: ['Lu Lu (Chó Husky - 2 tuổi)']
    },
    {
      id: 'CLI-02',
      fullName: 'Trần Thu Hà',
      phone: '0988765432',
      email: 'thuha.tran@gmail.com',
      tier: 'SILVER',
      totalSpent: '1.920.000 đ',
      pets: ['Miu Miu (Mèo Anh lông ngắn - 1.5 tuổi)']
    },
    {
      id: 'CLI-03',
      fullName: 'Hoàng Quốc Việt',
      phone: '0912334455',
      email: 'quocviet.hoang@gmail.com',
      tier: 'PLATINUM',
      totalSpent: '9.200.000 đ',
      pets: ['Bơ (Golden Retriever - 3 tuổi)', 'Ken (Chó Corgi - 1 tuổi)']
    }
  ]);

  const handleCheckIn = (id) => {
    setReceptionQueue(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'WAITING_VET' } : item)
    );
  };

  const handleSendToDoctor = (id) => {
    setReceptionQueue(prev =>
      prev.map(item => item.id === id ? { ...item, status: 'IN_EXAM' } : item)
    );
  };

  const handleAddWalkin = (e) => {
    e.preventDefault();
    if (!newWalkin.ownerName.trim() || !newWalkin.petName.trim()) return;
    const item = {
      id: `REC-${Math.floor(100 + Math.random() * 900)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ownerName: newWalkin.ownerName,
      phone: newWalkin.phone || '0900000000',
      petName: newWalkin.petName,
      service: newWalkin.service,
      doctor: newWalkin.doctor,
      status: 'WAITING_VET',
      room: 'Phòng 1'
    };
    setReceptionQueue([item, ...receptionQueue]);
    setShowAddWalkinModal(false);
    setNewWalkin({ ownerName: '', phone: '', petName: '', service: 'Khám tổng quát', doctor: 'BS. Lê Minh Hoàng' });
  };

  const handlePayInvoice = (id, method) => {
    setInvoices(prev =>
      prev.map(inv => inv.id === id ? { ...inv, status: 'PAID', method: method || 'Tiền mặt' } : inv)
    );
  };

  const handleCreateInvoice = (e) => {
    e.preventDefault();
    const finalAmt = Math.max(0, Number(newInvoice.total) - Number(newInvoice.discount));
    const invItem = {
      id: `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`,
      customer: newInvoice.customer || 'Khách vãng lai',
      pet: newInvoice.pet || 'Thú cưng',
      items: newInvoice.items || 'Dịch vụ khám & Thuốc',
      total: Number(newInvoice.total),
      discount: Number(newInvoice.discount),
      finalAmount: finalAmt,
      method: newInvoice.method,
      status: 'PAID',
      time: new Date().toLocaleString('vi-VN')
    };
    setInvoices([invItem, ...invoices]);
    setShowAddInvoiceModal(false);
    setNewInvoice({ customer: '', pet: '', items: '', total: 350000, discount: 0, method: 'VNPay QR' });
  };

  const filteredClients = clients.filter(c =>
    c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  );

  return (
    <div className="space-y-6">
      {/* TAB 1: BÀN TIẾP ĐÓN & CHECK-IN */}
      {activeTab === 'reception' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  🛎️
                </span>
                <h2 className="text-lg font-bold text-slate-900">Bàn tiếp đón & Check-in sảnh chờ</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Quản lý luồng khách đến phòng khám, xác nhận check-in và điều phối thú cưng vào các phòng khám
              </p>
            </div>
            <button
              onClick={() => setShowAddWalkinModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tiếp đón khách vãng lai</span>
            </button>
          </div>

          <div className="space-y-3">
            {receptionQueue.map(item => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-14 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-center">
                    <Clock className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                    <span className="font-mono text-[11px] font-bold text-slate-700">{item.time}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-slate-900">{item.ownerName}</h4>
                      <span className="text-xs text-slate-500">({item.phone})</span>
                      <span className="font-semibold text-xs text-blue-600">• {item.petName}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {item.service} — Phụ trách: <strong className="text-slate-800">{item.doctor}</strong> ({item.room})
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  {item.status === 'WAITING_CHECKIN' ? (
                    <button
                      onClick={() => handleCheckIn(item.id)}
                      className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                    >
                      ✓ Xác nhận khách đã đến
                    </button>
                  ) : item.status === 'WAITING_VET' ? (
                    <button
                      onClick={() => handleSendToDoctor(item.id)}
                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                    >
                      Mời vào phòng khám →
                    </button>
                  ) : item.status === 'IN_EXAM' ? (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Đang khám trong {item.room}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-500">
                      Đã hoàn tất
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Modal Tiếp đón khách vãng lai */}
          {showAddWalkinModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Tiếp nhận khách vãng lai tại quầy</h3>
                  <button onClick={() => setShowAddWalkinModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddWalkin} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Họ tên chủ nuôi *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={newWalkin.ownerName}
                      onChange={e => setNewWalkin({ ...newWalkin, ownerName: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Số điện thoại *</label>
                    <input
                      type="text"
                      required
                      placeholder="0912 345 678"
                      value={newWalkin.phone}
                      onChange={e => setNewWalkin({ ...newWalkin, phone: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tên thú cưng (Giống loài) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Cún Lu (Poodle nâu 2kg)"
                      value={newWalkin.petName}
                      onChange={e => setNewWalkin({ ...newWalkin, petName: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Dịch vụ yêu cầu</label>
                    <select
                      value={newWalkin.service}
                      onChange={e => setNewWalkin({ ...newWalkin, service: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-sky-500 focus:outline-none"
                    >
                      <option value="Khám bệnh tổng quát">Khám bệnh tổng quát</option>
                      <option value="Cấp cứu khẩn cấp">Cấp cứu khẩn cấp</option>
                      <option value="Tiêm phòng vaccine định kỳ">Tiêm phòng vaccine định kỳ</option>
                      <option value="Tắm spa & Cắt tỉa lông">Tắm spa & Cắt tỉa lông</option>
                    </select>
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddWalkinModal(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs"
                    >
                      Xác nhận tiếp đón
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HÓA ĐƠN & THU NGÂN */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  🧾
                </span>
                <h2 className="text-lg font-bold text-slate-900">Quầy Thu ngân & Hóa đơn viện phí</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tạo hóa đơn dịch vụ, thanh toán VNPay QR, Tiền mặt, Thẻ và áp dụng giảm giá điểm thưởng
              </p>
            </div>
            <button
              onClick={() => setShowAddInvoiceModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo hóa đơn mới</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Số HĐ</th>
                    <th className="py-3 px-4 font-semibold">Khách hàng / Thú cưng</th>
                    <th className="py-3 px-4 font-semibold">Chi tiết dịch vụ & Thuốc</th>
                    <th className="py-3 px-4 font-semibold">Số tiền phải thu</th>
                    <th className="py-3 px-4 font-semibold">Hình thức</th>
                    <th className="py-3 px-4 font-semibold">Trạng thái</th>
                    <th className="py-3 px-4 font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{inv.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{inv.customer}</div>
                        <div className="text-[11px] text-blue-600">{inv.pet}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">{inv.items}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {inv.finalAmount.toLocaleString()} đ
                        {inv.discount > 0 && (
                          <div className="text-[10px] text-amber-600 font-normal">Đã giảm {inv.discount.toLocaleString()} đ</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700">{inv.method}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${inv.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                        >
                          {inv.status === 'PAID' ? 'Đã thanh toán' : 'Chờ thu tiền'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {inv.status === 'PENDING' ? (
                          <button
                            onClick={() => handlePayInvoice(inv.id, 'VNPay QR')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                          >
                            Thu tiền ngay
                          </button>
                        ) : (
                          <button
                            onClick={() => alert(`Đang in hóa đơn điện tử ${inv.id}...`)}
                            className="inline-flex items-center space-x-1 text-slate-500 hover:text-slate-800 text-xs font-medium"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>In phiếu</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Tạo hóa đơn */}
          {showAddInvoiceModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Tạo hóa đơn thanh toán</h3>
                  <button onClick={() => setShowAddInvoiceModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreateInvoice} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Khách hàng & SĐT *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Nguyễn Minh Anh (0901234567)"
                      value={newInvoice.customer}
                      onChange={e => setNewInvoice({ ...newInvoice, customer: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Thú cưng</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Lu Lu (Husky)"
                      value={newInvoice.pet}
                      onChange={e => setNewInvoice({ ...newInvoice, pet: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Chi tiết các khoản thu *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Khám bệnh + Thuốc kháng sinh + Dịch vụ spa..."
                      value={newInvoice.items}
                      onChange={e => setNewInvoice({ ...newInvoice, items: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tổng tiền gốc (VNĐ)</label>
                      <input
                        type="number"
                        value={newInvoice.total}
                        onChange={e => setNewInvoice({ ...newInvoice, total: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Giảm giá / Voucher (VNĐ)</label>
                      <input
                        type="number"
                        value={newInvoice.discount}
                        onChange={e => setNewInvoice({ ...newInvoice, discount: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Phương thức thanh toán</label>
                    <select
                      value={newInvoice.method}
                      onChange={e => setNewInvoice({ ...newInvoice, method: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="VNPay QR">Quét mã QR (VNPay / VietQR)</option>
                      <option value="Tiền mặt">Tiền mặt tại quầy</option>
                      <option value="Thẻ tín dụng / Ghi nợ POS">Quẹt thẻ POS ngân hàng</option>
                      <option value="Chuyển khoản">Chuyển khoản ngân hàng</option>
                    </select>
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddInvoiceModal(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs"
                    >
                      Xuất & Xác nhận thu
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TRA CỨU KHÁCH HÀNG & THÚ CƯNG */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  👥
                </span>
                <h2 className="text-lg font-bold text-slate-900">Danh bạ Khách hàng & Hồ sơ chủ nuôi</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tra cứu nhanh thông tin liên lạc, hạng thẻ tích điểm và các thú cưng đang sở hữu
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm theo tên hoặc SĐT..."
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs border border-slate-200 rounded-xl focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {filteredClients.map(c => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{c.fullName}</h4>
                    <p className="text-xs text-slate-500">{c.phone}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {c.tier}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-slate-500">Thú cưng đã đăng ký:</div>
                  {c.pets.map((p, idx) => (
                    <div key={idx} className="font-medium text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      🐾 {p}
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Tổng chi tiêu:</span>
                  <span className="font-bold text-slate-900">{c.totalSpent}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
