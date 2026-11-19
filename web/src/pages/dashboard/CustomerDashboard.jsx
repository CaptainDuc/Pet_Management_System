import React, { useState, useEffect } from 'react';
import {
  Heart, Calendar, Award, MessageSquare, Plus, Search,
  CheckCircle2, Clock, AlertCircle, Sparkles, Send,
  ChevronRight, Phone, Mail, ShieldCheck, FileText,
  User, Check, X, RefreshCw, Dog, Cat, DollarSign, QrCode
} from 'lucide-react';
import { clinicApi } from '../../api/clinic';
import VietQrPaymentModal from '../../components/VietQrPaymentModal';
import { Card, Input, Button, Badge, Table, Modal, Avatar, Select } from '../../design-system/components';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const BOOKING_STATUS_CONFIG = {
  PENDING: { label: 'Chờ duyệt', variant: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', variant: 'info' },
  IN_PROGRESS: { label: 'Đang khám', variant: 'info' },
  COMPLETED: { label: 'Đã hoàn tất', variant: 'success' },
  CANCELLED: { label: 'Đã hủy', variant: 'error' },
};

const PAYMENT_STATUS_CONFIG = {
  UNPAID: { label: 'Chưa thanh toán', variant: 'error' },
  PAID: { label: 'Đã thanh toán', variant: 'success' },
  REFUNDED: { label: 'Đã hoàn tiền', variant: 'ghost' },
};

const FALLBACK_DOG_AVATAR = 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&auto=format&fit=crop&q=80';
const FALLBACK_CAT_AVATAR = 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400&auto=format&fit=crop&q=80';

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function tomorrowISODate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toISODate(date);
}

function formatAge(dateOfBirth) {
  if (!dateOfBirth) return 'Chưa cập nhật';
  const birth = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 'Chưa cập nhật';

  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;

  if (months < 1) return 'Dưới 1 tháng';
  if (months < 12) return `${months} tháng`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths ? `${years} tuổi ${remainingMonths} tháng` : `${years} tuổi`;
}

function mapPet(pet) {
  const notes = pet.notes || '';
  const breedMatch = notes.match(/Giống:\s*([^.|]+)/i);
  const allergyMatch = notes.match(/Dị ứng:\s*(.+)$/i);
  const isDog = String(pet.species || '').toLowerCase().includes('chó');

  return {
    id: pet.id,
    name: pet.name,
    species: pet.species,
    breed: breedMatch?.[1]?.trim() || 'Chưa cập nhật',
    gender: pet.gender || 'Chưa cập nhật',
    age: formatAge(pet.dateOfBirth),
    weight: pet.weight ? `${Number(pet.weight)} kg` : 'Chưa cập nhật',
    avatarUrl: pet.photoUrl || (isDog ? FALLBACK_DOG_AVATAR : FALLBACK_CAT_AVATAR),
    lastVaccine: 'Chưa cập nhật',
    allergies: allergyMatch?.[1]?.trim() || notes || 'Không có',
    status: pet.isActive === false ? 'Ngừng theo dõi' : 'Khỏe mạnh',
  };
}

