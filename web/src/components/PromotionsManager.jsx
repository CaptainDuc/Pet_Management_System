import React, { useState, useEffect } from 'react';
import {
  Tag, Plus, RefreshCw, Search, CheckCircle2, XCircle,
  AlertCircle, Edit, Trash2, Calendar, Percent, DollarSign,
  ToggleLeft, ToggleRight, Sparkles, Filter, X
} from 'lucide-react';
import { promotionApi } from '../api/clinic';

export default function PromotionsManager({ token, onApiLog }) {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ACTIVE, INACTIVE

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notification, setNotification] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minOrderAmount: '',
    maxUses: '',
    startDate: '',
    endDate: '',
    active: true
  });

  const fetchPromotions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await promotionApi.list(token);
      if (onApiLog) onApiLog({ status: 200, data });
      if (Array.isArray(data)) {
        setPromotions(data);
      }
    } catch (err) {
      console.error('Error fetching promotions:', err);
      showNotification('error', err.message || 'Không thể tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [token]);

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenCreateModal = () => {
    setEditingPromo(null);
    setFormData({
      code: '',
      name: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minOrderAmount: '0',
      maxUses: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      active: true
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (promo) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      name: promo.name,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minOrderAmount: promo.minOrderAmount || '0',
      maxUses: promo.maxUses || '',
      startDate: promo.startDate || '',
      endDate: promo.endDate || '',
      active: promo.active
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleToggle = async (promo) => {
    try {
      const updated = await promotionApi.toggle(promo.id, token);
      setPromotions(prev => prev.map(p => p.id === promo.id ? { ...p, active: updated.active } : p));
      showNotification('success', `${updated.active ? 'Kích hoạt' : 'Tạm dừng'} mã "${promo.code}" thành công`);
    } catch (err) {
      showNotification('error', err.message || 'Không thể đổi trạng thái mã');
    }
  };

  const handleDelete = async (promo) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mã "${promo.code}"?`)) return;
    try {
      await promotionApi.delete(promo.id, token);
      setPromotions(prev => prev.filter(p => p.id !== promo.id));
      showNotification('success', `Đã xóa mã khuyến mãi "${promo.code}"`);
    } catch (err) {
      // If server responded with soft-deactivation message or error
      fetchPromotions();
      showNotification('error', err.message || 'Không thể xóa mã khuyến mãi');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Vui lòng nhập tên chương trình');
      return;
    }

    if (!editingPromo && !formData.code.trim()) {
      setFormError('Vui lòng nhập mã khuyến mãi');
      return;
    }

    const val = parseFloat(formData.discountValue);
    if (isNaN(val) || val <= 0) {
      setFormError('Giá trị giảm giá phải lớn hơn 0');
      return;
    }

    if (formData.discountType === 'PERCENTAGE' && val > 100) {
      setFormError('Mức giảm theo phần trăm không được vượt quá 100%');
      return;
    }

    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      setFormError('Ngày kết thúc không được sớm hơn ngày bắt đầu');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        discountType: formData.discountType,
        discountValue: val,
        minOrderAmount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : 0,
        maxUses: formData.maxUses ? parseInt(formData.maxUses, 10) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        active: formData.active
      };

      if (editingPromo) {
        const updated = await promotionApi.update(editingPromo.id, payload, token);
        setPromotions(prev => prev.map(p => p.id === editingPromo.id ? updated : p));
        showNotification('success', `Cập nhật mã "${updated.code}" thành công`);
      } else {
        payload.code = formData.code.trim().toUpperCase();
        const created = await promotionApi.create(payload, token);
        setPromotions(prev => [created, ...prev]);
        showNotification('success', `Tạo mới mã "${created.code}" thành công`);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Thao tác không thành công');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filter & Search Logic
  const filteredPromotions = promotions.filter(p => {
    const matchesSearch =
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterStatus === 'ACTIVE') return p.active;
    if (filterStatus === 'INACTIVE') return !p.active;
    return true;
  });

  // Calculate statistics
  const totalCount = promotions.length;
  const activeCount = promotions.filter(p => p.active).length;
  const totalUses = promotions.reduce((sum, p) => sum + (p.usedCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium transition-all transform animate-in slide-in-from-bottom-5 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
              🎟️
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Quản lý Mã Giảm Giá & Khuyến Mãi</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập voucher giảm giá, giới hạn số lượt sử dụng và điều kiện áp dụng đơn khám
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchPromotions}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo mã khuyến mãi</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Tổng số voucher
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalCount}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Đã được cấu hình</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center">
            <Tag className="w-5 h-5 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Đang hoạt động
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</div>
            <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
              Khách có thể nhập & áp dụng
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Lượt đã sử dụng
            </span>
            <div className="text-2xl font-black text-blue-600 mt-1">{totalUses}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Lượt áp dụng thành công</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã hoặc tên voucher..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => setFilterStatus('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Đang bật ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('INACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'INACTIVE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Đã tắt ({totalCount - activeCount})
          </button>
        </div>
      </div>

      {/* Promotions Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                <th className="py-3 px-4 font-semibold">Mã Voucher</th>
                <th className="py-3 px-4 font-semibold">Chương trình & Điều kiện</th>
                <th className="py-3 px-4 font-semibold">Mức giảm</th>
                <th className="py-3 px-4 font-semibold">Lượt dùng</th>
                <th className="py-3 px-4 font-semibold">Thời hạn</th>
                <th className="py-3 px-4 font-semibold text-center">Trạng thái</th>
                <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPromotions.length > 0 ? (
                filteredPromotions.map(promo => {
                  const isExpired = promo.endDate && new Date(promo.endDate) < new Date(new Date().toDateString());
                  const isFullyUsed = promo.maxUses && promo.usedCount >= promo.maxUses;

                  return (
                    <tr key={promo.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-lg text-xs tracking-wider">
                            {promo.code}
                          </span>
                        </div>
                      </td>

                      {/* Name & Min Order */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900">{promo.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Đơn tối thiểu:{' '}
                          <span className="font-semibold text-slate-700">
                            {promo.minOrderAmount > 0
                              ? `${Number(promo.minOrderAmount).toLocaleString()} đ`
                              : '0 đ (Không giới hạn)'}
                          </span>
                        </div>
                      </td>

                      {/* Discount Value */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {promo.discountType === 'PERCENTAGE' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-bold">
                            <Percent className="w-3.5 h-3.5 text-amber-600" />
                            <span>Giảm {promo.discountValue}%</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg font-bold">
                            <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                            <span>Giảm {Number(promo.discountValue).toLocaleString()} đ</span>
                          </span>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {promo.usedCount || 0} / {promo.maxUses ? promo.maxUses : '∞'}
                        </div>
                        {promo.maxUses && (
                          <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isFullyUsed ? 'bg-rose-500' : 'bg-indigo-600'}`}
                              style={{ width: `${Math.min(100, ((promo.usedCount || 0) / promo.maxUses) * 100)}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                        <div>Từ: {promo.startDate || '—'}</div>
                        <div className="flex items-center space-x-1 mt-0.5">
                          <span>Đến: {promo.endDate || 'Vô thời hạn'}</span>
                          {isExpired && (
                            <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded font-semibold">
                              Hết hạn
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggle(promo)}
                          className="group inline-flex items-center space-x-1.5 focus:outline-hidden"
                          title="Bấm để bật/tắt"
                        >
                          {promo.active ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 group-hover:bg-emerald-100 transition">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Hoạt động</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-slate-200 transition">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>Tạm ngưng</span>
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEditModal(promo)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(promo)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Xóa mã"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-600">Không tìm thấy mã khuyến mãi nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? 'Thử tìm với từ khóa khác' : 'Bấm nút "Tạo mã khuyến mãi" để bắt đầu'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  🎟️
                </span>
                <h3 className="font-bold text-base text-slate-900">
                  {editingPromo ? `Chỉnh sửa mã: ${editingPromo.code}` : 'Tạo mới mã khuyến mãi'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Code & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã Voucher <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={!!editingPromo}
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="VD: PETCARE50, TET2026"
                    className="w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Tự động viết hoa không dấu</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên chương trình <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Tri ân khách hàng thân thiết"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Loại giảm giá <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountType: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="PERCENTAGE">Theo phần trăm (%)</option>
                    <option value="FIXED_AMOUNT">Số tiền cố định (VNĐ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mức giảm {formData.discountType === 'PERCENTAGE' ? '(%)' : '(VNĐ)'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max={formData.discountType === 'PERCENTAGE' ? '100' : undefined}
                    value={formData.discountValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, discountValue: e.target.value }))}
                    placeholder={formData.discountType === 'PERCENTAGE' ? 'VD: 15' : 'VD: 50000'}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Min Order & Max Uses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Đơn tối thiểu áp dụng (VNĐ)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, minOrderAmount: e.target.value }))}
                    placeholder="VD: 100000 (0 nếu không yêu cầu)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tổng lượt dùng tối đa
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUses}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxUses: e.target.value }))}
                    placeholder="Bỏ trống = không giới hạn"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày bắt đầu hiệu lực
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Bỏ trống nếu không hết hạn</span>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">Kích hoạt ngay</span>
                  <span className="text-[11px] text-slate-400">Cho phép khách hàng sử dụng mã này ngay khi lưu</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                  className="focus:outline-hidden"
                >
                  {formData.active ? (
                    <ToggleRight className="w-8 h-8 text-emerald-600 transition" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300 transition" />
                  )}
                </button>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition disabled:opacity-50"
                >
                  {formSubmitting ? 'Đang lưu...' : editingPromo ? 'Lưu thay đổi' : 'Tạo mã voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
