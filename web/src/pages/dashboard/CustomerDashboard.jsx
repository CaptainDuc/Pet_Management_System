import React, { useState, useEffect } from 'react';
import {
  Heart, Calendar, Award, MessageSquare, Plus, Search,
  CheckCircle2, Clock, AlertCircle, Sparkles, Send,
  ChevronRight, Phone, Mail, ShieldCheck, FileText,
  User, Check, X, RefreshCw, Dog, Cat, DollarSign
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export default function CustomerDashboard({ user, token, activeTab, setActiveTab, onApiLog }) {
  // My Pets state
  const [pets, setPets] = useState([
    {
      id: 'p-1',
      name: 'Lu Lu',
      species: 'Chó',
      breed: 'Siberian Husky',
      gender: 'Đực',
      age: '2 tuổi',
      weight: '23.5 kg',
      avatarUrl: 'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=400&auto=format&fit=crop&q=80',
      lastVaccine: '15/09/2026',
      allergies: 'Không có dị ứng',
      status: 'Khỏe mạnh'
    },
    {
      id: 'p-2',
      name: 'Miu Miu',
      species: 'Mèo',
      breed: 'British Shorthair (Mèo Anh lông ngắn)',
      gender: 'Cái',
      age: '1.5 tuổi',
      weight: '4.2 kg',
      avatarUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&auto=format&fit=crop&q=80',
      lastVaccine: '20/08/2026',
      allergies: 'Dị ứng thức ăn có thịt bò',
      status: 'Cần kiểm tra tai'
    }
  ]);

  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [newPet, setNewPet] = useState({
    name: '',
    species: 'Chó',
    breed: '',
    gender: 'Đực',
    age: '',
    weight: '',
    allergies: ''
  });

  // Bookings state
  const [bookings, setBookings] = useState([
    {
      id: 'BK-1082',
      petName: 'Lu Lu',
      service: 'Khám tổng quát & Tiêm phòng dại',
      branch: 'Chi nhánh 1 - 128 Nguyễn Trãi, Ba Đình',
      doctor: 'BS. Lê Minh Hoàng',
      date: '28/10/2026',
      time: '09:30',
      status: 'CONFIRMED',
      price: '350.000 đ'
    },
    {
      id: 'BK-1049',
      petName: 'Miu Miu',
      service: 'Tắm spa & Vệ sinh tai khử mùi',
      branch: 'Chi nhánh 2 - 45 Hai Bà Trưng, Quận 1',
      doctor: 'KTV. Trần Thảo Vy',
      date: '15/10/2026',
      time: '14:00',
      status: 'COMPLETED',
      price: '280.000 đ'
    }
  ]);

  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [newBooking, setNewBooking] = useState({
    petId: 'p-1',
    service: 'Khám tổng quát & Tư vấn dinh dưỡng',
    branch: 'Chi nhánh 1 - 128 Nguyễn Trãi, Ba Đình',
    doctor: 'BS. Lê Minh Hoàng',
    date: '2026-10-30',
    time: '10:00',
    note: ''
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

  useEffect(() => {
    if (activeTab === 'loyalty') {
      fetchLoyalty();
    }
  }, [activeTab]);

  // Handle Add Pet
  const handleAddPet = (e) => {
    e.preventDefault();
    if (!newPet.name.trim()) return;
    const petItem = {
      id: `p-${Date.now()}`,
      name: newPet.name,
      species: newPet.species,
      breed: newPet.breed || (newPet.species === 'Chó' ? 'Golden Retriever' : 'Mèo ta'),
      gender: newPet.gender,
      age: newPet.age || '1 tuổi',
      weight: newPet.weight ? `${newPet.weight} kg` : '5 kg',
      avatarUrl: newPet.species === 'Chó'
        ? 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400&auto=format&fit=crop&q=80',
      lastVaccine: 'Chưa cập nhật',
      allergies: newPet.allergies || 'Không có',
      status: 'Khỏe mạnh'
    };
    setPets([petItem, ...pets]);
    setShowAddPetModal(false);
    setNewPet({ name: '', species: 'Chó', breed: '', gender: 'Đực', age: '', weight: '', allergies: '' });
  };

  // Handle Add Booking
  const handleAddBooking = (e) => {
    e.preventDefault();
    const selectedPet = pets.find(p => p.id === newBooking.petId) || pets[0];
    const bookingItem = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      petName: selectedPet?.name || 'Thú cưng',
      service: newBooking.service,
      branch: newBooking.branch,
      doctor: newBooking.doctor,
      date: newBooking.date,
      time: newBooking.time,
      status: 'PENDING',
      price: '300.000 đ'
    };
    setBookings([bookingItem, ...bookings]);
    setShowAddBookingModal(false);
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

  return (
    <div className="space-y-6">
      {/* TAB 1: THÚ CƯNG CỦA TÔI */}
      {activeTab === 'pets' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  🐾
                </span>
                <h2 className="text-lg font-bold text-slate-900">Thú cưng của tôi</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Quản lý hồ sơ sức khỏe, giống loài, cân nặng và sổ tiêm phòng của các bé
              </p>
            </div>
            <button
              onClick={() => setShowAddPetModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm thú cưng mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pets.map(pet => (
              <div
                key={pet.id}
                className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-xs transition duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start space-x-4">
                    <img
                      src={pet.avatarUrl}
                      alt={pet.name}
                      className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-xs flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900 truncate">{pet.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {pet.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{pet.breed}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                          {pet.species} • {pet.gender}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                          {pet.age}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                          ⚖️ {pet.weight}
                        </span>
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
                  <button
                    onClick={() => {
                      setNewBooking(prev => ({ ...prev, petId: pet.id }));
                      setShowAddBookingModal(true);
                    }}
                    className="flex-1 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition text-center"
                  >
                    Đặt lịch khám cho bé
                  </button>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    Xem lịch
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Thêm thú cưng */}
          {showAddPetModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Thêm hồ sơ thú cưng mới</h3>
                  <button
                    onClick={() => setShowAddPetModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddPet} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tên thú cưng *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Bông, Lucky, Ken..."
                      value={newPet.name}
                      onChange={e => setNewPet({ ...newPet, name: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Loài</label>
                      <select
                        value={newPet.species}
                        onChange={e => setNewPet({ ...newPet, species: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Chó">Chó</option>
                        <option value="Mèo">Mèo</option>
                        <option value="Chim">Chim cảnh</option>
                        <option value="Thỏ / Hamster">Thỏ / Hamster</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Giới tính</label>
                      <select
                        value={newPet.gender}
                        onChange={e => setNewPet({ ...newPet, gender: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Đực">Đực</option>
                        <option value="Cái">Cái</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Giống loài</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Poodle, Corgi, Mèo Ba Tư..."
                      value={newPet.breed}
                      onChange={e => setNewPet({ ...newPet, breed: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tuổi</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 8 tháng, 2 tuổi"
                        value={newPet.age}
                        onChange={e => setNewPet({ ...newPet, age: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Cân nặng (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ví dụ: 4.5"
                        value={newPet.weight}
                        onChange={e => setNewPet({ ...newPet, weight: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tiền sử dị ứng / Lưu ý</label>
                    <input
                      type="text"
                      placeholder="Không dị ứng, dị ứng hải sản..."
                      value={newPet.allergies}
                      onChange={e => setNewPet({ ...newPet, allergies: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddPetModal(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
                    >
                      Lưu hồ sơ
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ĐẶT LỊCH HẸN */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  📅
                </span>
                <h2 className="text-lg font-bold text-slate-900">Lịch hẹn phòng khám</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Theo dõi lịch khám, lịch tiêm phòng, dịch vụ spa và đăng ký ca khám mới
              </p>
            </div>
            <button
              onClick={() => setShowAddBookingModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Đặt lịch hẹn mới</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Mã lịch</th>
                    <th className="py-3 px-4 font-semibold">Thú cưng</th>
                    <th className="py-3 px-4 font-semibold">Dịch vụ</th>
                    <th className="py-3 px-4 font-semibold">Thời gian</th>
                    <th className="py-3 px-4 font-semibold">Bác sĩ phụ trách</th>
                    <th className="py-3 px-4 font-semibold">Trạng thái</th>
                    <th className="py-3 px-4 font-semibold">Phí ước tính</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">{b.id}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">{b.petName}</td>
                      <td className="py-3.5 px-4 text-slate-700">{b.service}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-medium text-slate-800">{b.time}</div>
                        <div className="text-[11px] text-slate-400">{b.date}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{b.doctor}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.status === 'CONFIRMED'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : b.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                        >
                          {b.status === 'CONFIRMED' ? 'Đã xác nhận' : b.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{b.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Đặt lịch hẹn mới */}
          {showAddBookingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base">Đặt lịch hẹn khám / Spa</h3>
                  <button
                    onClick={() => setShowAddBookingModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddBooking} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Chọn thú cưng *</label>
                    <select
                      value={newBooking.petId}
                      onChange={e => setNewBooking({ ...newBooking, petId: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      {pets.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.species} - {p.breed})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Dịch vụ yêu cầu</label>
                    <select
                      value={newBooking.service}
                      onChange={e => setNewBooking({ ...newBooking, service: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Khám tổng quát & Tư vấn dinh dưỡng">Khám tổng quát & Tư vấn dinh dưỡng</option>
                      <option value="Tiêm phòng định kỳ (Dại / 7 bệnh)">Tiêm phòng định kỳ (Dại / 7 bệnh)</option>
                      <option value="Tắm spa & Vệ sinh tai cắt móng">Tắm spa & Vệ sinh tai cắt móng</option>
                      <option value="Siêu âm / Xét nghiệm máu chẩn đoán">Siêu âm / Xét nghiệm máu chẩn đoán</option>
                      <option value="Cạo vôi răng & Vệ sinh nha khoa thú cưng">Cạo vôi răng & Vệ sinh nha khoa</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Chi nhánh phòng khám</label>
                    <select
                      value={newBooking.branch}
                      onChange={e => setNewBooking({ ...newBooking, branch: e.target.value })}
                      className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Chi nhánh 1 - 128 Nguyễn Trãi, Ba Đình">Chi nhánh 1 - 128 Nguyễn Trãi, Ba Đình, Hà Nội</option>
                      <option value="Chi nhánh 2 - 45 Hai Bà Trưng, Quận 1">Chi nhánh 2 - 45 Hai Bà Trưng, Quận 1, TP.HCM</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Ngày hẹn</label>
                      <input
                        type="date"
                        required
                        value={newBooking.date}
                        onChange={e => setNewBooking({ ...newBooking, date: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Khung giờ</label>
                      <select
                        value={newBooking.time}
                        onChange={e => setNewBooking({ ...newBooking, time: e.target.value })}
                        className="w-full h-9 px-3 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      >
                        <option value="08:30">08:30 sáng</option>
                        <option value="09:30">09:30 sáng</option>
                        <option value="10:30">10:30 sáng</option>
                        <option value="14:00">14:00 chiều</option>
                        <option value="15:30">15:30 chiều</option>
                        <option value="17:00">17:00 chiều</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Ghi chú triệu chứng ban đầu</label>
                    <textarea
                      rows={2}
                      placeholder="Mô tả nếu bé có dấu hiệu biếng ăn, sốt, ngứa da..."
                      value={newBooking.note}
                      onChange={e => setNewBooking({ ...newBooking, note: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddBookingModal(false)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
                    >
                      Xác nhận đặt lịch
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TÍCH ĐIỂM & HẠNG THÀNH VIÊN */}
      {activeTab === 'loyalty' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  ⭐
                </span>
                <h2 className="text-lg font-bold text-slate-900">Điểm thưởng & Hạng thẻ VIP</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tích lũy 1 điểm cho mỗi 10.000 đ chi tiêu tại PetCare để nâng hạng thẻ và nhận voucher quà tặng
              </p>
            </div>
            <button
              onClick={fetchLoyalty}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loyaltyLoading ? 'animate-spin' : ''}`} />
              <span>Cập nhật điểm</span>
            </button>
          </div>

          {/* Membership Card Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="relative rounded-2xl p-6 text-white shadow-xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 overflow-hidden border border-amber-400/40">
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
              </div>
            </div>

            <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-2">Quyền lợi Hạng thẻ {loyaltyData.tier}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-slate-700">Giảm 10% tất cả dịch vụ tắm & spa</span>
                  </div>
                  <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-slate-700">Miễn phí 1 lần khám tổng quát hàng quý</span>
                  </div>
                  <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-slate-700">Ưu tiên đặt chỗ vào các dịp Lễ, Tết</span>
                  </div>
                  <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-slate-700">Hỗ trợ hotline bác sĩ thú y 24/7</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-medium">
                  <span>Tiến trình nâng hạng DIAMOND:</span>
                  <span>{loyaltyData.points} / {loyaltyData.nextTierPoints} điểm</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (loyaltyData.points / loyaltyData.nextTierPoints) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Vouchers Store */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Đổi điểm lấy mã giảm giá dịch vụ</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-blue-400 transition">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Voucher Spa</span>
                  <h5 className="font-bold text-slate-900 text-sm mt-1">Giảm 50.000 đ dịch vụ Spa</h5>
                  <p className="text-xs text-slate-500 mt-1">Áp dụng cho dịch vụ tắm sấy và cắt tỉa lông</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-amber-600 text-xs">500 điểm</span>
                  <button
                    onClick={() => handleRedeemVoucher('Voucher Giảm 50k Spa', 500)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Đổi mã
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-blue-400 transition">
                <div>
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">Voucher Khám</span>
                  <h5 className="font-bold text-slate-900 text-sm mt-1">Khám tổng quát miễn phí</h5>
                  <p className="text-xs text-slate-500 mt-1">Áp dụng cho 1 thú cưng tại bất kỳ chi nhánh nào</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-amber-600 text-xs">1.000 điểm</span>
                  <button
                    onClick={() => handleRedeemVoucher('Voucher Khám miễn phí', 1000)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Đổi mã
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-blue-400 transition">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Quà Tặng</span>
                  <h5 className="font-bold text-slate-900 text-sm mt-1">Gói Vitamin & Gel Dinh Dưỡng</h5>
                  <p className="text-xs text-slate-500 mt-1">Tăng sức đề kháng và mượt lông cho chó/mèo</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-bold text-amber-600 text-xs">800 điểm</span>
                  <button
                    onClick={() => handleRedeemVoucher('Gói Vitamin Dinh Dưỡng', 800)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Đổi quà
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRỢ LÝ AI THÚ Y */}
      {activeTab === 'ai-chat' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Trợ lý AI Thú Y PetCare 24/7</h2>
                <p className="text-xs text-slate-500">
                  Hỏi đáp triệu chứng, sơ cứu ban đầu, dinh dưỡng & lịch tiêm phòng chuẩn thú y
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col h-[520px] overflow-hidden">
            {/* Quick Questions */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center space-x-2 overflow-x-auto text-xs">
              <span className="text-slate-400 flex-shrink-0 font-medium">Gợi ý câu hỏi:</span>
              <button
                onClick={() => handleSendAi('Chó con 2 tháng tuổi nên tiêm phòng mũi gì trước?')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200 rounded-lg whitespace-nowrap transition"
              >
                💉 Lịch tiêm phòng chó 2 tháng?
              </button>
              <button
                onClick={() => handleSendAi('Mèo bị nôn bọt trắng và bỏ ăn thì phải làm sao?')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200 rounded-lg whitespace-nowrap transition"
              >
                🐱 Mèo nôn bọt trắng & bỏ ăn?
              </button>
              <button
                onClick={() => handleSendAi('Chế độ dinh dưỡng cho mèo Anh lông ngắn để mượt lông?')}
                className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200 rounded-lg whitespace-nowrap transition"
              >
                ✨ Dinh dưỡng mượt lông mèo?
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
              {aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-xs ${msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/80'
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
                  <div className="bg-slate-100 text-slate-500 rounded-2xl p-3 text-xs flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
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
                <input
                  type="text"
                  placeholder="Hỏi AI về sức khỏe, thức ăn, triệu chứng của thú cưng..."
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  className="flex-1 h-10 px-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!aiInput.trim() || aiLoading}
                  className="h-10 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 shadow-xs"
                >
                  <span>Gửi</span>
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
