-- Initial catalogue approved by the project owner. Prices are test prices.
-- Existing catalogue edits are retained when these IDs are already present.
INSERT INTO service_categories (id, name, description, icon) VALUES
('ca4e0000-0000-4000-8000-000000000001', 'Chăm sóc cơ bản', 'Tắm, vệ sinh và cắt tỉa cho thú cưng', 'Scissors'),
('ca4e0000-0000-4000-8000-000000000002', 'Combo chăm sóc', 'Các gói chăm sóc thú cưng trọn buổi', 'Sparkles')
ON CONFLICT (id) DO NOTHING;

INSERT INTO services (id, category_id, name, description, base_price, duration_minutes, is_active) VALUES
('ca4e1000-0000-4000-8000-000000000001', 'ca4e0000-0000-4000-8000-000000000001', 'Tắm vệ sinh', 'Giá mẫu để kiểm thử. Tắm, sấy khô và chải lông.', 200000, 60, true),
('ca4e1000-0000-4000-8000-000000000002', 'ca4e0000-0000-4000-8000-000000000001', 'Cắt tỉa tạo kiểu', 'Giá mẫu để kiểm thử. Cắt tỉa theo giống và yêu cầu.', 250000, 60, true),
('ca4e1000-0000-4000-8000-000000000003', 'ca4e0000-0000-4000-8000-000000000001', 'Vệ sinh tai', 'Giá mẫu để kiểm thử. Vệ sinh tai ngoài.', 50000, 30, true),
('ca4e1000-0000-4000-8000-000000000004', 'ca4e0000-0000-4000-8000-000000000001', 'Cắt móng', 'Giá mẫu để kiểm thử. Cắt và làm gọn móng.', 50000, 30, true),
('ca4e1000-0000-4000-8000-000000000005', 'ca4e0000-0000-4000-8000-000000000001', 'Cạo lông vệ sinh', 'Giá mẫu để kiểm thử. Làm gọn lông vùng bụng, bàn chân và vùng vệ sinh.', 100000, 30, true),
('ca4e1000-0000-4000-8000-000000000006', 'ca4e0000-0000-4000-8000-000000000002', 'Combo cơ bản', 'Giá mẫu để kiểm thử. Tắm sấy, vệ sinh tai, cắt móng và tỉa gọn.', 200000, 90, true),
('ca4e1000-0000-4000-8000-000000000007', 'ca4e0000-0000-4000-8000-000000000002', 'Combo đầy đủ', 'Giá mẫu để kiểm thử. Tắm sấy, vệ sinh và cắt tỉa toàn thân.', 300000, 120, true),
('ca4e1000-0000-4000-8000-000000000008', 'ca4e0000-0000-4000-8000-000000000002', 'Combo cao cấp', 'Giá mẫu để kiểm thử. Combo đầy đủ, tạo kiểu và chăm sóc lông.', 450000, 150, true)
ON CONFLICT (id) DO NOTHING;
