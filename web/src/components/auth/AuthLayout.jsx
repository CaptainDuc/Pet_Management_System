import React from 'react';
import { ArrowLeft, Heart, PawPrint } from 'lucide-react';
import { CustomerBrand } from '../CustomerPortal';

export default function AuthLayout({ children, heading, subtitle }) {
  return <div className="pc-light pc-auth">
    <header className="pc-auth-header"><CustomerBrand /><a className="pc-home-link" href="/"><ArrowLeft size={16} />Về trang chủ</a></header>
    <div className="pc-auth-grid">
      <section className="pc-auth-story" aria-label="Pet Service đồng hành cùng bạn">
        <div><h2>Một nơi dành riêng<br />cho <span>bé yêu của bạn.</span></h2><p>Từ hồ sơ nhỏ đến những buổi hẹn chăm sóc. Mọi điều bạn cần để đồng hành cùng bé, ở ngay đây.</p></div>
        <img src="/images/hero.webp" alt="Chú chó Beagle của Pet Service" />
        <div className="pc-auth-note"><Heart size={22} />Chăm bé bằng cả yêu thương.</div>
      </section>
      <section className="pc-auth-form"><div className="pc-auth-form-inner">
        <h1>{heading === 'Đăng nhập' ? 'Chào bạn trở lại!' : heading}</h1>
        <p className="pc-auth-form-intro">{heading === 'Đăng nhập' ? 'Đăng nhập để tiếp tục chăm sóc những người bạn nhỏ của mình.' : subtitle}</p>
        {children}
        <p className="pc-auth-form-footer"><PawPrint size={15} className="inline-block mr-1" />Pet Service · Trao gửi yêu thương<br />© {new Date().getFullYear()} Pet Service</p>
      </div></section>
    </div>
  </div>;
}
