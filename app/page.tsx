'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  Send, 
  Key, 
  FileText, 
  Trash2, 
  Copy, 
  Check, 
  UploadCloud, 
  Clock, 
  ArrowRight, 
  ShieldAlert, 
  Download, 
  Eye, 
  EyeOff, 
  Share2,
  FileSpreadsheet,
  FileImage,
  RefreshCw,
  History,
  QrCode,
  Paperclip,
  Plus,
  X
} from 'lucide-react';

interface Attachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64 string
}

interface RetrievedMessage {
  code: string;
  content: string;
  durationHours: number;
  createdAt: string;
  expiresAt: string;
  attachments: Attachment[];
  burnAfterRead: boolean;
  viewsCount: number;
}

interface HistoryItem {
  code: string;
  createdAt: string;
  expiresAt: string;
  burnAfterRead: boolean;
  hasAttachment: boolean;
}

export default function EphemeralMessagePage() {
  const [activeTab, setActiveTab] = useState<'sender' | 'receiver' | 'history'>('sender');

  // --- SENDER STATE ---
  const [messageText, setMessageText] = useState('');
  const [durationHours, setDurationHours] = useState<number>(1);
  const [burnAfterRead, setBurnAfterRead] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [generatedExpiresAt, setGeneratedExpiresAt] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showUploadInput, setShowUploadInput] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(typeof window !== 'undefined' ? new Date().getTime() : 0);

  // --- RECEIVER STATE ---
  const [retrievalCode, setRetrievalCode] = useState('');
  const [isRetrieving, setIsRetrieving] = useState(false);
  const [retrievedMsg, setRetrievedMsg] = useState<RetrievedMessage | null>(null);
  const [retrievalError, setRetrievalError] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [dingMessage, setDingMessage] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalType, setDeleteModalType] = useState<'single' | 'all'>('single');
  const [pendingDeleteCode, setPendingDeleteCode] = useState<string>('');

  // Keep track of real-time clock for countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerDing = (msg: string) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1250, audioCtx.currentTime + 0.12);
        
        gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn('Audio Context is disabled or blocked:', e);
    }

    setDingMessage(msg);
    setTimeout(() => {
      setDingMessage('');
    }, 3000);
  };

  const getHistoryCountdown = (expiresAtStr: string) => {
    const expiry = new Date(expiresAtStr).getTime();
    const diff = expiry - currentTime;
    if (diff <= 0) return 'Expired';
    
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${h}h ${m}m ${s}s`;
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live countdown timer for retrieved message
  useEffect(() => {
    if (!retrievedMsg) {
      return;
    }

    const calculateTime = () => {
      const now = new Date().getTime();
      const expiry = new Date(retrievedMsg.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        setRetrievedMsg(null);
        setRetrievalError('This message has expired and is no longer available.');
        return;
      }

      const hrs = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (hrs > 0) parts.push(`${hrs}h`);
      if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
      parts.push(`${secs}s`);

      setTimeRemaining(parts.join(' '));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [retrievedMsg]);

  // URL query parameter listener to auto-load code if shared via link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam && /^\d{6}$/.test(codeParam)) {
        setTimeout(() => {
          setRetrievalCode(codeParam);
          setActiveTab('receiver');
        }, 0);
      }
    }
  }, []);

  // Load generated history on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ephemeral_messages_history');
      if (stored) {
        try {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setHistory(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // --- FILE ATTACHMENT HANDLERS ---
  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      triggerDing(`File "${file.name}" is too large. Max file size is 5MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      if (base64Data) {
        // Store only one file as required
        setAttachments([
          {
            name: file.name,
            type: file.type || 'application/octet-stream',
            size: file.size,
            data: base64Data,
          },
        ]);
      }
    };
    reader.onerror = () => {
      triggerDing('Error reading file. Please try another file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // --- SENDER API SUBMIT ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() && attachments.length === 0) {
      setSendError('Please type a message or attach a file.');
      return;
    }

    setIsSending(true);
    setSendError('');
    setGeneratedCode('');

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageText,
          durationHours,
          attachments,
          burnAfterRead,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to secure message');
      }

      setGeneratedCode(data.code);
      setGeneratedExpiresAt(data.expiresAt);
      
      // Update local storage history
      const newHistItem: HistoryItem = {
        code: data.code,
        createdAt: new Date().toISOString(),
        expiresAt: data.expiresAt,
        burnAfterRead: !!burnAfterRead,
        hasAttachment: attachments.length > 0
      };
      
      setHistory((prev) => {
        const updated = [newHistItem, ...prev].slice(0, 50);
        localStorage.setItem('ephemeral_messages_history', JSON.stringify(updated));
        return updated;
      });
      
      // Clear form on success
      setMessageText('');
      setAttachments([]);
      setBurnAfterRead(false);
      setShowUploadInput(false);
    } catch (err: any) {
      setSendError(err.message || 'An error occurred while creating your secure message.');
    } finally {
      setIsSending(false);
    }
  };

  // --- RECEIVER API SUBMIT ---
  const handleRetrieveMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = retrievalCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setRetrievalError('Please enter a valid 6-digit access code.');
      return;
    }

    setIsRetrieving(true);
    setRetrievalError('');
    setRetrievedMsg(null);

    try {
      const response = await fetch(`/api/messages/${cleanCode}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid or expired secure code.');
      }

      setRetrievedMsg(data);
    } catch (err: any) {
      setRetrievalError(err.message || 'The secure code is invalid, has expired, or was already burned.');
    } finally {
      setIsRetrieving(false);
    }
  };

  // --- COPY HELPERS ---
  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Utility to determine icon based on file mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage className="h-5 w-5 text-emerald-600" id="file-image-icon" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="h-5 w-5 text-teal-600" id="file-sheet-icon" />;
    }
    return <FileText className="h-5 w-5 text-zinc-500" id="file-text-icon" />;
  };

  const getShareableLink = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}?code=${generatedCode}`;
    }
    return `?code=${generatedCode}`;
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800 font-sans antialiased relative flex flex-col" id="app-container">
      {/* "DING!" FLOATING TOAST NOTIFICATION */}
      {dingMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white shadow-xl px-5 py-3 rounded-full flex items-center space-x-3 text-xs sm:text-sm font-bold border border-zinc-800 animate-slideDown whitespace-nowrap" id="ding-notification-toast">
          <span className="relative flex h-3 w-3" id="ding-ping-container">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span>{dingMessage}</span>
        </div>
      )}

      {/* FULL SCREEN QR MODAL */}
      {showQrModal && (
        <div 
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn" 
          onClick={() => setShowQrModal(false)}
          id="qr-fullscreen-modal"
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-6 shadow-2xl relative border border-zinc-100"
            onClick={(e) => e.stopPropagation()}
            id="qr-modal-card"
          >
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1.5 bg-zinc-50 hover:bg-zinc-100 rounded-full transition-all cursor-pointer"
              title="Close"
              id="close-qr-modal-btn"
            >
              <X className="h-4.5 w-4.5" id="close-qr-modal-icon" />
            </button>

            <div className="space-y-2 pt-2" id="qr-modal-header">
              <span className="bg-indigo-50 text-indigo-700 text-3xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full inline-block animate-pulse" id="qr-modal-eyebrow">
                Share Secret Code
              </span>
              <h3 className="text-base font-bold text-zinc-900" id="qr-modal-title">QR Code Access</h3>
              <p className="text-2xs text-zinc-500">Scan this code with any phone camera to access your secret message directly.</p>
            </div>

            {/* LARGE QR IMAGE */}
            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 inline-block mx-auto" id="qr-modal-img-wrapper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(getShareableLink())}`}
                alt="Full screen QR Code"
                className="w-56 h-56 mx-auto cursor-pointer"
                referrerPolicy="no-referrer"
                id="qr-modal-image"
              />
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col gap-2.5 pt-1" id="qr-modal-actions">
              {/* NATIVE SHARE OR COPY */}
              <button
                onClick={async () => {
                  const shareData = {
                    title: 'Secure Secret Message Access',
                    text: `Retrieve your secure secret message using access code: ${generatedCode}`,
                    url: getShareableLink()
                  };
                  try {
                    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                      await navigator.share(shareData);
                      triggerDing('Ding! Shared successfully.');
                    } else {
                      await navigator.clipboard.writeText(getShareableLink());
                      triggerDing('Ding! Link copied to clipboard to share.');
                    }
                  } catch (e) {
                    console.log('Share canceled or failed', e);
                  }
                }}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
                id="qr-modal-share-btn"
              >
                <Send className="h-4 w-4" id="qr-modal-share-icon" />
                <span>Share Access Link</span>
              </button>

              {/* DOWNLOAD QR CODE */}
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(getShareableLink())}`}
                target="_blank"
                rel="noreferrer"
                download={`secret-qr-${generatedCode}.png`}
                onClick={() => {
                  triggerDing('Ding! QR Code loading...');
                }}
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 py-2.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer text-center"
                id="qr-modal-download-btn"
              >
                <Download className="h-4 w-4" id="qr-modal-download-icon" />
                <span>Download QR Image</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* INLINE DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn" 
          onClick={() => setShowDeleteModal(false)}
          id="delete-confirmation-modal"
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl relative border border-zinc-100"
            onClick={(e) => e.stopPropagation()}
            id="delete-confirm-card"
          >
            {/* CLOSE BUTTON */}
            <button 
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1.5 bg-zinc-50 hover:bg-zinc-100 rounded-full transition-all cursor-pointer"
              title="Close"
              id="close-delete-modal-btn"
            >
              <X className="h-4 w-4" id="close-delete-modal-icon" />
            </button>

            {/* ALERT ICON */}
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 mt-2" id="delete-alert-icon-wrapper">
              <Trash2 className="h-6 w-6" id="delete-alert-icon" />
            </div>

            <div className="space-y-2" id="delete-modal-header">
              <h3 className="text-lg font-extrabold text-zinc-900" id="delete-modal-title">
                {deleteModalType === 'all' ? 'Clear Local History?' : 'Delete Message?'}
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed" id="delete-modal-description">
                {deleteModalType === 'all' 
                  ? 'Are you sure you want to clear your local history? This will NOT delete any active messages from the server, but they will be removed from this list.' 
                  : `Are you sure you want to permanently delete secure message ${pendingDeleteCode} from the server? Recipient will no longer be able to retrieve it.`
                }
              </p>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col gap-2 pt-2" id="delete-modal-actions">
              <button
                onClick={async () => {
                  setShowDeleteModal(false);
                  if (deleteModalType === 'all') {
                    localStorage.removeItem('ephemeral_messages_history');
                    setHistory([]);
                    triggerDing('Ding! Local history cleared successfully.');
                  } else {
                    const code = pendingDeleteCode;
                    try {
                      const res = await fetch(`/api/messages/${code}`, { method: 'DELETE' });
                      if (res.ok) {
                        setHistory((prev) => {
                          const updated = prev.filter((h) => h.code !== code);
                          localStorage.setItem('ephemeral_messages_history', JSON.stringify(updated));
                          return updated;
                        });
                        triggerDing(`Ding! Secret ${code} securely deleted from the server.`);
                      } else {
                        // Even if expired or missing, clean up locally
                        setHistory((prev) => {
                          const updated = prev.filter((h) => h.code !== code);
                          localStorage.setItem('ephemeral_messages_history', JSON.stringify(updated));
                          return updated;
                        });
                        triggerDing(`Ding! Secret cleared from history list.`);
                      }
                    } catch (err) {
                      triggerDing('Ding! Error trying to delete message.');
                    }
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                id="delete-modal-confirm-btn"
              >
                <span>Yes, Delete</span>
              </button>

              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 py-2.5 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer text-center"
                id="delete-modal-cancel-btn"
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <header className="border-b border-zinc-100 bg-white/80 backdrop-blur-md sticky top-0 z-10" id="main-header">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between" id="header-inner">
          <div className="flex items-center space-x-3" id="header-logo-container">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xs" id="header-logo-badge">
              <Lock className="h-5 w-5" id="header-logo-icon" />
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase tracking-wider text-emerald-600 leading-none">SEALED</span>
              <span className="text-3xs text-zinc-400 font-medium leading-none mt-0.5">Secure Ephemeral Sharing</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-4 mt-8" id="main-content">
        {/* TAB SWITCHER */}
        <div className="flex bg-zinc-200/60 p-1 rounded-xl mb-6 max-w-md mx-auto" id="tab-switcher">
          <button
            onClick={() => {
              setActiveTab('sender');
              setRetrievalError('');
              setSendError('');
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
              activeTab === 'sender'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
            id="tab-sender"
          >
            Sender Dashboard
          </button>
          <button
            onClick={() => {
              setActiveTab('receiver');
              setSendError('');
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
              activeTab === 'receiver'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
            id="tab-receiver"
          >
            Receiver Board
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              setRetrievalError('');
              setSendError('');
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
              activeTab === 'history'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
            id="tab-history"
          >
            History
          </button>
        </div>

        {/* --- SENDER DASHBOARD --- */}
        {activeTab === 'sender' && (
          <div className="space-y-6 animate-fadeIn" id="sender-view-container">
            {generatedCode ? (
              /* SECURE CODE CREATED CARD */
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center max-w-2xl mx-auto" id="code-success-card">
                <div className="inline-flex bg-emerald-50 text-emerald-700 p-3 rounded-full mb-4" id="success-icon-badge">
                  <Unlock className="h-6 w-6" id="unlock-success-icon" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 mb-6" id="success-card-title">
                  Secure Message Sealed!
                </h2>
 
                {/* THE 6-DIGIT CODE DISPLAY */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl py-5 px-6 inline-flex items-center justify-between space-x-8 mb-6" id="code-display-box">
                  <div>
                    <span className="text-xs text-zinc-400 uppercase tracking-wider block font-semibold text-left" id="code-label">
                      Access Code
                    </span>
                    <span className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-widest font-mono" id="code-value">
                      {generatedCode}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedCode, 'code')}
                    className="bg-white hover:bg-zinc-100 border border-zinc-200 hover:border-zinc-300 text-zinc-700 p-2.5 rounded-lg transition-colors flex items-center space-x-1"
                    title="Copy Code"
                    id="copy-code-btn"
                  >
                    {copiedCode ? <Check className="h-4 w-4 text-emerald-600" id="copy-code-success-icon" /> : <Copy className="h-4 w-4" id="copy-code-icon" />}
                    <span className="text-xs font-semibold px-1" id="copy-code-text">{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
 
                {/* SHAREABLE LINK ACTION */}
                <div className="w-full max-w-md mx-auto mb-6" id="share-link-box">
                  <div className="flex rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50 text-xs sm:text-sm" id="share-input-wrapper">
                    <input
                      type="text"
                      readOnly
                      value={getShareableLink()}
                      className="flex-1 bg-transparent px-3 py-2 text-zinc-600 outline-hidden font-mono text-ellipsis overflow-hidden whitespace-nowrap"
                      id="share-link-input"
                    />
                    <button
                      onClick={() => copyToClipboard(getShareableLink(), 'link')}
                      className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 font-medium transition-colors whitespace-nowrap"
                      id="copy-link-btn"
                    >
                      {copiedLink ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>

                {/* QR CODE GENERATOR */}
                <div 
                  onClick={() => setShowQrModal(true)}
                  className="flex flex-col items-center justify-center mt-2 mb-6 bg-zinc-50 border border-zinc-200 rounded-xl p-4 max-w-sm mx-auto shadow-2xs cursor-zoom-in hover:scale-[1.02] hover:bg-zinc-100/60 transition-all group" 
                  id="qr-code-container"
                  title="Tap to see full screen and share"
                >
                  <div className="bg-white p-2 rounded-lg border border-zinc-200 group-hover:shadow-xs transition-all" id="qr-image-wrapper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getShareableLink())}`}
                      alt="QR Code"
                      className="w-28 h-28"
                      referrerPolicy="no-referrer"
                      id="qr-image"
                    />
                  </div>
                  <span className="text-3xs text-zinc-500 font-semibold mt-2 flex items-center space-x-1.5" id="qr-helper-text">
                    <QrCode className="h-3.5 w-3.5 text-emerald-600 group-hover:scale-110 transition-transform" id="qr-icon-success" />
                    <span>Tap QR to see in Full Screen & Share</span>
                  </span>
                </div>

                <div className="border-t border-zinc-100 pt-5 flex items-center justify-center space-x-6 text-xs text-zinc-400 font-medium" id="code-card-footer">
                  <div className="flex items-center space-x-1" id="expiry-timer-info">
                    <Clock className="h-3.5 w-3.5" id="expiry-timer-icon" />
                    <span>Expires in {durationHours} hr{durationHours > 1 ? 's' : ''}</span>
                  </div>
                  {burnAfterRead && (
                    <div className="flex items-center space-x-1 text-amber-600" id="burn-warning">
                      <ShieldAlert className="h-3.5 w-3.5" id="burn-warning-icon" />
                      <span>Single-View Only</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setGeneratedCode('')}
                  className="mt-8 text-sm text-emerald-600 hover:text-emerald-800 font-semibold inline-flex items-center space-x-1"
                  id="create-another-btn"
                >
                  <span>Compose Another</span>
                  <ArrowRight className="h-3.5 w-3.5" id="create-another-icon" />
                </button>
              </div>
            ) : (
              /* CREATE MESSAGE FORM */
              <form onSubmit={handleSendMessage} className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6" id="sender-form">
                <h2 className="text-xl font-bold text-zinc-900" id="sender-form-title">
                  Compose Secret Message
                </h2>

                 {/* TEXT AREA */}
                <div className="space-y-1.5" id="message-input-wrapper">
                  <textarea
                    id="message-textarea"
                    rows={6}
                    placeholder="Type or paste your secure message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl p-4 text-sm focus:outline-hidden focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 bg-zinc-50/50 font-mono"
                  />
                  <div className="flex justify-end text-xs text-zinc-400" id="textarea-info">
                    <span id="char-counter">{messageText.length} characters</span>
                  </div>
                </div>

                {/* ATTACHMENT SLIDE SWITCH AND SECTION */}
                <div className="space-y-3 pt-2" id="attachments-slide-container">
                  <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200/80 p-3 rounded-xl" id="attachment-slider-control">
                    <div className="flex items-center space-x-2.5" id="attachment-slider-info">
                      <Paperclip className="h-4.5 w-4.5 text-zinc-500" id="slider-paperclip-icon" />
                      <div id="slider-label-block">
                        <span className="text-xs font-bold text-zinc-800 block">Attached Document Option</span>
                        <span className="text-3xs text-zinc-400">Tap slide toggle to attach files (Max 5MB)</span>
                      </div>
                    </div>

                    {/* INTERACTIVE SLIDE TOGGLE BUTTON */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !showUploadInput;
                        setShowUploadInput(nextState);
                        if (!nextState) {
                          // Clear any attachments when closing option
                          setAttachments([]);
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        showUploadInput ? 'bg-emerald-600' : 'bg-zinc-200'
                      }`}
                      role="switch"
                      aria-checked={showUploadInput}
                      id="attachment-slide-switch"
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          showUploadInput ? 'translate-x-5' : 'translate-x-0'
                        }`}
                        id="attachment-slide-knob"
                      />
                    </button>
                  </div>

                  {/* SLIDING ATTACHMENT UPLOADER / DRAWER */}
                  {showUploadInput && (
                    <div className="space-y-3 animate-slideDown overflow-hidden" id="sliding-uploader-drawer">
                      {attachments.length === 0 ? (
                        <div
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                            dragActive 
                              ? 'border-zinc-900 bg-zinc-100/50' 
                              : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/40'
                          }`}
                          id="dropzone-container"
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-file-input"
                          />
                          <UploadCloud className="h-8 w-8 text-zinc-400 mx-auto mb-2" id="upload-cloud-icon" />
                          <p className="text-xs text-zinc-600 font-medium" id="dropzone-text-primary">
                            Drag & drop a file here, or{' '}
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-emerald-600 hover:text-emerald-800 font-semibold underline bg-transparent cursor-pointer"
                              id="browse-btn"
                            >
                              browse
                            </button>
                          </p>
                          <p className="text-3xs text-zinc-400 mt-1" id="dropzone-text-secondary">
                            Supports any document up to 5MB (Only one file allowed)
                          </p>
                        </div>
                      ) : (
                        <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 bg-zinc-50/50 overflow-hidden" id="attachments-list">
                          {attachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3" id={`attachment-item-${index}`}>
                              <div className="flex items-center space-x-3 text-sm min-w-0" id={`attachment-meta-${index}`}>
                                {getFileIcon(file.type)}
                                <div className="truncate" id={`attachment-details-${index}`}>
                                  <p className="font-semibold text-zinc-800 truncate text-xs" id={`attachment-name-${index}`} title={file.name}>{file.name}</p>
                                  <p className="text-3xs text-zinc-400 font-medium" id={`attachment-size-${index}`}>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  removeAttachment(index);
                                  setShowUploadInput(false);
                                }}
                                className="text-zinc-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                title="Remove"
                                id={`remove-attachment-${index}`}
                              >
                                <Trash2 className="h-4 w-4" id={`trash-icon-${index}`} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* DURATION & BURNING CONFIGURATION */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-zinc-100 pt-6" id="settings-grid">
                  <div className="space-y-2" id="duration-selector-wrapper">
                    <label className="text-sm font-semibold text-zinc-700 block" id="duration-label">
                      Expires After
                    </label>
                    <div className="flex space-x-1 bg-zinc-100 p-1 rounded-lg text-xs" id="duration-preset-tabs">
                      {[1, 2, 3, 4, 5].map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => setDurationHours(hour)}
                          className={`flex-1 py-1.5 font-medium rounded-md transition-all ${
                            durationHours === hour
                              ? 'bg-white text-zinc-900 shadow-xs'
                              : 'text-zinc-500 hover:text-zinc-800'
                          }`}
                          id={`duration-btn-${hour}`}
                        >
                          {hour} hr{hour > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col justify-end" id="burn-options-wrapper">
                    <div className="flex items-start space-x-3 p-3 bg-zinc-50 border border-zinc-200/60 rounded-xl" id="burn-toggle-container">
                      <input
                        type="checkbox"
                        id="burn-toggle"
                        checked={burnAfterRead}
                        onChange={(e) => setBurnAfterRead(e.target.checked)}
                        className="h-4 w-4 rounded-sm border-zinc-300 text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
                      />
                      <label htmlFor="burn-toggle" className="text-xs text-zinc-600 select-none cursor-pointer" id="burn-label">
                        <span className="font-bold text-zinc-800 block" id="burn-title">Single-View Only</span>
                        Purge instantly after first open.
                      </label>
                    </div>
                  </div>
                </div>

                {sendError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex items-center space-x-2" id="send-error-box">
                    <ShieldAlert className="h-4 w-4 shrink-0" id="send-error-icon" />
                    <span>{sendError}</span>
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  id="submit-message-btn"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" id="submit-loader" />
                      <span>Securing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" id="submit-send-icon" />
                      <span>Seal & Generate Code</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* --- HISTORY VIEW (INTEGRATED AS A TAB OPTION ON THE UPPER DASHBOARD) --- */}
        {activeTab === 'history' && (
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xs max-w-2xl mx-auto space-y-6 animate-fadeIn" id="history-view-container">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3" id="history-header">
              <div className="flex items-center space-x-2 text-zinc-800" id="history-title-box">
                <History className="h-5 w-5 text-emerald-600" id="history-clock-icon" />
                <span className="text-base font-bold">Your Generated Secrets History</span>
                <span className="bg-zinc-100 text-zinc-600 text-xs px-2.5 py-0.5 rounded-full font-semibold" id="history-count">
                  {history.length}
                </span>
              </div>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    setDeleteModalType('all');
                    setShowDeleteModal(true);
                  }}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors cursor-pointer"
                  id="clear-all-history-btn"
                >
                  Clear Local History
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-sm text-zinc-400 py-8 italic text-center" id="empty-history-text">
                No secrets generated in this browser yet. Use the Sender Dashboard to create one!
              </p>
            ) : (
              <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto pr-1 space-y-1" id="history-items-list">
                {history.map((item, idx) => {
                  const isExpired = new Date(item.expiresAt).getTime() < currentTime;
                  const countdownText = getHistoryCountdown(item.expiresAt);
                  return (
                    <div key={idx} className="py-3.5 flex items-center justify-between text-sm gap-4" id={`history-item-${idx}`}>
                      <div className="flex flex-col min-w-0" id={`history-meta-${idx}`}>
                        <div className="flex items-center space-x-2" id={`history-code-row-${idx}`}>
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isExpired ? 'bg-zinc-300' : 'bg-emerald-500 animate-pulse'}`} title={isExpired ? 'Expired' : 'Active'} id={`history-status-indicator-${idx}`} />
                          <span className="font-mono font-extrabold text-zinc-900 text-base" id={`history-code-txt-${idx}`}>
                            {item.code}
                          </span>
                          {item.hasAttachment && (
                            <span className="bg-zinc-100 text-zinc-500 text-3xs px-2 py-0.5 rounded font-bold uppercase tracking-wider" id={`history-attach-tag-${idx}`}>
                              Doc Attached
                            </span>
                          )}
                          {item.burnAfterRead && (
                            <span className="bg-amber-50 text-amber-600 text-3xs px-2 py-0.5 rounded font-bold uppercase tracking-wider" id={`history-burn-tag-${idx}`}>
                              Single-View
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1 text-2xs text-zinc-400" id={`history-expiry-row-${idx}`}>
                          <span>Expires at: {new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span className={isExpired ? 'text-zinc-400 font-medium' : 'text-emerald-600 font-bold'}>
                            {isExpired ? 'Expired' : `Countdown: ${countdownText}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2.5 shrink-0" id={`history-actions-${idx}`}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.code);
                            triggerDing(`Ding! Code ${item.code} copied to clipboard.`);
                          }}
                          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 p-2 rounded-lg transition-all cursor-pointer"
                          title="Copy Code"
                          id={`history-copy-btn-${idx}`}
                        >
                          <Copy className="h-4 w-4" id={`history-copy-icon-${idx}`} />
                        </button>
                        {!isExpired && (
                          <button
                            onClick={() => {
                              setRetrievalCode(item.code);
                              setActiveTab('receiver');
                            }}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                            id={`history-retrieve-btn-${idx}`}
                          >
                            Retrieve
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDeleteCode(item.code);
                            setDeleteModalType('single');
                            setShowDeleteModal(true);
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-all cursor-pointer"
                          title="Wipe From Server"
                          id={`history-delete-btn-${idx}`}
                        >
                          <Trash2 className="h-4 w-4" id={`history-delete-icon-${idx}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* --- RECEIVER BOARD --- */}
        {activeTab === 'receiver' && (
          <div className="space-y-6 animate-fadeIn" id="receiver-view-container">
            {retrievedMsg ? (
              /* DECRYPTED MESSAGE VIEW - FULL SCREEN, RAW & UNCOMPRESSED, NO CARD BORDER/SHADOW */
              <div className="w-full mx-auto space-y-6 animate-fadeIn" id="retrieved-message-card">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-4" id="retrieved-header">
                  <div className="flex items-center space-x-2.5" id="retrieved-badge-container">
                    <div className="bg-emerald-100 text-emerald-800 p-2 rounded-lg" id="decrypted-icon-bg">
                      <Unlock className="h-5 w-5" id="decrypted-icon" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900" id="retrieved-title">Secure Decrypted Message</h3>
                  </div>

                  {/* SECURE COUNTDOWN LIVE */}
                  <div className="bg-zinc-200 border border-zinc-300 rounded-lg px-3 py-1.5 flex items-center space-x-1.5 text-xs font-semibold text-zinc-700" id="live-countdown-badge">
                    <Clock className="h-4 w-4" id="countdown-icon" />
                    <span className="font-mono" id="countdown-timer">{timeRemaining}</span>
                  </div>
                </div>

                {/* SELF DESTRUCTION WARNING IF BURN-AFTER-READ */}
                {retrievedMsg.burnAfterRead && (
                  <div className="bg-amber-100 border border-amber-300 p-4 rounded-xl text-amber-900 text-xs flex items-start space-x-2.5" id="burn-read-banner">
                    <ShieldAlert className="h-4.5 w-4.5 shrink-0 mt-0.5" id="burn-read-banner-icon" />
                    <div id="burn-read-banner-text">
                      <p className="font-bold">Single-View Notice</p>
                      <p className="text-amber-800 mt-0.5">
                        This message is now permanently purged from the server memory. It cannot be accessed again.
                      </p>
                    </div>
                  </div>
                )}

                {/* RETRIEVED TEXT VIEW - FULL SCREEN, RAW, BORDERLESS, NO COMPRESSION */}
                <div className="w-full text-base sm:text-lg leading-relaxed text-zinc-900 font-mono whitespace-pre-wrap select-text selection:bg-zinc-900 selection:text-white" id="decrypted-textbox">
                  {retrievedMsg.content || <span className="italic text-zinc-400">No text content in this message.</span>}
                </div>

                {/* RETRIEVED ATTACHMENTS VIEW - EXPANDED, CLEAN */}
                {retrievedMsg.attachments && retrievedMsg.attachments.length > 0 && (
                  <div className="space-y-3 border-t border-zinc-200 pt-6" id="retrieved-attachments-wrapper">
                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold block" id="retrieved-files-label">Secure Attachment</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="retrieved-attachments-grid">
                      {retrievedMsg.attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl shadow-2xs" id={`retrieved-file-${idx}`}>
                          <div className="flex items-center space-x-3 min-w-0" id={`retrieved-meta-${idx}`}>
                            {getFileIcon(file.type)}
                            <div className="truncate" id={`retrieved-details-${idx}`}>
                              <p className="font-bold text-zinc-800 text-sm truncate" id={`retrieved-name-${idx}`} title={file.name}>{file.name}</p>
                              <p className="text-xs text-zinc-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <a
                            href={file.data}
                            download={file.name}
                            className="bg-zinc-900 hover:bg-zinc-800 text-white p-2.5 rounded-lg transition-colors inline-flex items-center shrink-0 cursor-pointer"
                            title="Download attachment"
                            id={`download-link-${idx}`}
                          >
                            <Download className="h-4.5 w-4.5" id={`download-icon-${idx}`} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DESTROY BUTTON */}
                <div className="border-t border-zinc-200 pt-6 flex justify-end gap-3" id="retrieved-actions">
                  <button
                    onClick={() => {
                      setRetrievedMsg(null);
                      setRetrievalCode('');
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                    id="close-decrypted-btn"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* ENTER ACCESS CODE VIEW */
              <form onSubmit={handleRetrieveMessage} className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 shadow-xs max-w-md mx-auto space-y-6" id="receiver-form">
                <div className="text-center" id="receiver-form-header">
                  <div className="inline-flex bg-zinc-100 text-zinc-800 p-3 rounded-full mb-3" id="receiver-key-badge">
                    <Key className="h-6 w-6" id="receiver-key-icon" />
                  </div>
                  <h2 className="text-lg font-bold text-zinc-900" id="receiver-form-title">
                    Enter Access Code
                  </h2>
                </div>

                <div className="space-y-2" id="retrieval-code-field">
                  <input
                    type="text"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="000000"
                    value={retrievalCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setRetrievalCode(val);
                    }}
                    className="w-full text-center text-3xl font-bold tracking-widest border border-zinc-200 rounded-xl py-3 bg-zinc-50/50 font-mono focus:outline-hidden focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                    id="code-input-field"
                    required
                  />
                </div>

                {retrievalError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex items-center space-x-2" id="retrieval-error-box">
                    <ShieldAlert className="h-4 w-4 shrink-0" id="retrieval-error-icon" />
                    <span>{retrievalError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isRetrieving || retrievalCode.length !== 6}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  id="retrieve-submit-btn"
                >
                  {isRetrieving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" id="retrieve-loader" />
                      <span>Opening...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" id="retrieve-lock-icon" />
                      <span>Retrieve Message</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="max-w-4xl mx-auto px-4 mt-16 pb-8 text-center text-xs text-zinc-400 font-medium" id="app-footer">
        <p className="flex items-center justify-center space-x-1" id="developed-by-badge">
          <span>Developed by Rehan..</span>
          <span className="text-amber-500 animate-pulse text-sm">🌻</span>
        </p>
      </footer>
    </div>
  );
}
