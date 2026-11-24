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
  Syringe,
  Edit3,
} from "lucide-react";
import { Card, Button, Badge, Input, Select, Modal, Table, Avatar } from '../../design-system/components';
import ClinicVisitQueue from '../../components/ClinicVisitQueue';
import ShiftAttendance from '../../components/ShiftAttendance';
import { clinicApi, medicalApi } from '../../api/clinic';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function VetDashboard({
  user,
  token,
  activeTab,
  setActiveTab,
  onApiLog,
}) {
  // ─── Danh sách thú cưng & Bệnh án thực tế ──────────────────────────────────
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [petSearch, setPetSearch] = useState("");

  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState("");

  // Edit Record Modal state
  const [editingRecord, setEditingRecord] = useState(null);
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editTreatment, setEditTreatment] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editVisitDate, setEditVisitDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // ─── Vắc xin tới hạn & Tiêm chủng ──────────────────────────────────────────
  const [dueVaccines, setDueVaccines] = useState([]);
  const [dueLoading, setDueLoading] = useState(false);
  const [dueError, setDueError] = useState("");
  const [dueDays, setDueDays] = useState(30);

  // ─── AI Diagnostic Advisor ────────────────────────────────────────────────
  const [aiDiagMessages, setAiDiagMessages] = useState([
    {
      sender: "ai",
      text: "Chào Bác sĩ! Tôi là Trợ lý AI Tham vấn Lâm sàng Thú y. Bác sĩ có thể nhập triệu chứng, kết quả xét nghiệm hoặc hỏi về phác đồ tương tác thuốc để tôi hỗ trợ tra cứu y văn nhanh chóng.",
    },
  ]);
  const [aiDiagInput, setAiDiagInput] = useState("");
  const [aiDiagLoading, setAiDiagLoading] = useState(false);

  // 1. Tải danh sách thú cưng khi vào tab medical hoặc prescriptions
  const fetchPets = async () => {
    if (!token) return;
    setPetsLoading(true);
    try {
      const res = await clinicApi.listPets(token);
      const list = res?.content || res || [];
      setPets(list);
      if (list.length > 0 && !selectedPetId) {
        setSelectedPetId(list[0].id);
      }
    } catch (err) {
      console.warn("Error fetching pets:", err);
    } finally {
      setPetsLoading(false);
    }
  };

  // 2. Tải danh sách bệnh án thực tế của thú cưng đang chọn
  const fetchPetRecords = async (petId) => {
    if (!token || !petId) return;
    setRecordsLoading(true);
    setRecordsError("");
    try {
      const data = await medicalApi.listRecordsByPet(petId, token);
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setRecordsError(err.message || "Không thể tải hồ sơ bệnh án của thú cưng này.");
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  // 3. Tải danh sách vắc xin sắp tới hạn
  const fetchDueVaccinations = async (days = 30) => {
    if (!token) return;
    setDueLoading(true);
    setDueError("");
    try {
      const data = await medicalApi.listDueVaccinations(days, token);
      setDueVaccines(Array.isArray(data) ? data : []);
    } catch (err) {
      setDueError(err.message || "Chưa tải được danh sách vắc xin tới hạn.");
      setDueVaccines([]);
    } finally {
      setDueLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "medical") {
      fetchPets();
    } else if (activeTab === "prescriptions") {
      fetchDueVaccinations(dueDays);
      fetchPets();
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (selectedPetId && activeTab === "medical") {
      fetchPetRecords(selectedPetId);
    }
  }, [selectedPetId, activeTab]);

  // Xử lý mở Modal sửa bệnh án
  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setEditDiagnosis(rec.diagnosis || "");
    setEditTreatment(rec.treatment || "");
    setEditNotes(rec.notes || "");
    setEditVisitDate(rec.visitDate || "");
    setEditError("");
  };

  // Lưu cập nhật bệnh án
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;
    setEditSaving(true);
    setEditError("");
    try {
      await medicalApi.updateRecord(editingRecord.id, {
        visitDate: editVisitDate,
        diagnosis: editDiagnosis.trim() || undefined,
        treatment: editTreatment.trim() || undefined,
        notes: editNotes.trim() || undefined,
      }, token);
      setEditingRecord(null);
      if (selectedPetId) fetchPetRecords(selectedPetId);
    } catch (err) {
      setEditError(err.message || "Cập nhật bệnh án thất bại.");
    } finally {
      setEditSaving(false);
    }
  };

  // Xử lý gửi tin nhắn AI Tham vấn
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
        `Đánh giá lâm sàng đối với trường hợp "${q}":\n1. Kiểm tra chỉ số sinh hiệu (nhiệt độ trực tràng, nhịp thở, CRT < 2s).\n2. Nếu có dấu hiệu mất nước cấp tính, chỉ định xét nghiệm CBC và sinh hóa chức năng gan thận (ALT, Creatinine).\n3. Cẩn trọng tương tác giữa NSAID và Corticosteroid nếu đang dùng đồng thời.`;

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

  const filteredPets = pets.filter(p =>
    !petSearch.trim() ||
    p.name?.toLowerCase().includes(petSearch.toLowerCase()) ||
    p.species?.toLowerCase().includes(petSearch.toLowerCase())
  );

  const selectedPet = pets.find(p => p.id === selectedPetId);

  return (
    <div className="space-y-6">
      <ShiftAttendance token={token} />
      {/* TAB 1: BỆNH ÁN ĐIỆN TỬ THỰC TẾ */}
      {activeTab === "medical" && (
        <div className="space-y-6">
          {/* Banner điều hướng nhanh vào khám ca trực */}
          <div className="p-4 bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                <Stethoscope size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Phòng khám lâm sàng đang hoạt động
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Để lập bệnh án cho ca hẹn hôm nay, hãy bấm vào hàng đợi khám và chọn <strong>"Vào khám & Kê đơn"</strong>.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Clock size={15} />}
              onClick={() => setActiveTab("schedule")}
            >
              Xem ca trực hôm nay
            </Button>
          </div>

          {/* Thanh chọn bệnh nhân tra cứu */}
          <Card variant="outlined" padding="md" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Card.Title className="text-base font-bold text-slate-900">
                  Hồ sơ Bệnh án điện tử (EMR)
                </Card.Title>
                <Card.Description className="text-xs text-slate-500 mt-0.5">
                  Tra cứu tiền sử bệnh, diễn tiến điều trị và các đợt khám của từng thú cưng
                </Card.Description>
              </div>

              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Tìm theo tên thú cưng..."
                  size="sm"
                  value={petSearch}
                  onChange={(e) => setPetSearch(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${recordsLoading ? "animate-spin" : ""}`} />}
                  onClick={() => selectedPetId && fetchPetRecords(selectedPetId)}
                >
                  Tải lại
                </Button>
              </div>
            </div>

            {/* Danh sách chọn nhanh thú cưng */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-medium flex-shrink-0">Thú cưng:</span>
              {petsLoading ? (
                <span className="text-slate-400">Đang tải danh sách thú cưng…</span>
              ) : filteredPets.length === 0 ? (
                <span className="text-slate-400 italic">Không tìm thấy thú cưng phù hợp</span>
              ) : (
                filteredPets.slice(0, 10).map((pet) => (
                  <button
                    key={pet.id}
                    type="button"
                    onClick={() => setSelectedPetId(pet.id)}
                    className={`px-3 py-1.5 rounded-lg border font-medium transition whitespace-nowrap ${
                      selectedPetId === pet.id
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    🐾 {pet.name} {pet.species ? `(${pet.species})` : ""}
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Chi tiết thú cưng đang chọn */}
          {selectedPet && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <strong className="text-slate-900 text-sm">{selectedPet.name}</strong>
                <span className="text-slate-500 ml-2">
                  Loài: <strong>{selectedPet.species || "Chưa rõ"}</strong>
                  {selectedPet.breed && ` · Giống: ${selectedPet.breed}`}
                  {selectedPet.weightKg && ` · Cân nặng: ${selectedPet.weightKg} kg`}
                </span>
              </div>
              {selectedPet.allergies && (
                <Badge variant="danger" size="xs">
                  Dị ứng: {selectedPet.allergies}
                </Badge>
              )}
            </div>
          )}

          {/* Danh sách các lần khám bệnh của bé */}
          {recordsLoading ? (
            <p className="text-slate-500 text-center py-8 text-sm" role="status">
              Đang tải danh sách bệnh án điện tử…
            </p>
          ) : recordsError ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              {recordsError}
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">Chưa có hồ sơ bệnh án nào cho bé</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Bé chưa có lịch sử điều trị trước đây. Khi ca khám trong ngày bắt đầu, bác sĩ hãy bấm "Vào khám & Kê đơn" trong hàng đợi để tạo bệnh án đầu tiên.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {records.map((rec) => (
                <Card
                  key={rec.id}
                  variant="outlined"
                  padding="lg"
                  className="hover:border-sky-300 transition duration-200 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <Badge variant="info" size="xs">
                        BA-{String(rec.id).slice(0, 8).toUpperCase()}
                      </Badge>
                      <span className="font-semibold text-slate-700 text-xs">
                        Bác sĩ điều trị: <strong className="text-slate-900">{rec.vetName || user?.fullName || "Bác sĩ thú y"}</strong>
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-slate-400">
                        Ngày khám: {rec.visitDate ? new Date(rec.visitDate).toLocaleDateString("vi-VN") : "Hôm nay"}
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Edit3 size={13} />}
                        onClick={() => handleOpenEdit(rec)}
                      >
                        Sửa ghi chú
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                      <span className="font-semibold text-slate-500 block uppercase text-[10px] tracking-wider">
                        Chẩn đoán lâm sàng & Triệu chứng
                      </span>
                      <p className="font-medium text-slate-900 whitespace-pre-line">
                        {rec.diagnosis || "Chưa ghi nhận chẩn đoán."}
                      </p>
                    </div>

                    <div className="p-3 bg-sky-50/60 border border-sky-100 rounded-xl space-y-1">
                      <span className="font-semibold text-sky-800 block uppercase text-[10px] tracking-wider">
                        Phác đồ điều trị & Đơn thuốc dặn dò
                      </span>
                      <p className="font-medium text-sky-950 whitespace-pre-line font-mono text-[11px]">
                        {rec.treatment || "Chưa có chỉ định dùng thuốc."}
                      </p>
                    </div>
                  </div>

                  {rec.notes && (
                    <div className="p-2.5 bg-amber-50/50 border border-amber-100 rounded-lg text-xs text-amber-900">
                      <strong>Dặn dò chủ nuôi:</strong> {rec.notes}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Modal chỉnh sửa bệnh án */}
          {editingRecord && (
            <Modal
              isOpen
              onClose={() => setEditingRecord(null)}
              title="Chỉnh sửa Hồ sơ bệnh án"
              size="lg"
              className="pc-light pc-dialog"
            >
              <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Mã bệnh án: <strong className="font-mono text-slate-700">{editingRecord.id}</strong></span>
                  <label className="flex items-center gap-1.5">
                    <span>Ngày khám:</span>
                    <input
                      type="date"
                      required
                      className="px-2 py-1 text-xs border border-slate-300 rounded"
                      value={editVisitDate}
                      onChange={(e) => setEditVisitDate(e.target.value)}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chẩn đoán lâm sàng
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    value={editDiagnosis}
                    onChange={(e) => setEditDiagnosis(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phác đồ điều trị & Đơn thuốc dặn dò
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                    value={editTreatment}
                    onChange={(e) => setEditTreatment(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dặn dò & Theo dõi
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>

                {editError && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
                    {editError}
                  </p>
                )}

                <div className="pt-2 flex justify-end space-x-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setEditingRecord(null)}>
                    Hủy
                  </Button>
                  <Button variant="primary" size="sm" type="submit" disabled={editSaving}>
                    {editSaving ? "Đang lưu…" : "Cập nhật bệnh án"}
                  </Button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      )}

      {/* TAB 2: LỊCH KHÁM & HÀNG ĐỢI TIẾP NHẬN */}
      {activeTab === "schedule" && <ClinicVisitQueue token={token} />}

      {/* TAB 3: SỔ TIÊM CHỦNG & THEO DÕI VẮC XIN TỚI HẠN */}
      {activeTab === "prescriptions" && (
        <div className="space-y-6">
          <Card variant="outlined" padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Card.Header className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <Syringe size={18} />
              </span>
              <div>
                <Card.Title className="text-base font-bold text-slate-900">
                  Sổ tiêm chủng & Theo dõi Vắc xin tới hạn
                </Card.Title>
                <Card.Description className="text-xs text-slate-500 mt-1">
                  Quản lý các đợt tiêm phòng định kỳ, số lô vắc xin và danh sách các bé cần nhắc lịch tiêm trong {dueDays} ngày tới
                </Card.Description>
              </div>
            </Card.Header>

            <div className="flex items-center space-x-2">
              <select
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                value={dueDays}
                onChange={(e) => {
                  const d = Number(e.target.value);
                  setDueDays(d);
                  fetchDueVaccinations(d);
                }}
              >
                <option value={7}>Trong 7 ngày tới</option>
                <option value={15}>Trong 15 ngày tới</option>
                <option value={30}>Trong 30 ngày tới</option>
                <option value={60}>Trong 60 ngày tới</option>
              </select>

              <Button
                variant="ghost"
                size="sm"
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${dueLoading ? "animate-spin" : ""}`} />}
                onClick={() => fetchDueVaccinations(dueDays)}
              >
                Tải lại
              </Button>
            </div>
          </Card>

          {/* Bảng danh sách vắc xin tới hạn */}
          {dueLoading ? (
            <p className="text-slate-500 text-center py-8 text-sm">Đang tải danh sách tiêm chủng tới hạn…</p>
          ) : dueError ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              {dueError}
            </div>
          ) : dueVaccines.length === 0 ? (
            <div className="p-10 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <Syringe className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">Không có lịch tiêm vắc xin nào tới hạn</h4>
              <p className="text-xs text-slate-500">
                Trong {dueDays} ngày tới không có mũi tiêm phòng nào cần nhắc lại.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dueVaccines.map((v) => (
                <Card key={v.id} variant="outlined" padding="md" className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{v.vaccineName}</h4>
                      <p className="text-xs text-slate-500">Bác sĩ thực hiện: {v.vetName || "Phòng khám"}</p>
                    </div>
                    <Badge variant="warning" size="xs">
                      Tới hạn tiêm
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Ngày tiêm trước:</span>
                      <strong>{new Date(v.administeredDate).toLocaleDateString("vi-VN")}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Ngày hẹn tái chủng:</span>
                      <strong className="text-amber-700">{v.nextDueDate ? new Date(v.nextDueDate).toLocaleDateString("vi-VN") : "Chưa đặt"}</strong>
                    </div>
                  </div>
                  {v.batchNumber && (
                    <div className="text-[11px] text-slate-400 font-mono">
                      Số lô: {v.batchNumber}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AI THAM VẤN LÂM SÀNG */}
      {activeTab === "ai-diagnostics" && (
        <div className="space-y-4">
          <Card variant="outlined" padding="md" className="flex items-center justify-between">
            <Card.Header className="flex items-center space-x-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <Card.Title className="text-base font-bold text-slate-900">
                  AI Hỗ trợ Tham vấn Lâm sàng Thú y
                </Card.Title>
                <Card.Description className="text-xs text-slate-500">
                  Tra cứu y văn, gợi ý chẩn đoán phân biệt, tính toán liều lượng dược lý và phác đồ cấp cứu
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
                    className={`max-w-[85%] shadow-sm ${
                      msg.sender === "user"
                        ? "rounded-2xl bg-sky-700 text-white"
                        : "rounded-2xl bg-slate-50 text-slate-800 border border-slate-200"
                    }`}
                  >
                    {msg.sender === "ai" && (
                      <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold mb-1">
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
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
                    <span className="text-slate-500 text-xs">
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
