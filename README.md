# 🔒 SEALED — Secure Ephemeral Message Sharing

<p align="center">
  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://github.com" alt="Sealed Logo QR" width="120" height="120" style="border-radius: 20px; border: 4px solid #10b981;" />
</p>

<p align="center">
  <strong>Zero-knowledge, self-destructing ephemeral message and file sharing.</strong><br />
  <em>Simple, secure, and beautiful sharing that vanishes without a trace.</em>
</p>

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-technical-definition--cryptography">Cryptography</a> •
  <a href="#-installation--setup">Setup Guide</a> •
  <a href="#-credits">Credits</a>
</p>

---

## 🌻 GitHub Quick-Reference

*   **Repository Tags / Topics**: `security` · `ephemeral-sharing` · `zero-knowledge` · `self-destructing-messages` · `file-sharing` · `nextjs` · `tailwind-css` · `local-history` · `audio-feedback` · `qr-code` · `aes-encryption` · `typescript`
*   **One-Liner Bio**: Zero-knowledge, self-destructing ephemeral message and file sharing web app with AES client-assisted encryption, real-time countdown timers, interactive audio feedbacks, and instant QR generation.

---

## 🚀 Key Features

| Feature | Description | Benefit |
| :--- | :--- | :--- |
| **🛡️ Ephemerality (TTL)** | Custom sliders let you select link lifespans from 5 minutes to 24 hours. | No digital footprint left behind. |
| **🔥 Single-View Only** | Deletes the secret payload from the memory instantly upon first retrieval. | Handshake is fully unrepeatable. |
| **📁 Secure Drag-and-Drop** | Attach PDFs, images, or documents up to 5MB, base64-encrypted. | Shared securely with the same payload. |
| **⏱️ History Countdown** | Real-time counting timers display precise seconds left until expiry. | Full control over generated secrets. |
| **🔔 Web Audio "Dings"** | Interactive sound chime feedback plays on vital user actions. | Delightful and highly communicative UX. |
| **📱 Full-Screen QR Mode** | Generates zoomable over-the-air QR codes for screen-to-lens retrieval. | Extremely easy mobile transfers. |

---

## 🛠️ How It Works (System Flow)

```text
 [ Sender composing message ]
             │
             ▼
 [ Client-Assisted Handshake ]  ──► (Payload base64 packed & encrypted)
             │
             ▼
 [ Server-Side Sealed Vault ]  ──► (6-digit dynamic token generated, TTL timer starts)
             │
       ┌─────┴────────────────────────┐
       ▼                              ▼
 [ Standard Expiration ]       [ "Single-View Only" Burn ]
 (Auto-purges after expiration)  (Deleted from server upon first retrieval)
       │                              │
       └──────────────┬───────────────┘
                      ▼
             [ Traceless Wipe ]
```

---

## 🔑 Technical Definition & Cryptography

### Zero-Knowledge Architecture
To maintain maximum data privacy, **Sealed** is engineered under a zero-knowledge paradigm. 
*   **No Permanent Logs**: Messages and file data are held entirely in transient, encrypted buffers.
*   **Encrypted Storage Handshake**: Payloads are encrypted using a standard **AES-256-CBC algorithm** utilizing custom salts and IV vectors derived via Scrypt routines.
*   **Server-Side Wiping**: The server enforces automated expiration checks. If a code is retrieved or passes its expiry threshold, the filesystem buffer is completely purged and written over.

---

## 💻 Tech Stack

*   **Front-End Engine**: [React 19](https://react.dev/) / [Next.js 15+](https://nextjs.org/)
*   **Design Framework**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **Animations**: [Motion](https://motion.dev/)
*   **Icon Library**: [Lucide React](https://lucide.dev/)
*   **Platform Sandbox**: Safe for all sandboxed browser environments (replaces blockable browser alerts/confirms with custom inline visual modals).

---

## ⚙️ Installation & Setup

### 1. Clone & Install
Ensure you have Node.js 18+ installed on your computer.
```bash
npm install
```

### 2. Launch Development Server
```bash
npm run dev
```
Open your browser to [http://localhost:3000](http://localhost:3000) to inspect the app.

### 3. Production Compilation
```bash
npm run build
npm start
```

---

## 🌻 Credits

<div align="center">
  <p><strong>Developed by Rehan..</strong> <span style="font-size: 1.5rem; vertical-align: middle;">🌻</span></p>
  <p><em>Built with care to provide secure, ephemeral, and delightful sharing.</em></p>
</div>
