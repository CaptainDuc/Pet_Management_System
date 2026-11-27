import React, { useState, useEffect, useRef } from 'react';
import { Award, CheckCircle, CheckCircle2, Sparkles, Send, RefreshCw, TrendingUp, Gift } from 'lucide-react';
import { Card, Input, Button, Badge } from '../../design-system/components';
import AiMessageText from '../../components/AiMessageText';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export default function CustomerExtras({ user, token, activeTab, onApiLog, onBookingSuggestion }) {
  // Loyalty state
  const [loyaltyData, setLoyaltyData] = useState({
    points: 0,
    tier: 'BRONZE',
    lifetimePoints: 0,
    discountPercent: 0,
    nextTier: null,
    nextTierPoints: 500,
    progressPercent: 0
  });
  const [tierBenefits, setTierBenefits] = useState([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  // AI Chat state
  const [aiMessages, setAiMessages] = useState([
    {
      sender: 'ai',
      text: 'Xin chào bạn! Tôi là Trợ lý AI Bác sĩ Thú y PetCare. Bạn đang quan sát thấy thú cưng có triệu chứng gì bất thường, hoặc cần tư vấn chăm sóc không?'
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
      const [meRes, discountRes, nextTierRes, tiersRes] = await Promise.all([
        fetch(`${API_BASE}/loyalty/me`, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/loyalty/discount`, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/loyalty/next-tier`, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/loyalty/tiers`, {
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [meData, discountData, nextTierData, tiersData] = await Promise.all([
        meRes.json(), discountRes.json(), nextTierRes.json(), tiersRes.json()
      ]);

      if (onApiLog) {
        onApiLog({ status: meRes.status, data: meData, label: 'loyalty/me' });
        onApiLog({ status: discountRes.status, data: discountData, label: 'loyalty/discount' });
        onApiLog({ status: nextTierRes.status, data: nextTierData, label: 'loyalty/next-tier' });
        onApiLog({ status: tiersRes.status, data: tiersData, label: 'loyalty/tiers' });
      }

      if (meRes.ok && meData?.data) {
        const account = meData.data;
        setLoyaltyData(prev => ({
          ...prev,
          points: account.points || 0,
          tier: account.tier || 'BRONZE',
          lifetimePoints: account.lifetimePoints || 0
        }));
      }

      if (discountRes.ok && discountData?.data) {
        setLoyaltyData(prev => ({
          ...prev,
          discountPercent: discountData.data.discountPercent || 0
        }));
      }

      if (nextTierRes.ok && nextTierData?.data) {
        const next = nextTierData.data;
        if (next.maxTierReached) {
          setLoyaltyData(prev => ({ ...prev, nextTier: null, progressPercent: 100 }));
        } else {
          setLoyaltyData(prev => ({
            ...prev,
            nextTier: next.nextTier,
            nextTierPoints: next.nextTierPoints,
            progressPercent: next.progressPercent || 0
          }));
        }
      }

      if (tiersRes.ok && tiersData?.data) {
        const currentTierConfig = tiersData.data.find(t => t.name === loyaltyData.tier);
        if (currentTierConfig) {
          setTierBenefits(currentTierConfig.benefits || []);
        }
      }
    } catch (err) {
      console.warn('Loyalty fetch error:', err);
    } finally {
      setLoyaltyLoading(false);
    }
  };

  useEffect(() => { if (activeTab === "loyalty") fetchLoyalty(); }, [activeTab, token, loyaltyData.tier]);
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
                Tích lũy 1 điểm cho mỗi 10.000 đ chi tiêu tại PetCare để nâng hạng thẻ và nhận ưu đãi tự động
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
                {loyaltyData.discountPercent > 0 && (
                  <div className="mb-4 p-3 bg-[var(--color-role-customer-bg)]/50 border border-[var(--color-role-customer-border)]/50 rounded-lg flex items-center space-x-3">
                    <Gift className="w-5 h-5 text-[var(--color-role-customer-main)]" />
                    <div>
                      <span className="font-semibold text-slate-900">Tự động giảm giá tại thanh toán: </span>
                      <span className="text-lg font-bold text-[var(--color-role-customer-main)]">{loyaltyData.discountPercent}%</span>
                      <span className="text-slate-600 ml-1">cho tất cả dịch vụ</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {tierBenefits.map((benefit, idx) => (
                    <Card key={idx} variant="outlined" padding="md" className="bg-slate-50 border-slate-100">
                      <div className="flex items-center space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-slate-700">{benefit}</span>
                      </div>
                    </Card>
                  ))}
                  {tierBenefits.length === 0 && (
                    <Card variant="outlined" padding="md" className="bg-slate-50 border-slate-100 col-span-2">
                      <div className="flex items-center space-x-2.5 text-slate-500">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Không có quyền lợi đặc biệt cho hạng này</span>
                      </div>
                    </Card>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                {loyaltyData.nextTier ? (
                  <>
                    <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-medium">
                      <span>Tiến trình nâng hạng {loyaltyData.nextTier}:</span>
                      <span>{loyaltyData.points} / {loyaltyData.nextTierPoints} điểm ({loyaltyData.progressPercent}%)</span>
                    </div>
                    <div className="w-full bg-[var(--color-neutral-100)] rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[var(--color-role-customer-main)] h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, loyaltyData.progressPercent)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items_center justify-center text-sm text-emerald-600 font-medium py-2">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Bạn đã đạt hạng cao nhất - KIM CƯƠNG!
                  </div>
                )}
              </div>
            </Card>
          </div>
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
                  Hỏi đáp triệu chứng, sơ cứu ban đầu & lịch tiêm phòng chuẩn thú y
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
                onClick={() => handleSendAi('Khi đưa mèo đi khám tổng quát, mình cần chuẩn bị gì?')}
                className="whitespace-nowrap"
              >
                ✨ Chuẩn bị cho buổi khám?
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
                  placeholder="Hỏi AI về sức khỏe, triệu chứng của thú cưng..."
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
