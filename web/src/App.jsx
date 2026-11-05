import React, { useState } from 'react';
import AdminConsole from './AdminConsole';
import StaffPortal from './StaffPortal';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BedDouble,
  CalendarCheck,
  Check,
  ChevronRight,
  Clock,
  Facebook,
  Heart,
  Instagram,
  Mail,
  MapPin,
  Menu,
  PawPrint,
  Phone,
  Quote,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';

const PHONE = '0898520760';
const PHONE_DISPLAY = '0898 520 760';
const ADDRESS = '73 Đường Số 49, P. Tân Thuận, TP.HCM';

const navLinks = [
  { label: 'Spa thú cưng', href: '#dich-vu' },
  { label: 'Bảng giá', href: '#bang-gia' },
  { label: 'Dịch vụ tại nhà', href: '#tai-nha' },
  { label: 'Combo', href: '#combo' },
  { label: 'Đánh giá', href: '#danh-gia' },
];

const services = [
  {
    icon: Scissors,
    title: 'Grooming',
    subtitle: 'Cắt tỉa lông & tắm vệ sinh',
    description:
      'Chuyên viên của Pet Service giúp bé yêu sạch sẽ, thơm tho và có tạo hình cá tính. Quy trình nhẹ nhàng, an toàn cho cả chó và mèo.',
    color: 'from-brand-blue to-cyan-400',
    bg: 'bg-sky-50',
  },
  {
    icon: ShoppingBag,
    title: 'Pet Shop',
    subtitle: 'Thức ăn & phụ kiện chính hãng',
    description:
      'Hơn 3.000 khách hàng tin tưởng lựa chọn. Pet Service cung cấp thức ăn, đồ chơi và phụ kiện đa dạng, nguồn gốc rõ ràng.',
    color: 'from-brand-peach to-orange-400',
    bg: 'bg-orange-50',
  },
  {
    icon: BedDouble,
    title: 'Pet Hotel',
    subtitle: 'Khách sạn thú cưng chuẩn 5 sao',
    description:
      'Không gian lưu trú sạch sẽ, được chăm sóc và vui chơi mỗi ngày. Bạn yên tâm đi xa, bé yêu luôn được quan tâm tận tình.',
    color: 'from-brand-green to-emerald-400',
    bg: 'bg-emerald-50',
  },
];

const prices = [
  { name: 'Tắm vệ sinh', price: 'từ 200.000đ', note: 'Tắm, sấy, vệ sinh tai và cắt móng' },
  { name: 'Cắt tỉa lông', price: 'từ 250.000đ', note: 'Tạo kiểu theo yêu cầu, phù hợp từng giống' },
  { name: 'Pet Hotel', price: 'từ 150.000đ/ngày', note: 'Phòng sạch, ăn uống và vui chơi đầy đủ' },
  { name: 'Pet Shop', price: 'Giá cạnh tranh', note: 'Thức ăn, phụ kiện, đồ chơi cho thú cưng' },
];

const combos = [
  {
    name: 'Combo #1',
    price: '200.000',
    tag: 'Cơ bản',
    features: ['Tắm sấy', 'Vệ sinh', 'Cắt tỉa lông', 'Phù hợp bé dưới 5kg'],
  },
  {
    name: 'Combo #2',
    price: '300.000',
    tag: 'Được chọn nhiều nhất',
    featured: true,
    features: ['Tắm sấy', 'Vệ sinh', 'Cắt tỉa lông', 'Chăm sóc da & lông'],
  },
  {
    name: 'Combo #3',
    price: '450.000',
    tag: 'Cao cấp',
    features: ['Tắm sấy', 'Vệ sinh', 'Cắt tỉa tạo kiểu', 'Phụ kiện & nước hoa'],
  },
];

