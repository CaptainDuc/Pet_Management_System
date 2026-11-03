import React, { useState, useEffect } from 'react';
import {
  Stethoscope, FileText, Calendar, Pill, Plus, Search,
  CheckCircle2, Clock, AlertTriangle, Sparkles, Send,
  ChevronRight, RefreshCw, X, Shield, Activity
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export default function VetDashboard({ user, token, activeTab, setActiveTab, onApiLog }) {
  // Medical Records State
  const [medicalRecords, setMedicalRecords] = useState([
    {
      id: 'MED-2026-001',
      petName: 'Lu Lu (Siberian Husky)',
      ownerName: 'Nguyễn Minh Anh',
      phone: '0901234567',
      date: '26/10/2026',
      diagnosis: 'Viêm da dị ứng thể tiếp xúc nhẹ',
      treatment: 'Bôi kem kháng viêm hydrocortisone 1%, tắm sữa tắm chuyên dụng trị nấm 2 lần/tuần',
      status: 'Đang theo dõi',
      nextFollowUp: '02/11/2026'
    },
    {
      id: 'MED-2026-002',
      petName: 'Miu Miu (Mèo Anh lông ngắn)',
      ownerName: 'Trần Thu Hà',
      phone: '0988765432',
      date: '24/10/2026',
      diagnosis: 'Ráy tai tích tụ nhiều, phát hiện ve tai Otodectes cynotis',
      treatment: 'Nhỏ dung dịch Otomax 2 giọt/tai x 2 lần/ngày trong 7 ngày, vệ sinh tai hằng ngày',
      status: 'Hồi phục tốt',
      nextFollowUp: '31/10/2026'
    },
    {
      id: 'MED-2026-003',
      petName: 'Bơ (Golden Retriever)',
      ownerName: 'Hoàng Quốc Việt',
      phone: '0912334455',
      date: '22/10/2026',
      diagnosis: 'Viêm dạ dày ruột cấp do ăn phải dị vật nhỏ',
      treatment: 'Truyền dịch Ringer Lactate 250ml, tiêm Metoclopramide chống nôn, nhịn ăn 12h',
      status: 'Đã hoàn tất',
      nextFollowUp: 'Đã xuất viện'
    }
  ]);

  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    petName: '',
    ownerName: '',
    phone: '',
    diagnosis: '',
    treatment: '',
    nextFollowUp: ''
  });

  // Doctor Schedule state
  const [vetSchedule, setVetSchedule] = useState([
    {
      id: 'SCH-01',
      time: '08:30 - 09:15',
      pet: 'Milu (Poodle trắng - 1.5 tuổi)',
      owner: 'Chị Mai Lan',
      service: 'Khám da liễu & Cắt móng',
      room: 'Phòng khám số 1',
      status: 'IN_PROGRESS'
    },
    {
      id: 'SCH-02',
      time: '09:30 - 10:15',
      pet: 'Lu Lu (Husky - 2 tuổi)',
      owner: 'Anh Minh Anh',
      service: 'Tái khám viêm da & Tiêm nhắc dại',
      room: 'Phòng khám số 1',
      status: 'PENDING'
    },
    {
      id: 'SCH-03',
      time: '10:30 - 11:30',
      pet: 'Tom (Mèo Ba Tư - 3 tuổi)',
      owner: 'Bác Hùng',
      service: 'Siêu âm ổ bụng & Xét nghiệm máu',
      room: 'Phòng Chẩn đoán hình ảnh',
      status: 'PENDING'
    },
    {
      id: 'SCH-04',
      time: '14:00 - 14:45',
      pet: 'Cún Đen (Chó cỏ - 8 tháng)',
      owner: 'Chị Thanh Nga',
      service: 'Tư vấn dinh dưỡng & Tẩy giun sán',
      room: 'Phòng khám số 1',
      status: 'PENDING'
    }
  ]);

  // Prescriptions state
  const [prescriptions, setPrescriptions] = useState([
    {
      id: 'TOA-401',
      patient: 'Lu Lu (Chó Husky)',
      doctor: user?.fullName || 'BS. Lê Minh Hoàng',
      date: '26/10/2026',
      medicines: [
        { name: 'Otomax Ear Drops', dosage: '2 giọt/tai x 2 lần/ngày', qty: '1 lọ', note: 'Nhỏ sau khi lau sạch tai' },
        { name: 'Omega 3 PetCare Nutri', dosage: '1 viên/ngày sau bữa ăn', qty: '1 hộp', note: 'Uống liên tục 30 ngày' }
      ]
    },
    {
      id: 'TOA-398',
      patient: 'Bơ (Chó Golden)',
      doctor: user?.fullName || 'BS. Lê Minh Hoàng',
      date: '22/10/2026',
      medicines: [
        { name: 'Metoclopramide 10mg', dosage: '1/2 viên x 2 lần/ngày', qty: '1 vỉ', note: 'Uống trước khi ăn 30 phút' },
        { name: 'Men tiêu hóa Enterogermina', dosage: '1 ống/ngày', qty: '10 ống', note: 'Uống cách kháng sinh 2 tiếng' }
      ]
    }
  ]);

  const [showAddPrescriptionModal, setShowAddPrescriptionModal] = useState(false);
  const [newPrescription, setNewPrescription] = useState({
    patient: '',
    medicineName: '',
    dosage: '',
    qty: '',
    note: ''
  });

  // AI Diagnostic Advisor
  const [aiDiagMessages, setAiDiagMessages] = useState([
    {
      sender: 'ai',
      text: 'Chào Bác sĩ! Tôi là Trợ lý AI Tham vấn Lâm sàng Thú y. Bác sĩ có thể nhập triệu chứng, kết quả xét nghiệm hoặc hỏi về phác đồ tương tác thuốc để tôi hỗ trợ tra cứu y văn nhanh chóng.'
    }
  ]);
  const [aiDiagInput, setAiDiagInput] = useState('');
  const [aiDiagLoading, setAiDiagLoading] = useState(false);

  const handleUpdateScheduleStatus = (id, newStatus) => {
    setVetSchedule(prev =>
      prev.map(item => item.id === id ? { ...item, status: newStatus } : item)
    );
  };

  const handleCreateRecord = (e) => {
    e.preventDefault();
    if (!newRecord.petName.trim()) return;
    const item = {
      id: `MED-2026-${String(medicalRecords.length + 1).padStart(3, '0')}`,
      petName: newRecord.petName,
      ownerName: newRecord.ownerName || 'Chủ nuôi',
      phone: newRecord.phone || '0900000000',
      date: new Date().toLocaleDateString('vi-VN'),
      diagnosis: newRecord.diagnosis,
      treatment: newRecord.treatment,
      status: 'Đang điều trị',
      nextFollowUp: newRecord.nextFollowUp || '7 ngày sau'
    };
    setMedicalRecords([item, ...medicalRecords]);
    setShowAddRecordModal(false);
    setNewRecord({ petName: '', ownerName: '', phone: '', diagnosis: '', treatment: '', nextFollowUp: '' });
  };

  const handleCreatePrescription = (e) => {
    e.preventDefault();
    if (!newPrescription.patient.trim() || !newPrescription.medicineName.trim()) return;
    const item = {
      id: `TOA-${Math.floor(400 + Math.random() * 500)}`,
      patient: newPrescription.patient,
      doctor: user?.fullName || 'BS. Thú Y',
      date: new Date().toLocaleDateString('vi-VN'),
      medicines: [
        {
          name: newPrescription.medicineName,
          dosage: newPrescription.dosage || '1 liều/ngày',
          qty: newPrescription.qty || '1 hộp',
          note: newPrescription.note || 'Theo chỉ dẫn'
        }
      ]
    };
    setPrescriptions([item, ...prescriptions]);
    setShowAddPrescriptionModal(false);
    setNewPrescription({ patient: '', medicineName: '', dosage: '', qty: '', note: '' });
  };

  const handleSendAiDiag = async (prompt) => {
    const q = prompt || aiDiagInput;
    if (!q.trim() || aiDiagLoading) return;

    setAiDiagMessages(prev => [...prev, { sender: 'user', text: q }]);
    if (!prompt) setAiDiagInput('');
    setAiDiagLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ question: `[Hỏi lâm sàng thú y] ${q}` })
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });

      const reply = data?.tip || data?.data?.tip || data?.response ||
        `Đánh giá lâm sàng đối với trường hợp "${q}":\n1. Kiểm tra chỉ số sinh hiệu (nhiệt độ trực tràng, nhịp thở, mao mạch CRT < 2s).\n2. Nếu có dấu hiệu mất nước cấp tính, chỉ định xét nghiệm công thức máu CBC và sinh hóa chức năng gan thận (ALT, Creatinine).\n3. Cẩn trọng tương tác giữa NSAID và Corticosteroid nếu đang dùng đồng thời.`;

      setAiDiagMessages(prev => [...prev, { sender: 'ai', text: reply }]);
    } catch {
      setAiDiagMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Gợi ý chẩn đoán: Khuyến cáo bác sĩ chụp X-quang ổ bụng và kiểm tra nồng độ men gan ALT/AST. Tránh phối hợp nhóm aminoglycoside với furosemide vì tăng nguy cơ độc trên tai và thận.'
        }
      ]);
    } finally {
      setAiDiagLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* TAB 1: BỆNH ÁN ĐIỆN TỬ */}
      {activeTab === 'medical' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  🩺
                </span>
                <h2 className="text-lg font-bold text-slate-900">Bệnh án điện tử thú cưng (EMR)</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Lịch sử khám chữa bệnh, chẩn đoán triệu chứng, xét nghiệm lâm sàng và theo dõi hồi phục
              </p>
            </div>
            <button
              onClick={() => setShowAddRecordModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Lập bệnh án mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {medicalRecords.map(rec => (
              <div
                key={rec.id}
                className="bg-white border border-slate-200 hover:border-teal-400 rounded-2xl p-5 shadow-xs transition duration-200 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
                      {rec.id}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">{rec.petName}</h3>
                    <span className="text-xs text-slate-400">• Chủ nuôi: {rec.ownerName} ({rec.phone})</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400">Ngày khám: {rec.date}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {rec.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-500 block uppercase text-[10px] tracking-wider">Chẩn đoán lâm sàng</span>
                    <p className="font-medium text-slate-900">{rec.diagnosis}</p>
                  </div>
                  <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 space-y-1">
                    <span className="font-semibold text-teal-700 block uppercase text-[10px] tracking-wider">Phác đồ điều trị & Lời dặn</span>
                    <p className="font-medium text-teal-900">{rec.treatment}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                  <span>Hẹn tái khám: <strong className="text-slate-800">{rec.nextFollowUp}</strong></span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setNewPrescription(prev => ({ ...prev, patient: rec.petName }));
                        setActiveTab('prescriptions');
                        setShowAddPrescriptionModal(true);
                      }}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg font-medium transition"
                    >
                      Kê đơn thuốc cho ca này
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Lập bệnh án mới */}
          {showAddRecordModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Lập hồ sơ bệnh án thú cưng mới</h3>
                  <button onClick={() => setShowAddRecordModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreateRecord} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tên thú cưng (Giống loài) *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ví dụ: Lu Lu (Husky 2 tuổi)"
                        value={newRecord.petName}
                        onChange={e => setNewRecord({ ...newRecord, petName: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tên chủ nuôi</label>
                      <input
                        type="text"
                        placeholder="Nguyễn Văn A"
                        value={newRecord.ownerName}
                        onChange={e => setNewRecord({ ...newRecord, ownerName: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Số điện thoại liên hệ</label>
                    <input
                      type="text"
                      placeholder="0912 345 678"
                      value={newRecord.phone}
                      onChange={e => setNewRecord({ ...newRecord, phone: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Chẩn đoán bệnh / Triệu chứng lâm sàng *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Mô tả thân nhiệt, nhịp thở, vị trí tổn thương, chẩn đoán..."
                      value={newRecord.diagnosis}
                      onChange={e => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Phác đồ điều trị & Hướng dẫn dùng thuốc *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Các thuốc chỉ định, đường dùng, hướng dẫn chủ chăm sóc..."
                      value={newRecord.treatment}
                      onChange={e => setNewRecord({ ...newRecord, treatment: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Hẹn ngày tái khám</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: 03/11/2026 hoặc 5 ngày sau"
                      value={newRecord.nextFollowUp}
                      onChange={e => setNewRecord({ ...newRecord, nextFollowUp: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddRecordModal(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-xs"
                    >
                      Lưu bệnh án
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LỊCH KHÁM & CA TRỰC HÔM NAY */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  📅
                </span>
                <h2 className="text-lg font-bold text-slate-900">Lịch khám phụ trách hôm nay</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Danh sách thú cưng đăng ký khám với Bác sĩ {user?.fullName || 'Trưởng khoa'}
              </p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 font-semibold rounded-xl text-xs border border-blue-200">
              Tổng số ca: {vetSchedule.length}
            </span>
          </div>

          <div className="space-y-3">
            {vetSchedule.map(item => (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-14 h-12 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-center">
                    <Clock className="w-3.5 h-3.5 text-slate-500 mb-0.5" />
                    <span className="font-mono text-[10px] font-bold text-slate-700 leading-tight">{item.time.split(' - ')[0]}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-slate-900">{item.pet}</h4>
                      <span className="text-xs text-slate-400">({item.owner})</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{item.service} • <span className="text-teal-600 font-medium">{item.room}</span></p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  {item.status === 'IN_PROGRESS' ? (
                    <button
                      onClick={() => handleUpdateScheduleStatus(item.id, 'COMPLETED')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                    >
                      ✓ Hoàn tất ca khám
                    </button>
                  ) : item.status === 'COMPLETED' ? (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-500">
                      Đã hoàn tất
                    </span>
                  ) : (
                    <button
                      onClick={() => handleUpdateScheduleStatus(item.id, 'IN_PROGRESS')}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                    >
                      Tiếp nhận khám
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: KÊ ĐƠN THUỐC */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  💊
                </span>
                <h2 className="text-lg font-bold text-slate-900">Kê đơn thuốc & Dược phẩm thú y</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Quản lý các toa thuốc điện tử đã kê cho thú cưng và xuất phiếu chỉ dẫn liều dùng
              </p>
            </div>
            <button
              onClick={() => setShowAddPrescriptionModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Kê toa mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {prescriptions.map(p => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                      {p.id}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 mt-1">{p.patient}</h4>
                  </div>
                  <span className="text-[11px] text-slate-400">{p.date}</span>
                </div>

                <div className="space-y-2 text-xs">
                  {p.medicines.map((m, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-800">{m.name}</div>
                        <div className="text-[11px] text-slate-500">{m.dosage} • {m.note}</div>
                      </div>
                      <span className="font-mono font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        {m.qty}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-right">
                  <span className="text-[11px] text-slate-400">Bác sĩ ký đơn: </span>
                  <span className="text-xs font-semibold text-slate-700">{p.doctor}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Kê toa mới */}
          {showAddPrescriptionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Kê toa thuốc điện tử mới</h3>
                  <button onClick={() => setShowAddPrescriptionModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleCreatePrescription} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Bệnh nhân thú cưng *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Lu Lu (Husky 2 tuổi)"
                      value={newPrescription.patient}
                      onChange={e => setNewPrescription({ ...newPrescription, patient: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tên thuốc thú y *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Amoxicillin Clavulanate 250mg"
                      value={newPrescription.medicineName}
                      onChange={e => setNewPrescription({ ...newPrescription, medicineName: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Liều lượng</label>
                      <input
                        type="text"
                        placeholder="1/2 viên x 2 lần/ngày"
                        value={newPrescription.dosage}
                        onChange={e => setNewPrescription({ ...newPrescription, dosage: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Số lượng cấp</label>
                      <input
                        type="text"
                        placeholder="1 vỉ (10 viên)"
                        value={newPrescription.qty}
                        onChange={e => setNewPrescription({ ...newPrescription, qty: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Lời dặn & Hướng dẫn sử dụng</label>
                    <input
                      type="text"
                      placeholder="Uống sau khi ăn no, ngưng nếu có dấu hiệu nôn ói"
                      value={newPrescription.note}
                      onChange={e => setNewPrescription({ ...newPrescription, note: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddPrescriptionModal(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-xs"
                    >
                      Ký & Xuất toa thuốc
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AI THAM VẤN LÂM SÀNG */}
      {activeTab === 'ai-diagnostics' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">AI Hỗ trợ Tham vấn Lâm sàng Thú y</h2>
                <p className="text-xs text-slate-500">
                  Tra cứu y văn, phân tích ca bệnh khó, tương tác dược lý học và khuyến cáo điều trị
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col h-[520px] overflow-hidden">
            <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center space-x-2 overflow-x-auto text-xs">
              <span className="text-slate-400 flex-shrink-0 font-medium">Tra cứu ca bệnh mẫu:</span>
              <button
                onClick={() => handleSendAiDiag('Phác đồ điều trị Parvovirus ở chó con dưới 3 tháng tuổi')}
                className="px-2.5 py-1 bg-white hover:bg-teal-50 hover:text-teal-700 text-slate-600 border border-slate-200 rounded-lg whitespace-nowrap transition"
              >
                🔬 Phác đồ Parvo chó con?
              </button>
              <button
                onClick={() => handleSendAiDiag('Tương tác thuốc giữa Meloxicam và Prednisolone')}
                className="px-2.5 py-1 bg-white hover:bg-teal-50 hover:text-teal-700 text-slate-600 border border-slate-200 rounded-lg whitespace-nowrap transition"
              >
                ⚠️ Meloxicam + Prednisolone?
              </button>
              <button
                onClick={() => handleSendAiDiag('Chẩn đoán phân biệt hội chứng vàng da (Jaundice) ở mèo')}
                className="px-2.5 py-1 bg-white hover:bg-teal-50 hover:text-teal-700 text-slate-600 border border-slate-200 rounded-lg whitespace-nowrap transition"
              >
                🐱 Vàng da ở mèo?
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
              {aiDiagMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-xs ${msg.sender === 'user'
                      ? 'bg-teal-600 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/80'
                      }`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="flex items-center space-x-1.5 text-teal-700 font-semibold mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>PetCare Clinical AI Advisor</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {aiDiagLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-500 rounded-2xl p-3 text-xs flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
                    <span>AI đang tra cứu dữ liệu lâm sàng và đối chiếu y văn...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAiDiag();
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  placeholder="Nhập triệu chứng, tiền sử hoặc câu hỏi lâm sàng cần AI hỗ trợ..."
                  value={aiDiagInput}
                  onChange={e => setAiDiagInput(e.target.value)}
                  className="flex-1 h-10 px-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!aiDiagInput.trim() || aiDiagLoading}
                  className="h-10 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 shadow-xs"
                >
                  <span>Tham vấn</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
