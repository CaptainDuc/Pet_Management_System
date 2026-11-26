import React, { useState, useEffect, useRef } from 'react';
import { Award, CheckCircle, CheckCircle2, Sparkles, Send, RefreshCw } from 'lucide-react';
import { Card, Input, Button, Badge } from '../../design-system/components';
import AiMessageText from '../../components/AiMessageText';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function CustomerExtras({ user, token, activeTab, onApiLog, onBookingSuggestion }) {
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
  const chatRef = useRef(null);
  const followChat = useRef(true);
  useEffect(() => {
    const pane = chatRef.current;
    if (!pane) return;
    const follow = () => { if (followChat.current) pane.scrollTop = pane.scrollHeight; };
    follow();
    const observer = new ResizeObserver(follow);
    observer.observe(pane);
    return () => observer.disconnect();
  }, [aiMessages, aiLoading, activeTab]);

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

  useEffect(() => { if (activeTab === "loyalty") fetchLoyalty(); }, [activeTab, token]);
  // Handle AI Chat submission
  const handleSendAi = async (customPrompt) => {
    const q = customPrompt || aiInput;
    if (!q.trim() || aiLoading) return;
    followChat.current = true;

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

      if (!res.ok || data?.success === false) throw new Error(data?.message || 'Không kết nối được hệ thống tư vấn. Bạn thử lại sau nhé.');
      const result = data?.data || data;
      setAiMessages(prev => [...prev, {
        sender: 'ai', text: result.answer || result.tip || result.response || 'AI chưa có câu trả lời. Bạn thử lại sau nhé.',
        bookingForm: result.status === 'error' ? null : result.bookingForm,
      }]);
    } catch (err) {
      setAiMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: err.message || 'Không kết nối được hệ thống tư vấn. Bạn thử lại sau nhé.'
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

  return (<div className="space-y-6">
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
            <div ref={chatRef} onScroll={event => { const node = event.currentTarget; followChat.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; }} className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs" aria-live="polite">
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
                    {msg.sender === 'ai' ? <AiMessageText text={msg.text} /> : <p className="whitespace-pre-wrap">{msg.text}</p>}
                    {msg.bookingForm && onBookingSuggestion && <button className="pc-button pc-button--soft pc-button--small mt-3" onClick={() => onBookingSuggestion(msg.bookingForm)}>Kiểm tra lịch AI đề xuất</button>}
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
