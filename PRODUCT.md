# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 18 + Vite 5 + TailwindCSS 3, lucide-react icons. Mobile: React Native 0.74 + Expo SDK 51 (Expo Router), shared design system with web.

## Users

**Primary:** Pet owners (CUSTOMER) in HCM City — book appointments, manage pet profiles, track loyalty points, chat with AI vet assistant, pay via VietQR.

**Secondary (staff portal):**
- STAFF / RECEPTIONIST — manage appointments, invoices, payments, client onboarding
- VETERINARIAN — medical records, prescriptions, diagnosis, appointment status
- OWNER — full management, revenue reports, staff, promotions, audit logs
- ADMIN — system config, RAG knowledge documents, RBAC management

## Product Purpose

Pet Service is a single-location premium pet care clinic in HCM City (73 Đường Số 49, P. Tân Thuận) offering spa/grooming, pet hotel, home-service, and veterinary care. The digital product lets customers book appointments (clinic or home), manage pet health records, earn/redeem loyalty points, and get 24/7 AI vet guidance — while staff run daily operations through a unified portal.

Success = high booking conversion, low no-show rate, strong repeat visits (loyalty), and staff efficiency on the portal.

## Positioning

The only pet care brand in HCM combining **5-star spa/hotel standards**, **30-minute home service**, **transparent pricing**, and **AI vet triage** under one roof — with a loyalty program that turns every visit into redeemable value.

## Operating Context

- Physical clinic: 8:00–20:00 daily, hotline 0898 520 760
- Home service radius: ~30 min travel, booked via same portal
- Staff workflows: receptionist confirms bookings → vet performs service → invoice generated → payment (cash/VietQR) → loyalty points awarded → review requested
- Customer rituals: book → get reminder → visit/home-service → pay → earn points → redeem vouchers → review
- Docs & assets: brand logo (PawPrint), brand colors (navy/blue/peach), testimonials (3), hero images (clinic, home-service, pets)

## Capabilities and Constraints

**Confirmed functionality:**
- Pet profiles (name, species, breed, gender, DOB, weight, allergies, photo)
- Appointment booking: clinic slots + home-service, service catalog with duration/price, staff assignment, promotion codes
- Loyalty: 4 tiers (Bronze→Silver→Gold→Diamond), 1pt/10k VND spend, vouchers (50k spa, free checkup, vitamin kit)
- AI Vet chat: symptom triage, vaccine schedule, nutrition advice (FastAPI backend)
- Payments: VietQR (SePay webhook), cash, invoice generation
- Reviews: post-completion rating + comment
- Staff portal: dashboards per role, appointment management, medical records, analytics

**Technical constraints:**
- API Gateway (port 8000) → Core Backend (8080), Payment (8082), Notification (8083)
- 3 separate PostgreSQL databases (Core, Payment, Notification) + Redis + RabbitMQ
- JWT HS256, access/refresh rotation, RBAC via @PreAuthorize
- Flyway migrations (validate-on-migrate), pgvector on Core DB for AI RAG
- Web served via Docker (nginx) on port 80; mobile via Expo

**Undecided:** None at this time.

## Brand Commitments

- **Name:** Pet Service (customer-facing), PetCare Platform (internal/system)
- **Tagline:** "Trao gửi yêu thương"
- **Voice:** Professional, warm, trustworthy, Vietnamese-first
- **Visual identity:** Navy (#171d3f) primary, Blue gradient accents, Peach highlight, PawPrint logo
- **Assets:** Hero images (clinic, home-service, testimonial), logo files in `/web/public/`
- **Legal:** "© 2019 Pet Service. All rights reserved."

## Evidence on Hand

- 3 customer testimonials (Dino Vũ, Huy Trần, Minh Anh) with 5-star ratings
- Claimed metrics: 3,000+ customers, 4.9/5 avg rating, 5,000+ services/year, 30-min home response
- Real content: service catalog (Grooming, Pet Shop, Pet Hotel), pricing table, 3 combo tiers
- No fabricated testimonials, benchmarks, or pricing claims beyond what's in code

## Product Principles

1. **Trust through transparency** — prices, process, and policies visible before booking
2. **Convenience without compromise** — home service matches clinic quality; 30-min SLA
3. **Loyalty that compounds** — every visit earns; tiers unlock real value, not status theater
4. **AI as safety net, not replacement** — triage + education; always escalate to vet when needed
5. **Staff efficiency = customer experience** — portal reduces admin friction so staff focus on pets

## Accessibility & Inclusion

- Vietnamese language primary; UI text in Vietnamese
- Target: WCAG AA for customer-facing surfaces (landing, booking, dashboard)
- Color contrast: brand navy/blue/peach on white/light backgrounds meets AA
- Touch targets ≥ 44px on mobile; focus-visible states on all interactive elements
- No product-specific accessibility requirements beyond standard web best practices