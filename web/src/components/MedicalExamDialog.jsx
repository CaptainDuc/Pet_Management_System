import React, { useEffect, useState } from 'react';
import { Stethoscope, History, Syringe, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp, FileText, Calendar } from 'lucide-react';
import { Modal, Button, Badge } from '../design-system/components';
import { clinicApi, medicalApi } from '../api/clinic';

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function MedicalExamDialog({ visit, token, onClose, onSaved }) {
  const [petDetails, setPetDetails] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyVaccines, setHistoryVaccines] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Form states
  const [visitDate, setVisitDate] = useState(todayIso);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');

  // Vaccination sub-form
  const [includeVaccine, setIncludeVaccine] = useState(
    visit.serviceName?.toLowerCase().includes('tiêm') || visit.serviceName?.toLowerCase().includes('vắc xin')
  );
  const [vaccineName, setVaccineName] = useState(
    visit.serviceName?.toLowerCase().includes('tiêm') ? visit.serviceName : ''
  );
  const [batchNumber, setBatchNumber] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');

  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!visit.petId) {
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);

    Promise.allSettled([
      clinicApi.getPet(visit.petId, token),
      medicalApi.listRecordsByPet(visit.petId, token),
      medicalApi.listVaccinationsByPet(visit.petId, token),
    ]).then(([petRes, recordsRes, vaccinesRes]) => {
      if (!active) return;
      if (petRes.status === 'fulfilled') setPetDetails(petRes.value);
      if (recordsRes.status === 'fulfilled') setHistoryRecords(recordsRes.value || []);
      if (vaccinesRes.status === 'fulfilled') setHistoryVaccines(vaccinesRes.value || []);
      setHistoryLoading(false);
    });

    return () => { active = false; };
  }, [visit.petId, token]);

  async function handleSave(completeAfterSave = false) {
    if (!diagnosis.trim() && !treatment.trim() && !notes.trim()) {
      setError('Vui lòng nhập ít nhất một nội dung: Chẩn đoán, Phác đồ điều trị hoặc Ghi chú dặn dò.');
      return;
    }

    if (includeVaccine && !vaccineName.trim()) {
      setError('Vui lòng nhập tên vắc xin tiêm chủng.');
      return;
    }

    setError('');
    completeAfterSave ? setCompleting(true) : setSaving(true);

    try {
      // 1. Ensure the visit is IN_PROGRESS before writing medical record (Backend access control requirement)
      if (visit.status !== 'IN_PROGRESS' && visit.status !== 'COMPLETED') {
        try {
          await clinicApi.visitAction(visit, 'start', token);
        } catch {
          // If already started or checked in, proceed
        }
      }

      // 2. Create Medical Record
      await medicalApi.createRecord({
        petId: visit.petId,
        visitDate,
        diagnosis: diagnosis.trim() || undefined,
        treatment: treatment.trim() || undefined,
        notes: notes.trim() || undefined,
      }, token);

      // 3. Create Vaccination if included
      if (includeVaccine && vaccineName.trim()) {
        await medicalApi.createVaccination({
          petId: visit.petId,
          vaccineName: vaccineName.trim(),
          administeredDate: visitDate,
          nextDueDate: nextDueDate ? nextDueDate : undefined,
          batchNumber: batchNumber.trim() || undefined,
        }, token);
      }

      // 4. Complete visit if requested
      if (completeAfterSave) {
        await clinicApi.visitAction(visit, 'complete', token);
        onSaved?.(`Đã lưu bệnh án và hoàn tất ca khám cho ${visit.petName}. Ca khám chuyển sang thu ngân.`);
      } else {
        onSaved?.(`Đã lưu thành công hồ sơ bệnh án cho ${visit.petName}.`);
      }
    } catch (err) {
      setError(err.message || 'Không thể lưu hồ sơ bệnh án. Vui lòng kiểm tra lại quyền truy cập.');
    } finally {
      setSaving(false);
      setCompleting(false);
    }
  }

  const busy = saving || completing;

  return (
    <Modal
      isOpen
      onClose={busy ? undefined : onClose}
      title="Khám bệnh lâm sàng & Ghi bệnh án"
      size="xl"
      className="pc-light pc-dialog"
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Header Thông tin ca khám */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <Stethoscope size={20} />
            </div>
            <div>
              <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                {visit.petName}
                {petDetails?.species && <span className="text-xs font-normal text-slate-500">({petDetails.species}{petDetails.breed ? ` · ${petDetails.breed}` : ''})</span>}
              </div>
              <div className="text-slate-500 text-xs mt-0.5">
                Chủ nuôi: <strong className="text-slate-700">{visit.customerName}</strong> · Dịch vụ: <strong className="text-sky-700">{visit.serviceName}</strong>
              </div>
            </div>
          </div>
          <div className="text-right text-xs">
            <Badge variant={visit.status === 'IN_PROGRESS' ? 'primary' : 'success'} size="xs">
              {visit.status === 'IN_PROGRESS' ? 'Đang khám' : visit.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Chờ khám'}
            </Badge>
            <div className="text-slate-400 font-mono mt-1">BK-{visit.bookingId.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>

        {/* Cảnh báo dị ứng hoặc thuốc đang dùng nếu có */}
        {petDetails?.allergies && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span><strong>Cảnh báo tiền sử dị ứng:</strong> {petDetails.allergies}</span>
          </div>
        )}

        {/* Tiền sử bệnh & vắc xin cũ (Collapsible) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            className="w-full px-4 py-2.5 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <span className="flex items-center gap-1.5">
              <History size={15} className="text-slate-500" />
              Tiền sử bệnh án & Sổ tiêm phòng cũ ({historyRecords.length} bệnh án · {historyVaccines.length} mũi tiêm)
            </span>
            {historyOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {historyOpen && (
            <div className="p-3 bg-white space-y-3 text-xs border-t border-slate-200">
              {historyLoading ? (
                <p className="text-slate-400 py-2">Đang tải lịch sử y khoa của bé…</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Cột bệnh án cũ */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-700 flex items-center gap-1">
                      <FileText size={13} className="text-sky-600" /> Các lần khám trước
                    </h4>
                    {historyRecords.length === 0 ? (
                      <p className="text-slate-400 italic">Chưa có hồ sơ bệnh án cũ.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {historyRecords.map(r => (
                          <div key={r.id} className="p-2 bg-slate-50 rounded border border-slate-100 space-y-1">
                            <div className="flex justify-between text-[11px] text-slate-500">
                              <span>{new Date(r.visitDate).toLocaleDateString('vi-VN')}</span>
                              <span className="font-semibold text-slate-600">{r.vetName || 'Bác sĩ'}</span>
                            </div>
                            {r.diagnosis && <p><strong>C/Đoán:</strong> {r.diagnosis}</p>}
                            {r.treatment && <p className="text-slate-600"><strong>Đ/Trị:</strong> {r.treatment}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cột tiêm phòng cũ */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-700 flex items-center gap-1">
                      <Syringe size={13} className="text-emerald-600" /> Mũi tiêm đã thực hiện
                    </h4>
                    {historyVaccines.length === 0 ? (
                      <p className="text-slate-400 italic">Chưa có bản ghi tiêm phòng.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {historyVaccines.map(v => (
                          <div key={v.id} className="p-2 bg-emerald-50/50 rounded border border-emerald-100 space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <strong className="text-emerald-800">{v.vaccineName}</strong>
                              <span className="text-slate-500">{new Date(v.administeredDate).toLocaleDateString('vi-VN')}</span>
                            </div>
                            {v.nextDueDate && <p className="text-[11px] text-amber-700">Tái chủng: {new Date(v.nextDueDate).toLocaleDateString('vi-VN')}</p>}
                            {v.batchNumber && <p className="text-[10px] text-slate-400">Lô: {v.batchNumber}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form ghi nhận ca khám hiện tại */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Stethoscope size={16} className="text-sky-600" />
              Nội dung khám & Đơn thuốc điều trị
            </h3>
            <label className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>Ngày khám:</span>
              <input
                type="date"
                className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                value={visitDate}
                onChange={e => setVisitDate(e.target.value)}
                disabled={busy}
              />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chẩn đoán lâm sàng & Triệu chứng <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="Vd: Viêm da dị ứng tiếp xúc, đỏ rát vùng bụng; tai có mủ nhẹ..."
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              disabled={busy}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phác đồ điều trị & Đơn thuốc dặn dò
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
              placeholder="Vd: 1. Otomax nhỏ tai 2 giọt/tai x 2 lần/ngày (7 ngày)&#10;2. Kháng sinh Cephalexin 250mg: 1 viên/lần x 2 lần/ngày sau ăn (5 ngày)"
              value={treatment}
              onChange={e => setTreatment(e.target.value)}
              disabled={busy}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dặn dò theo dõi & Lịch tái khám
            </label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="Vd: Giữ khô vùng tai, kiêng ăn thịt gà trong thời gian điều trị. Hẹn tái khám sau 7 ngày."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={busy}
            />
          </div>
        </div>

        {/* Khối tiêm vắc xin (Checkbox & Subform) */}
        <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900">
            <input
              type="checkbox"
              className="rounded text-amber-600 focus:ring-amber-500"
              checked={includeVaccine}
              onChange={e => setIncludeVaccine(e.target.checked)}
              disabled={busy}
            />
            <Syringe size={15} className="text-amber-600" />
            Ghi nhận mũi tiêm vắc xin / phòng dại trong buổi khám này
          </label>

          {includeVaccine && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Tên vắc xin *</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  placeholder="Vd: Vắc xin 7 bệnh Nobivac"
                  value={vaccineName}
                  onChange={e => setVaccineName(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Số lô sản xuất</label>
                <input
                  type="text"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  placeholder="Vd: B2026-X09"
                  value={batchNumber}
                  onChange={e => setBatchNumber(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Ngày hẹn tái chủng</label>
                <input
                  type="date"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                  value={nextDueDate}
                  onChange={e => setNextDueDate(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
          )}
        </div>

        {/* Thông báo lỗi nếu có */}
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2" role="alert">
            <AlertCircle size={15} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Nút thao tác */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
          <Button variant="ghost" size="sm" disabled={busy} onClick={onClose}>
            Đóng
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => handleSave(false)}
            >
              {saving ? 'Đang lưu…' : 'Lưu bệnh án'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              disabled={busy}
              onClick={() => handleSave(true)}
              leftIcon={<CheckCircle size={15} />}
            >
              {completing ? 'Đang hoàn tất…' : 'Lưu & Hoàn tất ca khám'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