function formatSlotTime(value) {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapBooking(booking, pets) {
  const items = booking.items || [];
  const firstItem = items[0];
  const pet = pets.find(p => p.id === booking.petId);
  const startTime = firstItem?.startTime ? new Date(firstItem.startTime) : null;

  return {
    id: booking.id,
    code: `BK-${String(booking.id).slice(0, 8).toUpperCase()}`,
    petName: pet?.name || 'Thú cưng',
    service: items.map(item => item.serviceName).filter(Boolean).join(', ') || 'Dịch vụ khám',
    date: startTime ? startTime.toLocaleDateString('vi-VN') : 'Chưa xác định',
    time: formatSlotTime(firstItem?.startTime),
    doctor: firstItem?.staffId ? `NV ${String(firstItem.staffId).slice(0, 8)}` : 'Chưa phân công',
    status: booking.status || 'PENDING',
    paymentStatus: booking.paymentStatus || 'UNPAID',
    promotionCode: booking.promotionCode || '',
    discountAmount: Number(booking.discountAmount || 0),
    staffNote: booking.staffNote || '',
    rawAmount: Number(booking.totalAmount || 0),
    price: booking.totalAmount != null
      ? `${Number(booking.totalAmount).toLocaleString('vi-VN')} đ`
      : '—',
  };
}

export default function CustomerDashboard({ user, token, activeTab, setActiveTab, onApiLog }) {
  // My Pets state
  const [pets, setPets] = useState([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petError, setPetError] = useState('');

  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [newPet, setNewPet] = useState({
    name: '',
    species: 'Chó',
    breed: '',
    gender: 'Đực',
    dateOfBirth: '',
    weight: '',
    allergies: ''
  });
  const [savingPet, setSavingPet] = useState(false);

  // Bookings state
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [services, setServices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [promotionCheck, setPromotionCheck] = useState(null);
  const [checkingPromotion, setCheckingPromotion] = useState(false);

  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [newBooking, setNewBooking] = useState({
    petId: '',
    serviceId: '',
    date: tomorrowISODate(),
    timeSlotId: '',
    staffId: '',
    note: '',
    promotionCode: ''
  });

  // Loyalty state
  const [loyaltyData, setLoyaltyData] = useState({
    points: 1250,
    tier: 'GOLD',
    lifetimePoints: 2400,
    nextTierPoints: 3000
  });
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [redeemedVouchers, setRedeemedVouchers] = useState([]);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState([
    {
      sender: 'ai',
      text: 'Xin chào bạn! Tôi là Trợ lý AI Bác sĩ Thú y PetCare. Bạn đang quan sát thấy thú cưng có triệu chứng gì bất thường, hoặc cần tư vấn dinh dưỡng và chăm sóc không?'
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Fetch Loyalty from backend /api/v1/loyalty/me
  const fetchLoyalty = async () => {
    if (!token) return;
    setLoyaltyLoading(true);
    try {
      const res = await fetch(`${API_BASE}/loyalty/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });
      if (res.ok && data?.data) {
        setLoyaltyData({
          points: data.data.points || 1250,
          tier: data.data.tier || 'GOLD',
          lifetimePoints: data.data.lifetimePoints || 2400,
          nextTierPoints: 3000
        });
      }
    } catch (err) {
      console.warn('Loyalty fetch error:', err);
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const fetchPets = async () => {
    if (!token) return;
    setPetsLoading(true);
    setPetError('');
    try {
      const data = await clinicApi.listPets(token);
      setPets((data?.content || []).map(mapPet));
    } catch (err) {
      setPetError(err.message || 'Không tải được danh sách thú cưng.');
    } finally {
      setPetsLoading(false);
    }
  };

  const fetchServices = async () => {
    if (!token) return;
    try {
      const data = await clinicApi.listServices(token);
      setServices((data?.content || []).map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        basePrice: Number(service.basePrice || 0),
        durationMinutes: service.durationMinutes || 60,
      })));
    } catch (err) {
      setBookingError(err.message || 'Không tải được danh mục dịch vụ.');
    }
  };

  const fetchBookings = async () => {
    if (!token) return;
    setBookingsLoading(true);
    setBookingError('');
    try {
      const data = await clinicApi.listBookings(token);
      setBookings(data?.content || []);
    } catch (err) {
      setBookingError(err.message || 'Không tải được lịch hẹn.');
    } finally {
      setBookingsLoading(false);
    }
  };

  const fetchSlots = async (date, serviceId) => {
    if (!token || !date || !serviceId) {
      setAvailableSlots([]);
      return;
    }

    setSlotsLoading(true);
    setBookingError('');
    try {
      const data = await clinicApi.availableSlots(
        { date, serviceId, includeBooked: false },
        token
      );
      const slots = (data?.staff || []).flatMap(group =>
        (group.slots || [])
          .filter(slot => slot.available)
          .map(slot => ({ ...slot, staffId: group.staffId }))
      );

      setAvailableSlots(slots);
      setNewBooking(prev => {
        const stillAvailable = slots.find(
          slot => slot.slotId === prev.timeSlotId && slot.staffId === prev.staffId
        );
        const chosen = stillAvailable || slots[0];
        return {
          ...prev,
          timeSlotId: chosen?.slotId || '',
          staffId: chosen?.staffId || '',
        };
      });
    } catch (err) {
      setAvailableSlots([]);
      setBookingError(err.message || 'Không tải được khung giờ trống.');
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchPets();
    fetchServices();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'loyalty') {
      fetchLoyalty();
    }
    if (activeTab === 'bookings') {
      fetchBookings();
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (!showAddBookingModal) return;
    if (!newBooking.date || !newBooking.serviceId) {
      setAvailableSlots([]);
      return;
    }
    fetchSlots(newBooking.date, newBooking.serviceId);
  }, [showAddBookingModal, newBooking.date, newBooking.serviceId]);

  useEffect(() => {
    if (showAddBookingModal && !newBooking.serviceId && services.length > 0) {
      setNewBooking(prev => ({ ...prev, serviceId: services[0].id }));
    }
  }, [showAddBookingModal, services, newBooking.serviceId]);

  const openBookingModal = (petId) => {
    if (pets.length === 0) {
      alert('Vui lòng thêm thú cưng trước khi đặt lịch.');
      return;
    }

    setNewBooking({
      petId: petId || pets[0].id,
      serviceId: services[0]?.id || '',
      date: tomorrowISODate(),
      timeSlotId: '',
      staffId: '',
      note: '',
      promotionCode: '',
    });
    setPromotionCheck(null);
    setBookingError('');
    setShowAddBookingModal(true);
  };

  const handleCheckPromotion = async () => {
    const code = newBooking.promotionCode.trim();
    if (!code) {
      setPromotionCheck(null);
      return;
    }
    const service = services.find(item => item.id === newBooking.serviceId);
    setCheckingPromotion(true);
    try {
      const result = await clinicApi.validatePromotion(
        code, Number(service?.basePrice || 0), token);
      setPromotionCheck(result);
    } catch (err) {
      setPromotionCheck({ valid: false, message: err.message || 'Không kiểm tra được mã giảm giá.' });
    } finally {
      setCheckingPromotion(false);
    }
  };

  // Handle Add Pet
  const handleAddPet = async (e) => {
    e.preventDefault();
    if (!newPet.name.trim() || savingPet) return;

    setSavingPet(true);
    setPetError('');
    try {
      const pet = await clinicApi.createPet({
        name: newPet.name.trim(),
        species: newPet.species,
        gender: newPet.gender,
        dateOfBirth: newPet.dateOfBirth || null,
        weight: newPet.weight ? Number(newPet.weight) : null,
        notes: `Giống: ${newPet.breed.trim() || 'Chưa cập nhật'}. Dị ứng: ${newPet.allergies.trim() || 'Không có'}`,
      }, token);
      setPets(prev => [mapPet(pet), ...prev]);
      setShowAddPetModal(false);
      setNewPet({ name: '', species: 'Chó', breed: '', gender: 'Đực', dateOfBirth: '', weight: '', allergies: '' });
    } catch (err) {
      setPetError(err.message || 'Không lưu được hồ sơ thú cưng.');
    } finally {
      setSavingPet(false);
    }
  };

  // Handle Add Booking
  const handleAddBooking = async (e) => {
    e.preventDefault();
    if (savingBooking) return;

    if (!newBooking.petId || !newBooking.serviceId || !newBooking.timeSlotId) {
      setBookingError('Vui lòng chọn thú cưng, dịch vụ và khung giờ trống.');
      return;
    }

    setSavingBooking(true);
    setBookingError('');
    try {
      await clinicApi.createBooking({
        petId: newBooking.petId,
        notes: newBooking.note.trim() || null,
        promotionCode: newBooking.promotionCode.trim() || null,
        items: [{
          serviceId: newBooking.serviceId,
          timeSlotId: newBooking.timeSlotId,
          staffId: newBooking.staffId || null,
        }],
      }, token);
      setShowAddBookingModal(false);
      setNewBooking(prev => ({
        ...prev, timeSlotId: '', staffId: '', note: '', promotionCode: '',
      }));
      setPromotionCheck(null);
      await fetchBookings();
    } catch (err) {
      setBookingError(err.message || 'Không đặt được lịch hẹn.');
    } finally {
      setSavingBooking(false);
    }
  };

  // Handle AI Chat submission
  const handleSendAi = async (customPrompt) => {
    const q = customPrompt || aiInput;
    if (!q.trim() || aiLoading) return;

    const userMsg = { sender: 'user', text: q };
    setAiMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setAiInput('');
    setAiLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/tips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ question: q })
      });
      const data = await res.json();
      if (onApiLog) onApiLog({ status: res.status, data });

      let replyText = '';
      if (data?.tip) {
        replyText = data.tip;
      } else if (data?.data?.tip) {
        replyText = data.data.tip;
      } else if (data?.response) {
        replyText = data.response;
      } else {
        replyText = `Cảm ơn bạn đã hỏi về "${q}". Đối với triệu chứng này, bạn cần theo dõi sát thân nhiệt và thói quen uống nước của thú cưng. Nếu tình trạng nôn hoặc bỏ ăn kéo dài trên 24 giờ, hãy mang bé đến phòng khám PetCare gần nhất để được làm xét nghiệm máu và siêu âm kịp thời!`;
      }

      setAiMessages(prev => [...prev, { sender: 'ai', text: replyText }]);
    } catch (err) {
      setAiMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'Hệ thống gợi ý: Bạn nên giữ ấm cho bé, cho uống nhiều nước sạch và tạm ngưng thức ăn dầu mỡ trong 6-8 tiếng. Nếu có dấu hiệu sốt cao hoặc mệt mỏi li bì, hãy đặt lịch khám trực tiếp với bác sĩ PetCare ngay nhé!'
        }
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRedeemVoucher = (voucherName, pointsCost) => {
    if (loyaltyData.points < pointsCost) {
      alert('Bạn không đủ điểm thưởng để đổi ưu đãi này.');
      return;
    }
    setLoyaltyData(prev => ({ ...prev, points: prev.points - pointsCost }));
    setRedeemedVouchers(prev => [...prev, voucherName]);
    alert(`Chúc mừng bạn đã đổi thành công "${voucherName}"! Mã ưu đãi đã được lưu vào ví voucher.`);
  };

  const bookingRows = bookings.map(booking => mapBooking(booking, pets));
  const today = toISODate(new Date());

  return (
    <div className="space-y-6">
      {/* TAB 1: THÚ CƯNG CỦA TÔI */}
      {activeTab === 'pets' && (
        <div className="space-y-6">
          <Card variant="outlined" padding="lg" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Card.Title className="flex items-center space-x-2 text-base font-bold text-[var(--color-fg-primary)]">
                <span className="w-8 h-8 rounded-xl bg-[var(--color-role-customer-bg)] text-[var(--color-role-customer-text)] flex items-center justify-center font-bold">🐾</span>
                <span>Thú cưng của tôi</span>
              </Card.Title>
              <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                Quản lý hồ sơ sức khỏe, giống loài, cân nặng và sổ tiêm phòng của các bé
              </Card.Description>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowAddPetModal(true)}
            >
              Thêm thú cưng mới
            </Button>
          </Card>

          {petError && (
            <Card variant="outlined" padding="md" className="bg-rose-50 border-rose-200">
              <div className="flex items-center space-x-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{petError}</span>
              </div>
            </Card>
          )}

          {petsLoading && (
            <Card variant="outlined" padding="lg" className="flex items-center justify-center text-slate-500">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              <span>Đang tải hồ sơ thú cưng...</span>
            </Card>
          )}

          {!petsLoading && pets.length === 0 && (
            <Card variant="outlined" padding="xl" className="border-dashed border-slate-300 text-center">
              <div className="text-3xl">🐾</div>
              <p className="mt-2 text-sm font-semibold text-slate-800">Chưa có hồ sơ thú cưng</p>
              <p className="mt-1 text-xs text-slate-500">Bấm "Thêm thú cưng mới" để tạo hồ sơ đầu tiên.</p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pets.map(pet => (
              <Card
                key={pet.id}
                variant="outlined"
                padding="lg"
                className="hover:border-blue-400 transition duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start space-x-4">
                    <Avatar
                      size="2xl"
                      shape="rounded"
                      src={pet.avatarUrl}
                      name={pet.name}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900 truncate">{pet.name}</h3>
                        <Badge variant="success" size="xs">{pet.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{pet.breed}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="ghost" size="xs">{pet.species} • {pet.gender}</Badge>
                        <Badge variant="ghost" size="xs">{pet.age}</Badge>
                        <Badge variant="ghost" size="xs">⚖️ {pet.weight}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">Tiêm phòng gần nhất:</span>
                      <span className="font-medium text-slate-800">{pet.lastVaccine}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">Dị ứng & Chú ý:</span>
                      <span className="font-medium text-amber-600">{pet.allergies}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => openBookingModal(pet.id)}
                  >
                    Đặt lịch khám cho bé
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('bookings')}
                  >
                    Xem lịch
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Modal Thêm thú cưng */}
          <Modal
            open={showAddPetModal}
            onClose={() => setShowAddPetModal(false)}
            title="Thêm hồ sơ thú cưng mới"
            size="md"
          >
            <form onSubmit={handleAddPet} className="space-y-3.5 text-xs">
              {petError && (
                <Card variant="outlined" padding="sm" className="bg-rose-50 border-rose-200 text-rose-700 text-xs">
                  {petError}
                </Card>
              )}
              <Input
                label="Tên thú cưng *"
                required
                placeholder="Ví dụ: Bông, Lucky, Ken..."
                value={newPet.name}
                onChange={e => setNewPet({ ...newPet, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Loài"
                  value={newPet.species}
                  onChange={e => setNewPet({ ...newPet, species: e.target.value })}
                  options={[
                    { value: 'Chó', label: 'Chó' },
                    { value: 'Mèo', label: 'Mèo' },
                    { value: 'Chim', label: 'Chim cảnh' },
                    { value: 'Thỏ / Hamster', label: 'Thỏ / Hamster' },
                  ]}
                />
                <Select
                  label="Giới tính"
                  value={newPet.gender}
                  onChange={e => setNewPet({ ...newPet, gender: e.target.value })}
                  options={[
                    { value: 'Đực', label: 'Đực' },
                    { value: 'Cái', label: 'Cái' },
                  ]}
                />
              </div>
              <Input
                label="Giống loài"
                placeholder="Ví dụ: Poodle, Corgi, Mèo Ba Tư..."
                value={newPet.breed}
                onChange={e => setNewPet({ ...newPet, breed: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Ngày sinh"
                  type="date"
                  max={today}
                  value={newPet.dateOfBirth}
                  onChange={e => setNewPet({ ...newPet, dateOfBirth: e.target.value })}
                />
                <Input
                  label="Cân nặng (kg)"
                  type="number"
                  step="0.1"
                  placeholder="Ví dụ: 4.5"
                  value={newPet.weight}
                  onChange={e => setNewPet({ ...newPet, weight: e.target.value })}
                />
              </div>
              <Input
                label="Tiền sử dị ứng / Lưu ý"
                placeholder="Không dị ứng, dị ứng hải sản..."
                value={newPet.allergies}
                onChange={e => setNewPet({ ...newPet, allergies: e.target.value })}
              />
              <div className="pt-2 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="md"
                  type="button"
                  onClick={() => setShowAddPetModal(false)}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={savingPet}
                  loading={savingPet}
                >
                  Lưu hồ sơ
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* TAB 2: ĐẶT LỊCH HẸN */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <Card variant="outlined" padding="lg" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Card.Title className="flex items-center space-x-2 text-base font-bold text-[var(--color-fg-primary)]">
                <span className="w-8 h-8 rounded-xl bg-[var(--color-role-customer-bg)] text-[var(--color-role-customer-text)] flex items-center justify-center font-bold">📅</span>
                <span>Lịch hẹn phòng khám</span>
              </Card.Title>
              <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                Theo dõi lịch khám, lịch tiêm phòng, dịch vụ spa và đăng ký ca khám mới
              </Card.Description>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => openBookingModal()}
            >
              Đặt lịch hẹn mới
            </Button>
          </Card>

          {bookingError && (
            <Card variant="outlined" padding="md" className="bg-rose-50 border-rose-200">
              <div className="flex items-center space-x-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{bookingError}</span>
              </div>
            </Card>
          )}

          <Table
            columns={[
              { key: 'code', header: 'Mã lịch', width: '100px' },
              { key: 'petName', header: 'Thú cưng', width: '120px' },
              { key: 'service', header: 'Dịch vụ', minWidth: '200px' },
              { key: 'time', header: 'Thời gian', width: '140px' },
              { key: 'doctor', header: 'Bác sĩ', width: '140px' },
              { key: 'status', header: 'Trạng thái', width: '120px' },
              { key: 'paymentStatus', header: 'Thanh toán', width: '140px' },
              { key: 'price', header: 'Phí ước tính', width: '140px' },
            ]}
            data={bookingRows}
            keyField="id"
            loading={bookingsLoading}
            emptyMessage='Chưa có lịch hẹn nào. Bấm "Đặt lịch hẹn mới" để tạo lịch.'
            striped
            hoverable
            className="table-wrapper"
            renderRow={(row) => (
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">{row.code}</td>
                <td className="py-3.5 px-4 font-medium text-slate-900">{row.petName}</td>
                <td className="py-3.5 px-4 text-slate-700">
                  <div>{row.service}</div>
                  {row.staffNote && (
                    <div className="mt-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                      Lễ tân: {row.staffNote}
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-4 text-slate-600">
                  <div className="font-medium text-slate-800">{row.time}</div>
                  <div className="text-[11px] text-slate-400">{row.date}</div>
                </td>
                <td className="py-3.5 px-4 text-slate-600">{row.doctor}</td>
                <td className="py-3.5 px-4">
                  <Badge
                    variant={BOOKING_STATUS_CONFIG[row.status]?.variant || 'warning'}
                    size="xs"
                  >
                    {BOOKING_STATUS_CONFIG[row.status]?.label || row.status}
                  </Badge>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-col gap-1.5">
                    <Badge
                      variant={PAYMENT_STATUS_CONFIG[row.paymentStatus]?.variant || 'error'}
                      size="xs"
                    >
                      {PAYMENT_STATUS_CONFIG[row.paymentStatus]?.label || row.paymentStatus}
                    </Badge>
                    {row.paymentStatus !== 'PAID' && row.status !== 'CANCELLED' && (
                      <Button
                        variant="primary"
                        size="xs"
                        className="w-full"
                        leftIcon={<QrCode className="w-3 h-3" />}
                        onClick={() => setPaymentBooking({ id: row.id, code: row.code, amount: row.rawAmount })}
                      >
                        Thanh toán online
                      </Button>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4 font-semibold text-slate-900">
                  <div>{row.price}</div>
                  {row.discountAmount > 0 && (
                    <div className="text-[11px] font-medium text-emerald-600">
                      -{row.discountAmount.toLocaleString('vi-VN')} đ
                      {row.promotionCode ? ` (${row.promotionCode})` : ''}
                    </div>
                  )}
                </td>
              </tr>
            )}
          />

          {/* Modal Đặt lịch hẹn mới */}
          <Modal
            open={showAddBookingModal}
            onClose={() => setShowAddBookingModal(false)}
            title="Đặt lịch hẹn khám / Spa"
            size="lg"
          >
            <form onSubmit={handleAddBooking} className="space-y-3.5 text-xs">
              {bookingError && (
                <Card variant="outlined" padding="sm" className="bg-rose-50 border-rose-200 text-rose-700 text-xs">
                  {bookingError}
                </Card>
              )}
              <Select
                label="Chọn thú cưng *"
                required
                value={newBooking.petId}
                onChange={e => setNewBooking({ ...newBooking, petId: e.target.value })}
                options={pets.map(p => ({ value: p.id, label: `${p.name} (${p.species})` }))}
                placeholder="Chọn thú cưng"
              />
              <Select
                label="Dịch vụ yêu cầu *"
                required
                value={newBooking.serviceId}
                onChange={e => {
                  setNewBooking({ ...newBooking, serviceId: e.target.value });
                  setPromotionCheck(null);
                }}
                options={services.map(s => ({ value: s.id, label: `${s.name} (${s.durationMinutes} phút)` }))}
                placeholder="Chọn dịch vụ"
                disabled={services.length === 0}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Ngày hẹn *"
                  type="date"
                  required
                  min={today}
                  value={newBooking.date}
                  onChange={e => setNewBooking({ ...newBooking, date: e.target.value })}
                />
                <Select
                  label="Khung giờ trống *"
                  required
                  value={newBooking.timeSlotId}
                  onChange={e => {
                    const slot = availableSlots.find(item => item.slotId === e.target.value);
                    setNewBooking({
                      ...newBooking,
                      timeSlotId: e.target.value,
                      staffId: slot?.staffId || '',
                    });
                  }}
                  options={availableSlots.map(slot => ({
                    value: slot.slotId,
                    label: `${formatSlotTime(slot.startTime)} - ${formatSlotTime(slot.endTime)}`,
                  }))}
                  placeholder={slotsLoading ? 'Đang tải khung giờ...' : availableSlots.length === 0 ? 'Không có khung giờ trống' : 'Chọn khung giờ'}
                  disabled={slotsLoading || availableSlots.length === 0}
                />
              </div>
              <Input
                label="Ghi chú triệu chứng ban đầu"
                as="textarea"
                rows={2}
                placeholder="Mô tả nếu bé có dấu hiệu biếng ăn, sốt, ngứa da..."
                value={newBooking.note}
                onChange={e => setNewBooking({ ...newBooking, note: e.target.value })}
              />
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 space-y-2">
                <label className="font-semibold text-slate-700 block">Mã giảm giá (không bắt buộc)</label>
                <div className="flex space-x-2">
                  <Input
                    value={newBooking.promotionCode}
                    onChange={e => {
                      setNewBooking({ ...newBooking, promotionCode: e.target.value });
                      setPromotionCheck(null);
                    }}
                    placeholder="VD: WELCOME10"
                    className="flex-1 uppercase"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleCheckPromotion}
                    disabled={checkingPromotion || !newBooking.promotionCode.trim()}
                    loading={checkingPromotion}
                  >
                    Áp dụng
                  </Button>
                </div>
                {promotionCheck && (
                  <p className={`text-[11px] ${promotionCheck.valid ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {promotionCheck.valid
                      ? `Giảm ${Number(promotionCheck.discountAmount || 0).toLocaleString('vi-VN')} đ, còn ${Number(promotionCheck.finalAmount || 0).toLocaleString('vi-VN')} đ`
                      : promotionCheck.message}
                  </p>
                )}
                <p className="text-[10px] text-slate-400">
                  Hệ thống tự kiểm tra và tính lại mã khi bạn xác nhận đặt lịch.
                </p>
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowAddBookingModal(false)}
                >
                  Đóng
                </Button>
                <Button
                  type="submit"
                  disabled={savingBooking || slotsLoading || !newBooking.timeSlotId}
                  loading={savingBooking}
                >
                  Xác nhận đặt lịch
                </Button>
              </div>
            </form>
          </Modal>

          <VietQrPaymentModal
            open={Boolean(paymentBooking)}
            booking={paymentBooking}
            onClose={() => setPaymentBooking(null)}
            onPaid={async () => {
              setPaymentBooking(null);
              await fetchBookings();
            }}
          />
        </div>
      )}

      {/* TAB 3: TÍCH ĐIỂM & HẠNG THÀNH VIÊN */}
      {activeTab === 'loyalty' && (
        <div className="space-y-6">
          <Card variant="outlined" padding="lg" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Card.Title className="flex items-center space-x-2 text-base font-bold text-[var(--color-fg-primary)]">
                <span className="w-8 h-8 rounded-xl bg-[var(--color-role-customer-bg)] text-[var(--color-role-customer-text)] flex items-center justify-center font-bold">⭐</span>
                <span>Điểm thưởng & Hạng thẻ VIP</span>
              </Card.Title>
              <Card.Description className="text-xs text-[var(--color-fg-tertiary)] mt-1">
                Tích lũy 1 điểm cho mỗi 10.000 đ chi tiêu tại PetCare để nâng hạng thẻ và nhận voucher quà tặng
              </Card.Description>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loyaltyLoading ? 'animate-spin' : ''}`} />}
              onClick={fetchLoyalty}
            >
              Cập nhật điểm
            </Button>
          </Card>

          {/* Membership Card Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Card variant="filled" padding="lg" className="relative overflow-hidden bg-[var(--gradient-peach)] text-white shadow-[var(--shadow-card-lg)] border border-[var(--color-role-customer-border)]/40">
                <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold tracking-widest uppercase opacity-80">Thẻ Thành Viên</span>
                    <h3 className="text-xl font-black mt-0.5 tracking-tight">PETCARE {loyaltyData.tier}</h3>
                  </div>
                  <Award className="w-8 h-8 text-amber-200" />
                </div>

                <div className="mt-8">
                  <span className="text-[11px] opacity-80 block">Điểm khả dụng</span>
                  <div className="text-3xl font-extrabold tracking-tight">{loyaltyData.points.toLocaleString()} <span className="text-sm font-semibold opacity-90">điểm</span></div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/20 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] opacity-75 block">Chủ sở hữu</span>
                    <span className="font-semibold">{user?.fullName || 'Khách hàng PetCare'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] opacity-75 block">Tích lũy trọn đời</span>
                    <span className="font-semibold">{loyaltyData.lifetimePoints.toLocaleString()} đ</span>
                  </div>
                </div>
              </Card>
            </div>

            <Card variant="outlined" padding="lg" className="md:col-span-2 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2">Quyền lợi Hạng thẻ {loyaltyData.tier}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <Card variant="outlined" padding="md" className="bg-slate-50 border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-slate-700">Giảm 10% tất cả dịch vụ tắm & spa</span>
                    </div>
                  </Card>
                  <Card variant="outlined" padding="md" className="bg-slate-50 border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-slate-700">Miễn phí 1 lần khám tổng quát hàng quý</span>
                    </div>
                  </Card>
                  <Card variant="outlined" padding="md" className="bg-slate-50 border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-slate-700">Ưu tiên đặt chỗ vào các dịp Lễ, Tết</span>
                    </div>
                  </Card>
                  <Card variant="outlined" padding="md" className="bg-slate-50 border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="text-slate-700">Hỗ trợ hotline bác sĩ thú y 24/7</span>
                    </div>
                  </Card>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-medium">
                  <span>Tiến trình nâng hạng DIAMOND:</span>
                  <span>{loyaltyData.points} / {loyaltyData.nextTierPoints} điểm</span>
                </div>
                <div className="w-full bg-[var(--color-neutral-100)] rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-[var(--color-role-customer-main)] h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (loyaltyData.points / loyaltyData.nextTierPoints) * 100)}%` }}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Vouchers Store */}
          <Card variant="outlined" padding="lg" className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Đổi điểm lấy mã giảm giá dịch vụ</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="outlined" padding="lg" className="flex flex-col justify-between hover:border-blue-400 transition">
                <div>
                  <Badge variant="info" size="xs" className="mb-2">Voucher Spa</Badge>
                  <h5 className="font-bold text-slate-900 text-sm mt-1">Giảm 50.000 đ dịch vụ Spa</h5>
                  <p className="text-xs text-slate-500 mt-1">Áp dụng cho dịch vụ tắm sấy và cắt tỉa lông</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Badge variant="warning" size="xs">500 điểm</Badge>
                  <Button size="sm" onClick={() => handleRedeemVoucher('Voucher Giảm 50k Spa', 500)}>
                    Đổi mã
                  </Button>
                </div>
              </Card>

              <Card variant="outlined" padding="lg" className="flex flex-col justify-between hover:border-blue-400 transition">
                <div>
                  <Badge variant="primary" size="xs" className="mb-2">Voucher Khám</Badge>
                  <h5 className="font-bold text-slate-900 text-sm mt-1">Khám tổng quát miễn phí</h5>
                  <p className="text-xs text-slate-500 mt-1">Áp dụng cho 1 thú cưng tại bất kỳ chi nhánh nào</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Badge variant="warning" size="xs">1.000 điểm</Badge>
                  <Button size="sm" onClick={() => handleRedeemVoucher('Voucher Khám miễn phí', 1000)}>
                    Đổi mã
                  </Button>
                </div>
              </Card>

              <Card variant="outlined" padding="lg" className="flex flex-col justify-between hover:border-blue-400 transition">
                <div>
                  <Badge variant="success" size="xs" className="mb-2">Quà Tặng</Badge>
                  <h5 className="font-bold text-slate-900 text-sm mt-1">Gói Vitamin & Gel Dinh Dưỡng</h5>
                  <p className="text-xs text-slate-500 mt-1">Tăng sức đề kháng và mượt lông cho chó/mèo</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Badge variant="warning" size="xs">800 điểm</Badge>
                  <Button size="sm" onClick={() => handleRedeemVoucher('Gói Vitamin Dinh Dưỡng', 800)}>
                    Đổi quà
                  </Button>
                </div>
              </Card>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: TRỢ LÝ AI THÚ Y */}
      {activeTab === 'ai-chat' && (
        <div className="space-y-4">
          <Card variant="outlined" padding="lg" className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--gradient-brand-reverse)] text-white flex items-center justify-center font-bold text-base shadow-[var(--shadow-sm)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <Card.Title className="text-base font-bold text-slate-900">Trợ lý AI Thú Y PetCare 24/7</Card.Title>
                <Card.Description className="text-xs text-slate-500">
                  Hỏi đáp triệu chứng, sơ cứu ban đầu, dinh dưỡng & lịch tiêm phòng chuẩn thú y
                </Card.Description>
              </div>
            </div>
          </Card>

          <Card variant="outlined" className="flex flex-col h-[520px] overflow-hidden">
            {/* Quick Questions */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center space-x-2 overflow-x-auto text-xs">
              <span className="text-slate-400 flex-shrink-0 font-medium">Gợi ý câu hỏi:</span>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleSendAi('Chó con 2 tháng tuổi nên tiêm phòng mũi gì trước?')}
                className="whitespace-nowrap"
              >
                💉 Lịch tiêm phòng chó 2 tháng?
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleSendAi('Mèo bị nôn bọt trắng và bỏ ăn thì phải làm sao?')}
                className="whitespace-nowrap"
              >
                🐱 Mèo nôn bọt trắng & bỏ ăn?
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleSendAi('Chế độ dinh dưỡng cho mèo Anh lông ngắn để mượt lông?')}
                className="whitespace-nowrap"
              >
                ✨ Dinh dưỡng mượt lông mèo?
              </Button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
              {aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-[var(--radius-card-lg)] p-3.5 leading-relaxed shadow-[var(--shadow-sm)] ${msg.sender === 'user'
                      ? 'bg-[var(--color-role-customer-main)] text-white'
                      : 'bg-[var(--color-neutral-100)] text-[var(--color-fg-primary)] border border-[var(--color-bd-light)]'
                      }`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="flex items-center space-x-1.5 text-blue-600 font-semibold mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>PetCare AI Vet</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-neutral-100)] text-[var(--color-fg-tertiary)] rounded-[var(--radius-card-lg)] p-3 text-xs flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--color-role-customer-main)]" />
                    <span>AI đang phân tích triệu chứng và soạn câu trả lời...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAi();
                }}
                className="flex items-center space-x-2"
              >
                <Input
                  placeholder="Hỏi AI về sức khỏe, thức ăn, triệu chứng của thú cưng..."
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  className="flex-1"
                  size="sm"
                />
                <Button
                  type="submit"
                  disabled={!aiInput.trim() || aiLoading}
                  size="sm"
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Gửi
                </Button>
              </form>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