const testimonials = [
  {
    name: 'Dino Vũ',
    role: 'Khách hàng thân thiết',
    quote:
      'Bé nhà mình rất nhát nhưng các bạn chăm rất nhẹ nhàng. Lông được tỉa đẹp, thơm và đúng yêu cầu. Sẽ quay lại thường xuyên.',
  },
  {
    name: 'Huy Trần',
    role: 'Khách hàng Pet Hotel',
    quote:
      'Gửi bé ở Pet Service mấy ngày mà yên tâm hẳn. Ngày nào cũng có hình ảnh cập nhật, bé về vui vẻ và sạch sẽ.',
  },
  {
    name: 'Minh Anh',
    role: 'Khách hàng dịch vụ tại nhà',
    quote:
      'Đặt lịch rất nhanh, nhân viên tới đúng giờ. Dụng cụ sạch sẽ, làm việc chuyên nghiệp. Rất đáng để trải nghiệm.',
  },
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-700">
      <div className="hidden bg-brand-navy text-white/80 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 text-xs">
          <div className="flex items-center gap-6">
            <a href={`tel:${PHONE}`} className="flex items-center gap-2 transition hover:text-brand-peach">
              <Phone className="h-3.5 w-3.5" />
              {PHONE_DISPLAY}
            </a>
            <span className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              {ADDRESS}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-2 text-white/60">
              <Clock className="h-3.5 w-3.5" />
              Mở cửa 8:00 – 20:00 hằng ngày
            </span>
            <a href="/staff" className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 font-semibold text-white/80 transition hover:border-brand-peach hover:text-brand-peach">
              <Users className="h-3.5 w-3.5" />
              Cổng nhân viên
            </a>
            <a href="https://facebook.com/petservicehcm/" aria-label="Facebook" className="transition hover:text-brand-peach">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="https://www.instagram.com/hi.pet.service/" aria-label="Instagram" className="transition hover:text-brand-peach">
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4">
          <a href="#trang-chu" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-brand-blue text-white shadow-lg shadow-brand-blue/20">
              <PawPrint className="h-6 w-6" />
            </span>
            <span className="leading-none">
              <span className="block font-display text-xl font-extrabold tracking-tight text-brand-navy">PET SERVICE</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-blue">
                Dịch vụ thú cưng
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-slate-600 transition hover:text-brand-blue"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="hidden items-center gap-2 rounded-full bg-brand-navy px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-navy/20 transition hover:-translate-y-0.5 hover:bg-brand-blue sm:inline-flex"
            >
              <CalendarCheck className="h-4 w-4" />
              Đặt lịch
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Mở menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-brand-navy lg:hidden"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-brand-blue"
                >
                  {link.label}
                  <ChevronRight className="h-4 w-4" />
                </a>
              ))}
              <a
                href={`tel:${PHONE}`}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-brand-navy px-4 py-3 text-sm font-bold text-white"
              >
                <Phone className="h-4 w-4" />
                Gọi {PHONE_DISPLAY}
              </a>
              <a
                href="/staff"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-brand-navy"
              >
                <Users className="h-4 w-4" />
                Cổng nhân viên (Thú y / Lễ tân)
              </a>
            </div>
          </div>
        )}
      </header>

      <main>
        <section id="trang-chu" className="relative scroll-mt-24 overflow-hidden bg-gradient-to-br from-sky-50 via-white to-orange-50">
          <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-brand-blue/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-brand-peach/20 blur-3xl" />

          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:pt-16 lg:grid-cols-2 lg:gap-8 lg:pb-24">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-white/80 px-4 py-2 text-xs font-bold text-brand-navy shadow-sm backdrop-blur">
                <Star className="h-4 w-4 fill-brand-peach text-brand-peach" />
                Uy tín hàng đầu tại Hồ Chí Minh
              </span>

              <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-brand-navy sm:text-6xl lg:text-7xl">
                DỊCH VỤ
                <span className="mt-1 block bg-gradient-to-r from-brand-blue to-brand-navy bg-clip-text text-transparent">
                  THÚ CƯNG
                </span>
              </h1>

              <p className="mt-4 font-script text-3xl font-bold text-brand-blue sm:text-4xl">
                Trao gửi yêu thương
              </p>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-500 sm:text-lg">
                Spa, khách sạn và dịch vụ chăm sóc thú cưng tận nhà. Pet Service mang đến trải nghiệm chuẩn 5 sao,
                an toàn và tận tâm cho mọi bé yêu.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#dich-vu"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-navy px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-brand-navy/20 transition hover:-translate-y-0.5 hover:bg-brand-blue"
                >
                  Xem dịch vụ
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={`tel:${PHONE}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-brand-navy/10 bg-white px-7 py-3.5 text-sm font-bold text-brand-navy shadow-sm transition hover:border-brand-blue hover:text-brand-blue"
                >
                  <Phone className="h-4 w-4" />
                  {PHONE_DISPLAY}
                </a>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-slate-200/70 pt-6">
                {[
                  { value: '3.000+', label: 'Khách hàng tin tưởng' },
                  { value: '4.9/5', label: 'Đánh giá dịch vụ' },
                  { value: '30 phút', label: 'Có mặt tận nơi' },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="font-display text-2xl font-extrabold text-brand-navy sm:text-3xl">{item.value}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
              <div className="absolute inset-x-8 bottom-4 top-10 rounded-[3rem] bg-gradient-to-br from-brand-blue/25 via-sky-100 to-brand-peach/40" />
              <img
                src="/images/hero.webp"
                alt="Chú chó Beagle được chăm sóc tại Pet Service"
                className="relative z-10 mx-auto w-full max-w-lg drop-shadow-2xl"
              />

              <div className="absolute left-0 top-8 z-20 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-xl shadow-brand-navy/10 backdrop-blur sm:left-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-500">
                  <Star className="h-5 w-5 fill-amber-400" />
                </span>
                <div>
                  <p className="font-display text-sm font-extrabold text-brand-navy">4.9/5 sao</p>
                  <p className="text-[11px] text-slate-500">1.200+ đánh giá thực tế</p>
                </div>
              </div>

              <div className="absolute bottom-8 right-0 z-20 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-xl shadow-brand-navy/10 backdrop-blur sm:right-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <BadgeCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-sm font-extrabold text-brand-navy">Chuẩn 5 sao</p>
                  <p className="text-[11px] text-slate-500">Quy trình khắt khe</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative border-t border-white/60 bg-white/70 backdrop-blur">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-6 sm:grid-cols-4">
              {[
                { icon: ShieldCheck, title: 'An toàn tuyệt đối', text: 'Sản phẩm chuyên dụng' },
                { icon: Clock, title: 'Phục vụ nhanh', text: 'Có mặt sau 30 phút' },
                { icon: Heart, title: 'Tận tâm như người nhà', text: 'Yêu thương từng bé' },
                { icon: Award, title: 'Giá minh bạch', text: 'Không phát sinh' },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-blue">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-brand-navy">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="dich-vu" className="scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-blue">Pet Service</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-brand-navy sm:text-5xl">
                Dịch Vụ Hàng Đầu
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-500">
                Mỗi dịch vụ đều được thiết kế để bé yêu có trải nghiệm thoải mái, sạch sẽ và an toàn nhất.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {services.map((service) => (
                <article
                  key={service.title}
                  className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-navy/10"
                >
                  <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full ${service.bg} transition group-hover:scale-125`} />
                  <span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${service.color} text-white shadow-lg`}>
                    <service.icon className="h-7 w-7" />
                  </span>
                  <p className="relative mt-6 text-xs font-bold uppercase tracking-[0.2em] text-brand-blue">
                    {service.subtitle}
                  </p>
                  <h3 className="relative mt-2 font-display text-2xl font-extrabold text-brand-navy">{service.title}</h3>
                  <p className="relative mt-3 text-sm leading-6 text-slate-500">{service.description}</p>
                  <a
                    href="/login"
                    className="relative mt-6 inline-flex items-center gap-1 text-sm font-bold text-brand-navy transition group-hover:text-brand-blue"
                  >
                    Đặt lịch ngay
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="bang-gia" className="scroll-mt-24 overflow-hidden bg-brand-soft py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2">
            <div className="relative">
              <div className="absolute -left-6 -top-6 h-28 w-28 rounded-full bg-brand-peach/40 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-brand-navy/15">
                <img
                  src="/images/home-service.jpg"
                  alt="Chuyên viên Pet Service chăm sóc lông cho thú cưng"
                  loading="lazy"
                  className="h-[430px] w-full object-cover sm:h-[520px]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-navy/80 to-transparent p-6 pt-20 text-white">
                  <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                    <Sparkles className="h-3.5 w-3.5 text-brand-peach" />
                    Khám sức khỏe miễn phí
                  </p>
                  <p className="mt-3 font-display text-xl font-bold">Quy trình chăm sóc khắt khe</p>
                </div>
              </div>
              <div className="absolute -bottom-5 -right-4 rounded-2xl bg-white px-5 py-4 shadow-xl shadow-brand-navy/10 sm:-right-6">
                <p className="font-display text-2xl font-extrabold text-brand-blue">5.000+</p>
                <p className="text-xs font-semibold text-slate-500">lượt chăm sóc mỗi năm</p>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-blue">Thông tin & bảng giá</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-brand-navy sm:text-5xl">
                Spa Thú Cưng <span className="text-brand-blue">Pet Service</span>
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-500">
                Tắm vệ sinh, cắt tỉa lông, khách sạn và phụ kiện. Giá tham khảo, có thể thay đổi theo giống và cân nặng
                của bé.
              </p>

              <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-white bg-white/80 px-5 shadow-sm backdrop-blur">
                {prices.map((item) => (
                  <div key={item.name} className="flex items-start gap-4 py-4">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-brand-navy">{item.name}</p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.note}</p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-extrabold text-brand-blue">{item.price}</p>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-navy px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-navy/20 transition hover:bg-brand-blue"
                >
                  Đặt lịch ngay
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={`tel:${PHONE}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-navy/10 bg-white px-6 py-3 text-sm font-bold text-brand-navy transition hover:border-brand-blue hover:text-brand-blue"
                >
                  <Phone className="h-4 w-4" />
                  Tư vấn miễn phí
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="ve-chung-toi" className="relative scroll-mt-24 overflow-hidden bg-brand-navy py-20 text-white sm:py-24">
          <div className="pointer-events-none absolute -right-20 top-0 h-96 w-96 rounded-full bg-brand-blue/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-brand-peach/10 blur-3xl" />
          <div className="relative mx-auto max-w-7xl px-4">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-peach">Vì sao chọn chúng tôi</span>
                <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                  Dịch vụ tận tình,
                  <span className="block text-brand-blue">an tâm chất lượng</span>
                </h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
                  Mọi hành động tại Pet Service đều bắt đầu từ sứ mệnh trao gửi yêu thương. Đội ngũ nhiều kinh nghiệm, quy
                  trình chuẩn và sự cẩn trọng trong từng chi tiết.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    {
                      icon: ShieldCheck,
                      title: 'Dịch vụ chuyên nghiệp',
                      text: 'Quy trình khắt khe, dụng cụ vô trùng, sản phẩm an toàn cho da và lông.',
                    },
                    {
                      icon: Clock,
                      title: 'Có mặt chỉ sau 30 phút',
                      text: 'Chỉ cần nhấc máy, đội ngũ Pet Service sẵn sàng đến tận nhà phục vụ.',
                    },
                    {
                      icon: Heart,
                      title: 'Yêu thương như người nhà',
                      text: 'Mỗi bé đều được quan tâm đặc biệt, nhẹ nhàng và kiên nhẫn.',
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue/20 text-brand-blue">
                        <item.icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-display text-base font-bold">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-white/60">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white p-6 text-brand-navy shadow-2xl sm:mt-10">
                  <Users className="h-8 w-8 text-brand-blue" />
                  <p className="mt-6 font-display text-4xl font-extrabold">3.000+</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Khách hàng tin tưởng</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-brand-blue to-cyan-400 p-6 text-white shadow-2xl">
                  <Star className="h-8 w-8 fill-brand-peach text-brand-peach" />
                  <p className="mt-6 font-display text-4xl font-extrabold">4.9/5</p>
                  <p className="mt-1 text-sm font-semibold text-white/80">Đánh giá trung bình</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-brand-peach to-orange-400 p-6 text-brand-navy shadow-2xl">
                  <Award className="h-8 w-8" />
                  <p className="mt-6 font-display text-4xl font-extrabold">5 sao</p>
                  <p className="mt-1 text-sm font-semibold text-brand-navy/70">Chất lượng dịch vụ</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur sm:mt-10">
                  <Clock className="h-8 w-8 text-brand-peach" />
                  <p className="mt-6 font-display text-4xl font-extrabold">30 phút</p>
                  <p className="mt-1 text-sm font-semibold text-white/60">Có mặt tận nơi</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="tai-nha" className="scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-blue">Tiện lợi tại nhà</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-brand-navy sm:text-5xl">
                Dịch Vụ Thú Cưng <span className="text-brand-blue">Tại Nhà</span>
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-500">
                Không cần di chuyển, không lo bé căng thẳng. Chuyên viên Pet Service đến tận nhà với đầy đủ dụng cụ và sản
                phẩm chuyên dụng.
              </p>

              <div className="mt-7 space-y-3">
                {['Tắm vệ sinh & sấy khô', 'Tỉa lông tạo kiểu theo yêu cầu', 'Cạo lông vệ sinh', 'Vệ sinh tai, cắt móng'].map(
                  (item) => (
                    <div key={item} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm font-semibold text-slate-600">{item}</span>
                    </div>
                  ),
                )}
              </div>

              <div className="mt-8 inline-flex items-end gap-3 rounded-2xl bg-brand-soft px-6 py-4">
                <span className="text-sm font-semibold text-slate-500">Chỉ từ</span>
                <span className="font-display text-3xl font-extrabold text-brand-navy">250.000đ</span>
                <span className="pb-1 text-sm text-slate-500">/ bé</span>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-navy px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-navy/20 transition hover:bg-brand-blue"
                >
                  Đặt lịch tại nhà
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href={`tel:${PHONE}`}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-navy/10 bg-white px-6 py-3 text-sm font-bold text-brand-navy transition hover:border-brand-blue hover:text-brand-blue"
                >
                  <Phone className="h-4 w-4" />
                  Gọi tư vấn
                </a>
              </div>
            </div>

            <div className="relative order-1 lg:order-2">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-brand-peach/30 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-brand-navy/15">
                <img
                  src="/images/service-2.jpg"
                  alt="Đội ngũ Pet Service chăm sóc thú cưng"
                  loading="lazy"
                  className="h-[380px] w-full object-cover sm:h-[500px]"
                />
              </div>
              <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-xl shadow-brand-navy/10 sm:left-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                  <Clock className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-sm font-extrabold text-brand-navy">Đúng giờ hẹn</p>
                  <p className="text-[11px] text-slate-500">Có mặt sau 30 phút</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="combo" className="scroll-mt-24 bg-slate-50 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-blue">Bảng giá combo</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-brand-navy sm:text-5xl">
                PET SERVICE <span className="text-brand-blue">COMBO</span>
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-500">
                Lựa chọn tiết kiệm cho mỗi lần chăm sóc. Giá sẽ thay đổi theo giống và trọng lượng của bé.
              </p>
            </div>

            <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
              {combos.map((combo) => (
                <article
                  key={combo.name}
                  className={`relative flex flex-col rounded-3xl p-7 transition duration-300 hover:-translate-y-1 ${
                    combo.featured
                      ? 'bg-brand-navy text-white shadow-2xl shadow-brand-navy/25 lg:-mt-4 lg:mb-4'
                      : 'border border-slate-200 bg-white text-brand-navy shadow-sm hover:shadow-xl hover:shadow-brand-navy/10'
                  }`}
                >
                  {combo.featured && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-peach px-4 py-1 text-xs font-extrabold text-brand-navy shadow-lg">
                      {combo.tag}
                    </span>
                  )}
                  <p className={`text-xs font-bold uppercase tracking-[0.25em] ${combo.featured ? 'text-brand-blue' : 'text-brand-blue'}`}>
                    {combo.name}
                  </p>
                  {!combo.featured && <p className="mt-1 text-xs font-semibold text-slate-400">{combo.tag}</p>}
                  <div className="mt-5 flex items-end gap-1">
                    <span className="font-display text-4xl font-extrabold">{combo.price}</span>
                    <span className={`pb-1 text-sm font-semibold ${combo.featured ? 'text-white/60' : 'text-slate-400'}`}>
                      VNĐ
                    </span>
                  </div>
                  <div className={`my-6 h-px w-full ${combo.featured ? 'bg-white/15' : 'bg-slate-100'}`} />
                  <ul className="flex-1 space-y-3">
                    {combo.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            combo.featured ? 'bg-brand-blue/20 text-brand-blue' : 'bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <span className={combo.featured ? 'text-white/80' : 'text-slate-600'}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="/login"
                    className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition ${
                      combo.featured
                        ? 'bg-brand-peach text-brand-navy hover:bg-white'
                        : 'bg-brand-navy text-white hover:bg-brand-blue'
                    }`}
                  >
                    Đặt lịch ngay
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="danh-gia" className="scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-brand-blue/15 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-brand-navy/15">
                <img
                  src="/images/testimonial-1.jpg"
                  alt="Khách hàng và thú cưng tại Pet Service"
                  loading="lazy"
                  className="h-[420px] w-full object-cover sm:h-[520px]"
                />
              </div>
              <div className="absolute -bottom-5 right-4 rounded-2xl bg-white px-5 py-4 shadow-xl shadow-brand-navy/10">
                <div className="flex items-center gap-1 text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">1.200+ đánh giá thực tế</p>
              </div>
            </div>

            <div className="lg:col-span-3">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-blue">Khách hàng nói gì</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-brand-navy sm:text-5xl">
                Niềm tin từ <span className="text-brand-blue">những người bạn bốn chân</span>
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-500">
                Hàng nghìn khách hàng đã chọn Pet Service để chăm sóc bé yêu. Đây là chia sẻ của họ.
              </p>

              <div className="mt-8 space-y-4">
                {testimonials.map((item) => (
                  <figure key={item.name} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft font-display text-sm font-extrabold text-brand-navy">
                        {item.name.charAt(0)}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-extrabold text-brand-navy">{item.name}</p>
                            <p className="text-xs text-slate-400">{item.role}</p>
                          </div>
                          <Quote className="h-6 w-6 text-brand-blue/30" />
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-amber-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className="h-3.5 w-3.5 fill-current" />
                          ))}
                        </div>
                        <blockquote className="mt-2 text-sm leading-6 text-slate-500">{item.quote}</blockquote>
                      </div>
                    </div>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="dat-lich" className="scroll-mt-24 bg-gradient-to-br from-brand-navy via-[#1f2760] to-brand-navy py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-2">
            <div className="text-white">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-peach">Liên hệ & đặt lịch</span>
              <h2 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                Sẵn sàng chăm sóc
                <span className="block text-brand-blue">bé yêu của bạn</span>
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/70">
                Liên hệ ngay để được tư vấn và báo giá các dịch vụ phù hợp. Để đặt lịch trực tuyến, quý khách vui lòng
                đăng nhập tài khoản khách hàng.
              </p>

              <div className="mt-8 space-y-4">
                <a href={`tel:${PHONE}`} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/20 text-brand-blue">
                    <Phone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Hotline 24/7</p>
                    <p className="font-display text-lg font-bold">{PHONE_DISPLAY}</p>
                  </div>
                </a>
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-peach/20 text-brand-peach">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Địa chỉ</p>
                    <p className="text-sm font-bold">{ADDRESS}</p>
                  </div>
                </div>
                <a href="mailto:hi.petservicehcm@gmail.com" className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/20 text-emerald-300">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Email</p>
                    <p className="text-sm font-bold">hi.petservicehcm@gmail.com</p>
                  </div>
                </a>
              </div>
            </div>

            <div className="flex min-h-[380px] flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-2xl">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand-blue">
                <Users className="h-8 w-8" />
              </span>
              <h3 className="mt-5 font-display text-2xl font-bold text-brand-navy">Đăng nhập để đặt lịch</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                Quý khách cần đăng nhập tài khoản khách hàng để đặt lịch, theo dõi lịch hẹn và quản lý thú cưng của mình.
              </p>
              <a
                href="/login"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-brand-navy px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-navy/20 transition hover:-translate-y-0.5 hover:bg-brand-blue"
              >
                <CalendarCheck className="h-4 w-4" />
                Đăng nhập / Đăng ký
              </a>
              <a
                href={`tel:${PHONE}`}
                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-brand-blue"
              >
                <Phone className="h-3.5 w-3.5" />
                Hoặc gọi {PHONE_DISPLAY} để được tư vấn
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#171d3f] text-white/70">
        <div className="mx-auto max-w-7xl px-4 py-14">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <a href="#trang-chu" className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-navy text-white">
                  <PawPrint className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-display text-lg font-extrabold text-white">PET SERVICE</span>
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-blue">
                    Dịch vụ thú cưng
                  </span>
                </span>
              </a>
              <p className="mt-4 text-sm leading-6">
                Pet Service ra đời với mong muốn mang đến sự chuyên nghiệp, uy tín và trải nghiệm tốt nhất cho thú cưng
                của bạn.
              </p>
              <div className="mt-5 flex items-center gap-3">
                <a href="https://facebook.com/petservicehcm/" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-brand-blue hover:text-white">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href="https://www.instagram.com/hi.pet.service/" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-brand-blue hover:text-white">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href={`tel:${PHONE}`} aria-label="Gọi điện" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-brand-blue hover:text-white">
                  <Phone className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">Dịch vụ</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {['Spa thú cưng chuẩn 5 sao', 'Tắm thú cưng tại nhà', 'Cắt tỉa lông tạo kiểu', 'Khách sạn thú cưng', 'Sản phẩm & phụ kiện'].map(
                  (item) => (
                    <li key={item}>
                      <a href="#dich-vu" className="transition hover:text-brand-peach">
                        {item}
                      </a>
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">Truy cập</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {[
                  { label: 'Trang chủ', href: '#trang-chu' },
                  { label: 'Bảng giá', href: '#bang-gia' },
                  { label: 'Combo dịch vụ', href: '#combo' },
                  { label: 'Đánh giá khách hàng', href: '#danh-gia' },
                  { label: 'Đăng nhập để đặt lịch', href: '/login' },
                  { label: 'Cổng nhân viên (Thú y / Lễ tân)', href: '/staff' },
                ].map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="transition hover:text-brand-peach">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">Liên hệ</h3>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                  <span>{ADDRESS}</span>
                </li>
                <li className="flex gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                  <a href={`tel:${PHONE}`} className="transition hover:text-brand-peach">
                    Hotline {PHONE_DISPLAY}
                  </a>
                </li>
                <li className="flex gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                  <a href="mailto:hi.petservicehcm@gmail.com" className="break-all transition hover:text-brand-peach">
                    hi.petservicehcm@gmail.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
            <p>© 2019 Pet Service. All rights reserved.</p>
            <p>Made with ♥ for pets in Hồ Chí Minh.</p>
          </div>
        </div>
      </footer>

      <a
        href={`tel:${PHONE}`}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-white shadow-2xl shadow-brand-green/30 transition hover:scale-105 sm:hidden"
        aria-label="Gọi Pet Service"
      >
        <Phone className="h-6 w-6" />
      </a>
    </div>
  );
}

const STAFF_ROUTES = ['/staff', '/vet', '/thuy', '/reception', '/letan', '/dashboard'];
const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

function matchesRoute(pathname, routes) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function authScreenFor(pathname) {
  if (matchesRoute(pathname, ['/register'])) return 'register';
  if (matchesRoute(pathname, ['/forgot-password'])) return 'forgot-password';
  return 'login';
}

export default function App() {
  const { pathname } = window.location;

  if (matchesRoute(pathname, AUTH_ROUTES)) {
    return <StaffPortal initialScreen={authScreenFor(pathname)} />;
  }

  if (matchesRoute(pathname, STAFF_ROUTES)) {
    return <StaffPortal />;
  }

  if (matchesRoute(pathname, ['/admin'])) {
    return <AdminConsole />;
  }

  return <LandingPage />;
}
