import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Video, Film, X, Check } from 'lucide-react';
import { uploadAssetToR2 } from '../services/api';

export default function DropzoneUpload({
  label,
  currentImage,
  onImageSelected,
  helperText,
  placeholder,
  acceptType = 'image', // 'image' | 'video' | 'any'
  tableSlug = 'beverley'
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(currentImage || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreview(currentImage || '');
  }, [currentImage]);

  const isVideoMode = acceptType === 'video';
  const isVideoContent = Boolean(
    isVideoMode ||
    (typeof preview === 'string' && (
      preview.endsWith('.mp4') ||
      preview.endsWith('.webm') ||
      preview.includes('video/') ||
      preview.startsWith('data:video')
    ))
  );

  const processFile = async (file) => {
    if (!file) return;

    const fileName = (file.name || '').toLowerCase();
    const isVideo = file.type.startsWith('video/') || fileName.endsWith('.mp4') || fileName.endsWith('.webm');
    const isImage = file.type.startsWith('image/') || fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp') || fileName.endsWith('.svg');

    if (isVideoMode && !isVideo) {
      alert("Please upload a video file (.mp4 or .webm).");
      return;
    }

    if (!isVideoMode && acceptType === 'image' && !isImage) {
      alert("Please upload an image file (PNG, JPEG, SVG or WebP).");
      return;
    }

    // Fast local preview using object URL
    let localUrl = '';
    try {
      localUrl = URL.createObjectURL(file);
      setPreview(localUrl);
    } catch (e) {}

    setIsUploading(true);
    const r2Url = await uploadAssetToR2(file, tableSlug);
    setIsUploading(false);

    const finalUrl = r2Url || localUrl;
    setPreview(finalUrl);

    if (onImageSelected) {
      onImageSelected(finalUrl, file.name);
    }
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

  const fileAcceptAttr = isVideoMode
    ? "video/mp4,video/webm"
    : acceptType === 'any'
    ? "image/*,video/mp4,video/webm"
    : "image/png,image/jpeg,image/webp,image/svg+xml";

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
          position: 'relative',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={fileAcceptAttr}
          onChange={(e) => processFile(e.target.files?.[0])}
          style={{ display: 'none' }}
        />

        {preview ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: '#000',
              padding: '8px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
              position: 'relative',
              maxWidth: '100%'
            }}>
              {isVideoContent ? (
                <video
                  src={preview}
                  controls
                  muted
                  autoPlay
                  loop
                  playsInline
                  style={{
                    maxHeight: '120px',
                    maxWidth: '240px',
                    borderRadius: '6px',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  style={{
                    maxHeight: '70px',
                    maxWidth: '180px',
                    objectFit: 'contain',
                    background: '#000000',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '4px',
                    padding: '4px'
                  }}
                />
              )}
              <button
                type="button"
                onClick={handleRemove}
                title={isVideoContent ? "Remove video" : "Remove image"}
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#d31c1c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
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

            {isUploading ? (
              <div style={{ fontSize: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                <span>Uploading {isVideoMode ? 'video' : 'media'} to Cloudflare R2 edge CDN...</span>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#86efac', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Check size={14} />
                <span>{isVideoContent ? 'Video loop' : 'Image'} attached! Click or drag to replace</span>
              </div>
            )}
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
              {isVideoMode ? <Film size={22} /> : <UploadCloud size={22} />}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
              {isVideoMode
                ? <span>Drag and drop your MP4 video here, or <span style={{ color: 'var(--primary)' }}>browse</span></span>
                : <span>Drag and drop your file here, or <span style={{ color: 'var(--primary)' }}>browse</span></span>}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {isVideoMode
                ? "Seamless MP4 or WebM video loop (Up to 50MB, automatically hosted on Cloudflare R2)"
                : (placeholder || "PNG, WebP, or SVG with transparent background recommended (No GitHub links needed!)")}
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
