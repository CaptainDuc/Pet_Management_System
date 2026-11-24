import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  FileText,
  Calendar,
  Pill,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Send,
  ChevronRight,
  RefreshCw,
  X,
  Shield,
  Activity,
} from "lucide-react";
import { Card, Button, Badge, Input, Select, Modal, Table, Avatar } from '../../design-system/components';

import ClinicVisitQueue from '../../components/ClinicVisitQueue';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function VetDashboard({
  user,
  token,
  activeTab,
  setActiveTab,
  onApiLog,
}) {
  // Medical Records State
  const [medicalRecords, setMedicalRecords] = useState([
    {
      id: "MED-2026-001",
      petName: "Lu Lu (Siberian Husky)",
      ownerName: "Nguyễn Minh Anh",
      phone: "0901234567",
      date: "26/10/2026",
      diagnosis: "Viêm da dị ứng thể tiếp xúc nhẹ",
      treatment:
        "Bôi kem kháng viêm hydrocortisone 1%, tắm sữa tắm chuyên dụng trị nấm 2 lần/tuần",
      status: "Đang theo dõi",
      nextFollowUp: "02/11/2026",
    },
    {
      id: "MED-2026-002",
      petName: "Miu Miu (Mèo Anh lông ngắn)",
      ownerName: "Trần Thu Hà",
      phone: "0988765432",
      date: "24/10/2026",
      diagnosis: "Ráy tai tích tụ nhiều, phát hiện ve tai Otodectes cynotis",
      treatment:
        "Nhỏ dung dịch Otomax 2 giọt/tai x 2 lần/ngày trong 7 ngày, vệ sinh tai hằng ngày",
      status: "Hồi phục tốt",
      nextFollowUp: "31/10/2026",
    },
    {
      id: "MED-2026-003",
      petName: "Bơ (Golden Retriever)",
      ownerName: "Hoàng Quốc Việt",
      phone: "0912334455",
      date: "22/10/2026",
      diagnosis: "Viêm dạ dày ruột cấp do ăn phải dị vật nhỏ",
      treatment:
        "Truyền dịch Ringer Lactate 250ml, tiêm Metoclopramide chống nôn, nhịn ăn 12h",
      status: "Đã hoàn tất",
      nextFollowUp: "Đã xuất viện",
    },
  ]);

  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [newRecord, setNewRecord] = useState({
    petName: "",
    ownerName: "",
    phone: "",
    diagnosis: "",
    treatment: "",
    nextFollowUp: "",
  });

  // Prescriptions state
  const [prescriptions, setPrescriptions] = useState([
    {
      id: "TOA-401",
      patient: "Lu Lu (Chó Husky)",
      doctor: user?.fullName || "BS. Lê Minh Hoàng",
      date: "26/10/2026",
      medicines: [
        {
          name: "Otomax Ear Drops",
          dosage: "2 giọt/tai x 2 lần/ngày",
          qty: "1 lọ",
          note: "Nhỏ sau khi lau sạch tai",
        },
        {
          name: "Omega 3 PetCare Nutri",
          dosage: "1 viên/ngày sau bữa ăn",
          qty: "1 hộp",
          note: "Uống liên tục 30 ngày",
        },
      ],
    },
    {
      id: "TOA-398",
      patient: "Bơ (Chó Golden)",
      doctor: user?.fullName || "BS. Lê Minh Hoàng",
      date: "22/10/2026",
      medicines: [
        {
          name: "Metoclopramide 10mg",
          dosage: "1/2 viên x 2 lần/ngày",
          qty: "1 vỉ",
          note: "Uống trước khi ăn 30 phút",
        },
        {
          name: "Men tiêu hóa Enterogermina",
          dosage: "1 ống/ngày",
          qty: "10 ống",
          note: "Uống cách kháng sinh 2 tiếng",
        },
      ],
    },
  ]);

  const [showAddPrescriptionModal, setShowAddPrescriptionModal] =
    useState(false);
  const [newPrescription, setNewPrescription] = useState({
    patient: "",
    medicineName: "",
    dosage: "",
    qty: "",
    note: "",
  });

  // AI Diagnostic Advisor
  const [aiDiagMessages, setAiDiagMessages] = useState([
    {
      sender: "ai",
      text: "Chào Bác sĩ! Tôi là Trợ lý AI Tham vấn Lâm sàng Thú y. Bác sĩ có thể nhập triệu chứng, kết quả xét nghiệm hoặc hỏi về phác đồ tương tác thuốc để tôi hỗ trợ tra cứu y văn nhanh chóng.",
    },
  ]);
  const [aiDiagInput, setAiDiagInput] = useState("");
  const [aiDiagLoading, setAiDiagLoading] = useState(false);

  const handleCreateRecord = (e) => {
    e.preventDefault();
    if (!newRecord.petName.trim()) return;
    const item = {
      id: `MED-2026-${String(medicalRecords.length + 1).padStart(3, "0")}`,
      petName: newRecord.petName,
      ownerName: newRecord.ownerName || "Chủ nuôi",
      phone: newRecord.phone || "0900000000",
      date: new Date().toLocaleDateString("vi-VN"),
      diagnosis: newRecord.diagnosis,
      treatment: newRecord.treatment,
      status: "Đang điều trị",
      nextFollowUp: newRecord.nextFollowUp || "7 ngày sau",
    };
    setMedicalRecords([item, ...medicalRecords]);
    setShowAddRecordModal(false);
    setNewRecord({
      petName: "",
      ownerName: "",
      phone: "",
      diagnosis: "",
      treatment: "",
      nextFollowUp: "",
    });
  };

  const handleCreatePrescription = (e) => {
    e.preventDefault();
    if (!newPrescription.patient.trim() || !newPrescription.medicineName.trim())
      return;
    const item = {
      id: `TOA-${Math.floor(400 + Math.random() * 500)}`,
      patient: newPrescription.patient,
      doctor: user?.fullName || "BS. Thú Y",
      date: new Date().toLocaleDateString("vi-VN"),
      medicines: [
        {
          name: newPrescription.medicineName,
          dosage: newPrescription.dosage || "1 liều/ngày",
          qty: newPrescription.qty || "1 hộp",
          note: newPrescription.note || "Theo chỉ dẫn",
        },
      ],
    };
    setPrescriptions([item, ...prescriptions]);
    setShowAddPrescriptionModal(false);
    setNewPrescription({
      patient: "",
      medicineName: "",
      dosage: "",
      qty: "",
      note: "",
    });
  };

  const handleSendAiDiag = async (prompt) => {
    const q = prompt || aiDiagInput;
    if (!q.trim() || aiDiagLoading) return;

    setAiDiagMessages((prev) => [...prev, { sender: "user", text: q }]);
    if (!prompt) setAiDiagInput("");
    setAiDiagLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/tips`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question: `[Hỏi lâm sàng thú y] ${q}` }),
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });

      const reply =
        data?.tip ||
        data?.data?.tip ||
        data?.response ||
        `Đánh giá lâm sàng đối với trường hợp "${q}":\n1. Kiểm tra chỉ số sinh hiệu (nhiệt độ trực tràng, nhịp thở, mao mạch CRT < 2s).\n2. Nếu có dấu hiệu mất nước cấp tính, chỉ định xét nghiệm công thức máu CBC và sinh hóa chức năng gan thận (ALT, Creatinine).\n3. Cẩn trọng tương tác giữa NSAID và Corticosteroid nếu đang dùng đồng thời.`;

      setAiDiagMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    } catch {
      setAiDiagMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Gợi ý chẩn đoán: Khuyến cáo bác sĩ chụp X-quang ổ bụng và kiểm tra nồng độ men gan ALT/AST. Tránh phối hợp nhóm aminoglycoside với furosemide vì tăng nguy cơ độc trên tai và thận.",
        },
      ]);
    } finally {
      setAiDiagLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {['medical', 'prescriptions'].includes(activeTab) && <p className="pc-demo-note">Màn hình đang dùng hồ sơ minh họa. Các thao tác ở đây chưa lưu thành dữ liệu khám bệnh thực tế.</p>}
      {/* TAB 1: BỆNH ÁN ĐIỆN TỬ */}
      {activeTab === "medical" && (
        <div className="space-y-6">
          <Card variant="outlined" padding="lg" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-[var(--color-role-veterinarian-bg)] text-[var(--color-role-veterinarian-text)] flex items-center justify-center font-bold">
                  <Stethoscope size={18} />
                </span>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">
                  Bệnh án điện tử thú cưng (EMR)
                </Card.Title>
              </div>
              <Card.Description className="text-xs text-slate-500 mt-1">
                Lịch sử khám chữa bệnh, chẩn đoán triệu chứng, xét nghiệm lâm
                sàng và theo dõi hồi phục
              </Card.Description>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddRecordModal(true)}
            >
              Lập bệnh án mới
            </Button>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {medicalRecords.map((rec) => (
              <Card
                key={rec.id}
                variant="outlined"
                padding="lg"
                className="hover:border-teal-400 transition duration-200 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-3">
                    <Badge variant="info" size="xs">
                      {rec.id}
                    </Badge>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {rec.petName}
                    </h3>
                    <span className="text-xs text-slate-400">
                      • Chủ nuôi: {rec.ownerName} ({rec.phone})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400">
                      Ngày khám: {rec.date}
                    </span>
                    <Badge variant="success" size="xs">
                      {rec.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <Card variant="outlined" padding="sm" className="bg-slate-50 border-slate-100 space-y-1">
                    <span className="font-semibold text-slate-500 block uppercase text-[10px] tracking-wider">
                      Chẩn đoán lâm sàng
                    </span>
                    <p className="font-medium text-slate-900">{rec.diagnosis}</p>
                  </Card>
                  <Card variant="outlined" padding="sm" className="bg-[var(--color-role-veterinarian-bg)] border-[var(--color-role-veterinarian-border)] space-y-1">
                    <span className="font-semibold text-[var(--color-role-veterinarian-text)] block uppercase text-[10px] tracking-wider">
                      Phác đồ điều trị & Lời dặn
                    </span>
                    <p className="font-medium text-[var(--color-role-veterinarian-dark)]">{rec.treatment}</p>
                  </Card>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                  <span>
                    Hẹn tái khám:{" "}
                    <strong className="text-slate-800">{rec.nextFollowUp}</strong>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewPrescription((prev) => ({ ...prev, patient: rec.petName }));
                      setActiveTab("prescriptions");
                      setShowAddPrescriptionModal(true);
                    }}
                  >
                    Kê đơn thuốc cho ca này
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Modal
            className="pc-light pc-work pc-work-dialog"
            open={showAddRecordModal}
            onClose={() => setShowAddRecordModal(false)}
            title="Lập hồ sơ bệnh án thú cưng mới"
            size="lg"
          >
            <form onSubmit={handleCreateRecord} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Tên thú cưng (Giống loài) *"
                  required
                  placeholder="Ví dụ: Lu Lu (Husky 2 tuổi)"
                  value={newRecord.petName}
                  onChange={(e) => setNewRecord({ ...newRecord, petName: e.target.value })}
                />
                <Input
                  label="Tên chủ nuôi"
                  placeholder="Nguyễn Văn A"
                  value={newRecord.ownerName}
                  onChange={(e) => setNewRecord({ ...newRecord, ownerName: e.target.value })}
                />
              </div>
              <Input
                label="Số điện thoại liên hệ"
                type="tel"
                placeholder="0912 345 678"
                value={newRecord.phone}
                onChange={(e) => setNewRecord({ ...newRecord, phone: e.target.value })}
              />
              <Input
                label="Chẩn đoán bệnh / Triệu chứng lâm sàng *"
                as="textarea"
                rows={2}
                required
                placeholder="Mô tả thân nhiệt, nhịp thở, vị trí tổn thương, chẩn đoán..."
                value={newRecord.diagnosis}
                onChange={(e) => setNewRecord({ ...newRecord, diagnosis: e.target.value })}
              />
              <Input
                label="Phác đồ điều trị & Hướng dẫn dùng thuốc *"
                as="textarea"
                rows={2}
                required
                placeholder="Các thuốc chỉ định, đường dùng, hướng dẫn chủ chăm sóc..."
                value={newRecord.treatment}
                onChange={(e) => setNewRecord({ ...newRecord, treatment: e.target.value })}
              />
              <Input
                label="Hẹn ngày tái khám"
                placeholder="Ví dụ: 03/11/2026 hoặc 5 ngày sau"
                value={newRecord.nextFollowUp}
                onChange={(e) => setNewRecord({ ...newRecord, nextFollowUp: e.target.value })}
              />
              <div className="pt-2 flex justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => setShowAddRecordModal(false)}>
                  Hủy
                </Button>
                <Button type="submit">Lưu bệnh án</Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {activeTab === 'schedule' && <ClinicVisitQueue token={token} />}

      {/* TAB 3: KÊ ĐƠN THUỐC */}
      {activeTab === "prescriptions" && (
        <div className="space-y-6">
          <Card variant="outlined" padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Card.Header className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-[var(--color-role-veterinarian-bg)] text-[var(--color-role-veterinarian-text)] flex items-center justify-center font-bold">
                <Pill size={18} />
              </span>
              <div>
                <Card.Title className="text-lg font-bold text-[var(--color-fg-primary)]">
                  Kê đơn thuốc & Dược phẩm thú y
                </Card.Title>
                <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                  Quản lý các toa thuốc điện tử đã kê cho thú cưng và xuất phiếu
                  chỉ dẫn liều dùng
                </Card.Description>
              </div>
            </Card.Header>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowAddPrescriptionModal(true)}
            >
              Kê toa mới
            </Button>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {prescriptions.map((p) => (
              <Card key={p.id} variant="outlined" padding="md" className="space-y-3">
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <Badge variant="warning" size="sm" className="font-mono text-xs">
                      {p.id}
                    </Badge>
                    <h4 className="font-bold text-sm text-slate-900 mt-1">
                      {p.patient}
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">{p.date}</span>
                </div>

                <div className="space-y-2 text-xs">
                  {p.medicines.map((m, idx) => (
                    <Card key={idx} variant="subtle" padding="sm" className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {m.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {m.dosage} • {m.note}
                        </div>
                      </div>
                      <Badge variant="ghost" size="xs" className="font-mono font-semibold text-[11px]">
                        {m.qty}
                      </Badge>
                    </Card>
                  ))}
                </div>

                <div className="pt-2 text-right">
                  <span className="text-[11px] text-slate-400">
                    Bác sĩ ký đơn:{" "}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {p.doctor}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Modal Kê toa mới */}
          <Modal
            className="pc-light pc-work pc-work-dialog"
            isOpen={showAddPrescriptionModal}
            onClose={() => setShowAddPrescriptionModal(false)}
            title="Kê toa thuốc điện tử mới"
            size="md"
          >
            <form
              onSubmit={handleCreatePrescription}
              className="space-y-3.5 text-xs"
            >
              <Input
                label="Bệnh nhân thú cưng *"
                required
                placeholder="Ví dụ: Lu Lu (Husky 2 tuổi)"
                value={newPrescription.patient}
                onChange={(e) =>
                  setNewPrescription({
                    ...newPrescription,
                    patient: e.target.value,
                  })
                }
                fullWidth
              />
              <Input
                label="Tên thuốc thú y *"
                required
                placeholder="Ví dụ: Amoxicillin Clavulanate 250mg"
                value={newPrescription.medicineName}
                onChange={(e) =>
                  setNewPrescription({
                    ...newPrescription,
                    medicineName: e.target.value,
                  })
                }
                fullWidth
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Liều lượng"
                  placeholder="1/2 viên x 2 lần/ngày"
                  value={newPrescription.dosage}
                  onChange={(e) =>
                    setNewPrescription({
                      ...newPrescription,
                      dosage: e.target.value,
                    })
                  }
                  fullWidth
                />
                <Input
                  label="Số lượng cấp"
                  placeholder="1 vỉ (10 viên)"
                  value={newPrescription.qty}
                  onChange={(e) =>
                    setNewPrescription({
                      ...newPrescription,
                      qty: e.target.value,
                    })
                  }
                  fullWidth
                />
              </div>
              <Input
                label="Lời dặn & Hướng dẫn sử dụng"
                placeholder="Uống sau khi ăn no, ngưng nếu có dấu hiệu nôn ói"
                value={newPrescription.note}
                onChange={(e) =>
                  setNewPrescription({
                    ...newPrescription,
                    note: e.target.value,
                  })
                }
                fullWidth
              />
              <div className="pt-2 flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setShowAddPrescriptionModal(false)}
                >
                  Đóng
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Ký & Xuất toa thuốc
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* TAB 4: AI THAM VẤN LÂM SÀNG */}
      {activeTab === "ai-diagnostics" && (
        <div className="space-y-4">
          <Card variant="outlined" padding="md" className="flex items-center justify-between">
            <Card.Header className="flex items-center space-x-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--gradient-green)] text-white flex items-center justify-center font-bold text-base shadow-[var(--shadow-sm)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <Card.Title className="text-base font-bold text-slate-900">
                  AI Hỗ trợ Tham vấn Lâm sàng Thú y
                </Card.Title>
                <Card.Description className="text-xs text-slate-500">
                  Tra cứu y văn, phân tích ca bệnh khó, tương tác dược lý học và
                  khuyến cáo điều trị
                </Card.Description>
              </div>
            </Card.Header>
          </Card>

          <Card variant="outlined" className="flex flex-col h-[520px] overflow-hidden">
            <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center space-x-2 overflow-x-auto text-xs">
              <span className="text-slate-400 flex-shrink-0 font-medium">
                Tra cứu ca bệnh mẫu:
              </span>
              <Button
                variant="ghost"
                size="xs"
                className="whitespace-nowrap"
                leftIcon={<Activity className="w-3 h-3 text-teal-600" />}
                onClick={() =>
                  handleSendAiDiag(
                    "Phác đồ điều trị Parvovirus ở chó con dưới 3 tháng tuổi"
                  )
                }
              >
                Phác đồ Parvo chó con?
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="whitespace-nowrap"
                leftIcon={<AlertTriangle className="w-3 h-3 text-amber-600" />}
                onClick={() =>
                  handleSendAiDiag(
                    "Tương tác thuốc giữa Meloxicam và Prednisolone"
                  )
                }
              >
                Meloxicam + Prednisolone?
              </Button>
              <Button
                variant="ghost"
                size="xs"
                className="whitespace-nowrap"
                leftIcon={<Stethoscope className="w-3 h-3 text-sky-600" />}
                onClick={() =>
                  handleSendAiDiag(
                    "Chẩn đoán phân biệt hội chứng vàng da (Jaundice) ở mèo"
                  )
                }
              >
                Vàng da ở mèo?
              </Button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
              {aiDiagMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${
                    msg.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <Card
                    variant={msg.sender === "user" ? "filled" : "outlined"}
                    padding="md"
                    className={`max-w-[85%] shadow-[var(--shadow-sm)] ${
                      msg.sender === "user"
                        ? "rounded-[var(--radius-card-lg)] bg-[var(--color-role-veterinarian-main)] text-white"
                        : "rounded-[var(--radius-card-lg)] bg-[var(--color-neutral-100)] text-[var(--color-fg-primary)] border border-[var(--color-bd-light)]"
                    }`}
                  >
                    {msg.sender === "ai" && (
                      <div className="flex items-center space-x-1.5 text-teal-700 font-semibold mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>PetCare Clinical AI Advisor</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </Card>
                </div>
              ))}
              {aiDiagLoading && (
                <div className="flex justify-start">
                  <Card variant="subtle" padding="sm" className="flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--color-role-veterinarian-main)]" />
                    <span className="text-[var(--color-fg-tertiary)] text-xs">
                      AI đang tra cứu dữ liệu lâm sàng và đối chiếu y văn...
                    </span>
                  </Card>
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
                <Input
                  type="text"
                  placeholder="Nhập triệu chứng, tiền sử hoặc câu hỏi lâm sàng cần AI hỗ trợ..."
                  value={aiDiagInput}
                  onChange={(e) => setAiDiagInput(e.target.value)}
                  fullWidth
                  size="sm"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!aiDiagInput.trim() || aiDiagLoading}
                  rightIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Tham vấn
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
