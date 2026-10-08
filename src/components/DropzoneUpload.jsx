import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, Check } from 'lucide-react';

export default function DropzoneUpload({ label, currentImage, onImageSelected, helperText, placeholder = "Upload .png logo" }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(currentImage || '');
  const fileInputRef = useRef(null);

  const processFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG, JPEG, SVG or WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setPreview(dataUrl);
      if (onImageSelected) {
        onImageSelected(dataUrl, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview('');
    if (onImageSelected) onImageSelected('', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ marginBottom: '18px' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '13px',
          color: 'var(--text-muted)',
          marginBottom: '6px',
          fontWeight: 600
        }}>
          {label}
        </label>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed var(--primary)' : '2px dashed rgba(255, 255, 255, 0.2)',
          backgroundColor: isDragging ? 'rgba(251, 175, 51, 0.08)' : '#0d0d0b',
          borderRadius: '12px',
          padding: '20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => processFile(e.target.files?.[0])}
          style={{ display: 'none' }}
        />

        {preview ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: '#fff',
              padding: '8px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              position: 'relative'
            }}>
              <img
                src={preview}
                alt="Preview"
                style={{
                  maxHeight: '70px',
                  maxWidth: '180px',
                  objectFit: 'contain'
                }}
              />
              <button
                type="button"
                onClick={handleRemove}
                title="Remove image"
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#d31c1c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.6)'
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Check size={14} />
              <span>Image attached! Click or drag to replace</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'rgba(251, 175, 51, 0.1)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UploadCloud size={22} />
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
              Drag and drop your logo here, or <span style={{ color: 'var(--primary)' }}>browse</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              PNG, WebP, or SVG with transparent background recommended (No GitHub links needed!)
            </div>
          </div>
        )}
      </div>

      {helperText && (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
          {helperText}
        </span>
      )}
    </div>
  );
}
