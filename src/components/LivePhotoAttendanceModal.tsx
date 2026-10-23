import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertTriangle, X, ShieldCheck, MapPin, Sparkles, Upload } from 'lucide-react';
import { api } from '../api';

interface LivePhotoAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: any) => void;
}

export default function LivePhotoAttendanceModal({
  isOpen,
  onClose,
  onSuccess,
}: LivePhotoAttendanceModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<'initializing' | 'active' | 'captured' | 'error'>('initializing');
  const [errorMessage, setErrorMessage] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [locationName] = useState('Fitness Villa — Main Gym Floor');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Clock tick
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Check camera devices
  useEffect(() => {
    if (!isOpen) return;
    navigator.mediaDevices?.enumerateDevices?.().then(devices => {
      const videoInputs = devices.filter(d => d.kind === 'videoinput');
      setHasMultipleCameras(videoInputs.length > 1);
    }).catch(() => {});
  }, [isOpen]);

  // Start video stream
  async function startCamera() {
    setCameraState('initializing');
    setErrorMessage('');
    setCapturedPhoto(null);

    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Your browser does not support live camera access.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraState('active');
    } catch (err: any) {
      console.warn('Camera error:', err);
      let msg = 'Unable to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permissions in your browser bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system.';
      } else {
        msg = err.message || 'Camera initialization failed.';
      }
      setErrorMessage(msg);
      setCameraState('error');
    }
  }

  // Lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCapturedPhoto(null);
      setCameraState('initializing');
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, facingMode]);

  // Toggle camera front/back
  function toggleCamera() {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  }

  // Snap photo
  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror image if front camera
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    // Reset transform for watermark
    if (facingMode === 'user') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // Add high-tech verified stamp at bottom
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(0, height - 34, width, 34);

    ctx.fillStyle = '#b5f23d';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('FITNESS VILLA LIVE VERIFIED', 12, height - 12);

    ctx.fillStyle = '#ffffff';
    ctx.font = '11px monospace';
    const stampText = `${new Date().toLocaleDateString('en-IN')} ${currentTime}`;
    const stampWidth = ctx.measureText(stampText).width;
    ctx.fillText(stampText, width - stampWidth - 12, height - 12);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    setCameraState('captured');

    // Pause stream while previewing
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => { track.enabled = false; });
    }
  }

  // Retake
  function retakePhoto() {
    setCapturedPhoto(null);
    setCameraState('active');
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => { track.enabled = true; });
    }
  }

  // File upload fallback if camera not working
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setCapturedPhoto(dataUrl);
        setCameraState('captured');
        setErrorMessage('');
      }
    };
    reader.readAsDataURL(file);
  }

  // Submit check-in
  async function handleSubmitCheckIn() {
    if (!capturedPhoto) return;
    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await api<{ message: string; item: any }>('/attendance/self-checkin', {
        method: 'POST',
        body: JSON.stringify({
          photo: capturedPhoto,
          location: locationName,
        }),
      });

      onSuccess(res.item);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Check-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !submitting) onClose(); }}>
      <div className="modal-dialog">
        {/* Header */}
        <div className="modal-header">
          <h3>
            <Camera size={19} className="accent" />
            Member Self Check-In
          </h3>
          <button className="modal-close-btn" onClick={onClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Subtitle / Location */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12, color: '#9b9f9a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={13} className="accent" /> {locationName}
            </span>
            <span className="badge badge-green" style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={11} /> Photo Verification
            </span>
          </div>

          {/* Viewfinder or Preview Box */}
          {cameraState === 'captured' && capturedPhoto ? (
            <div className="photo-preview-box">
              <img src={capturedPhoto} alt="Selfie preview" className="photo-preview-img" />
              <div className="photo-preview-badge">
                <CheckCircle size={14} className="accent" /> Snapshot Captured
              </div>
            </div>
          ) : (
            <div className="camera-viewfinder">
              {cameraState === 'initializing' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div className="spinner" />
                  <span style={{ fontSize: 12, color: '#9b9f9a' }}>Connecting to camera…</span>
                </div>
              )}

              {cameraState === 'error' && (
                <div style={{ padding: 24, textAlign: 'center', color: '#ff7675' }}>
                  <AlertTriangle size={36} style={{ margin: '0 auto 12px auto', display: 'block' }} />
                  <p style={{ fontSize: 13, margin: '0 0 16px 0', color: '#f5f5f5' }}>{errorMessage}</p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={startCamera}>
                      <RefreshCw size={14} /> Retry Camera
                    </button>
                    <label className="btn btn-green btn-sm" style={{ cursor: 'pointer' }}>
                      <Upload size={14} /> Upload Selfie Photo
                      <input type="file" accept="image/*" capture="user" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              )}

              {/* Live Video */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="camera-video"
                style={{ display: cameraState === 'active' ? 'block' : 'none' }}
              />

              {/* Viewfinder Badges */}
              {cameraState === 'active' && (
                <>
                  <div className="camera-badge-live">
                    <span className="pulse-dot" /> LIVE
                  </div>
                  <div className="camera-badge-time">
                    {currentTime}
                  </div>
                  <div className="face-reticle">
                    <span className="reticle-tip">Align Face Inside Frame</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Hidden Canvas for High-Resolution Capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Error Message if submit fails */}
          {errorMessage && cameraState !== 'error' && (
            <div className="error-msg" style={{ marginTop: 14 }}>
              <AlertTriangle size={15} /> {errorMessage}
            </div>
          )}

          {/* Controls Bar */}
          <div style={{ marginTop: 20 }}>
            {cameraState === 'active' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ width: 40 }}>
                  {hasMultipleCameras && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={toggleCamera}
                      title="Switch Camera"
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                </div>

                {/* Shutter Button */}
                <button
                  type="button"
                  className="shutter-btn"
                  onClick={capturePhoto}
                  title="Capture live selfie photo"
                >
                  <div className="shutter-inner">
                    <Camera size={26} />
                  </div>
                </button>

                {/* Fallback upload icon */}
                <label
                  className="btn btn-outline btn-sm"
                  title="Upload image fallback"
                  style={{ cursor: 'pointer', padding: '8px 10px' }}
                >
                  <Upload size={14} />
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            )}

            {cameraState === 'captured' && (
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={retakePhoto}
                  disabled={submitting}
                >
                  <RefreshCw size={15} /> Retake Photo
                </button>
                <button
                  type="button"
                  className="btn btn-green"
                  style={{ flex: 1.4 }}
                  onClick={handleSubmitCheckIn}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                      Verifying Check-In…
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} /> Confirm & Check In
                    </>
                  )}
                </button>
              </div>
            )}

            {cameraState === 'active' && (
              <p style={{ textAlign: 'center', fontSize: 11, color: '#8b9089', margin: '14px 0 0 0' }}>
                Look straight into the camera and tap the green shutter button to capture your verification selfie.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
