import React, { useId, useRef, useState } from 'react';
import { ImagePlus, Upload, X } from 'lucide-react';

export default function PetPhotoInput({ value, onChange, disabled, onBusyChange }) {
  const id = useId();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function choose(files) {
    setDragging(false);
    if (disabled || busy || !files?.length) return;
    setError('');
    if (files.length !== 1) { setError('Bạn chọn một ảnh cho hồ sơ của bé nhé.'); return; }
    const file = files[0];
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Bạn chọn ảnh JPG, PNG hoặc WebP nhé.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Ảnh lớn hơn 5 MB. Bạn chọn ảnh nhỏ hơn nhé.'); return; }
    setBusy(true);
    onBusyChange(true);
    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL('image/jpeg', 0.82);
      if (photo.length > 350000) throw new Error('Ảnh này còn quá lớn sau khi thu nhỏ. Bạn chọn ảnh khác nhé.');
      onChange(photo);
    } catch (err) { setError(err.message?.startsWith('Ảnh này') ? err.message : 'Chưa đọc được ảnh. Bạn thử một ảnh JPG, PNG hoặc WebP khác nhé.'); }
    finally {
      bitmap?.close();
      setBusy(false);
      onBusyChange(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return <div className="pc-photo-field">
    <span className="pc-field">Ảnh của bé</span>
    <label htmlFor={id} className={`pc-photo-drop ${dragging ? 'pc-photo-drop--active' : ''} ${disabled || busy ? 'pc-photo-drop--disabled' : ''}`}
      onDragOver={event => { event.preventDefault(); if (!disabled && !busy) setDragging(true); }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={event => { event.preventDefault(); choose(event.dataTransfer.files); }}>
      <input ref={inputRef} id={id} name="petPhotoFile" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled || busy}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} onChange={event => choose(event.target.files)} />
      {value ? <img src={value} alt="Ảnh hồ sơ đang chọn" /> : <ImagePlus size={30} />}
      <span><strong>{busy ? 'Đang chuẩn bị ảnh...' : value ? 'Kéo ảnh mới vào để thay' : 'Kéo ảnh của bé vào đây'}</strong><span><Upload size={15} />hoặc nhấn để chọn ảnh từ máy</span></span>
    </label>
    <small id={`${id}-help`} className="pc-muted">JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh được thu nhỏ để lưu cùng hồ sơ.</small>
    {error && <p id={`${id}-error`} className="pc-notice" role="alert">{error}</p>}
    {value && <button type="button" className="pc-text-button" disabled={disabled || busy} onClick={() => { onChange(''); setError(''); }}><X size={15} />Bỏ ảnh đang chọn</button>}
    <details><summary className="pc-text-button">Dùng đường dẫn ảnh</summary><label className="pc-field mt-2">Đường dẫn HTTP/HTTPS<input name="petPhoto" type="url" maxLength={500} disabled={disabled || busy} value={value?.startsWith('data:') ? '' : value || ''} placeholder="https://..." onChange={event => { onChange(event.target.value); setError(''); }} /></label></details>
  </div>;
}
