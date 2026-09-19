import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface Attachment {
  name: string;
  type: string;
  size: number;
  data: string; // base64 or encrypted data
  iv?: string; // IV for file encryption
}

export interface EphemeralMessage {
  code: string;
  content: string; // Encrypted text
  iv: string; // IV for text
  salt: string; // Salt for key derivation
  durationHours: number;
  createdAt: string;
  expiresAt: string;
  attachments: Attachment[];
  burnAfterRead: boolean;
  viewsCount: number;
}

const FILE_PATH = path.join(process.env.TEMP || '/tmp', 'ephemeral_messages.json');
const ALGORITHM = 'aes-256-cbc';

// Helper to derive a 256-bit (32-byte) key from the 6-digit code using Scrypt
function deriveKey(code: string, salt: string): Buffer {
  return crypto.scryptSync(code, salt, 32);
}

// AES-256-CBC Encryption Helper
function encrypt(text: string, code: string, salt: string): { ciphertext: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const key = deriveKey(code, salt);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
  };
}

// AES-256-CBC Decryption Helper
function decrypt(ciphertext: string, code: string, salt: string, ivHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const key = deriveKey(code, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// In-memory cache for fast lookup
let cache: Map<string, EphemeralMessage> = new Map();

// Helper to load messages from /tmp/ephemeral_messages.json
function loadStore(): Map<string, EphemeralMessage> {
  try {
    if (fs.existsSync(FILE_PATH)) {
      const raw = fs.readFileSync(FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, EphemeralMessage>;
      const map = new Map<string, EphemeralMessage>();
      
      const now = new Date();
      for (const [code, msg] of Object.entries(parsed)) {
        // Exclude expired messages upon loading
        if (new Date(msg.expiresAt) > now) {
          map.set(code, msg);
        }
      }
      return map;
    }
  } catch (err) {
    console.error('Failed to load ephemeral messages store:', err);
  }
  return new Map();
}

// Helper to save messages to file
function saveStore(map: Map<string, EphemeralMessage>) {
  try {
    const dir = path.dirname(FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const obj: Record<string, EphemeralMessage> = {};
    for (const [code, msg] of map.entries()) {
      obj[code] = msg;
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save ephemeral messages store:', err);
  }
}

// Ensure cache is synchronized
function getCache(): Map<string, EphemeralMessage> {
  if (cache.size === 0 && fs.existsSync(FILE_PATH)) {
    cache = loadStore();
  }
  return cache;
}

export function saveMessage(params: {
  content: string;
  durationHours: number;
  attachments: { name: string; type: string; size: number; data: string }[];
  burnAfterRead: boolean;
}): { code: string; expiresAt: string; burnAfterRead: boolean } {
  const map = getCache();
  
  // Clean up any expired messages first to keep storage light and fast
  cleanExpired();

  // Generate unique 6-digit code
  let code = '';
  let attempts = 0;
  while (attempts < 100) {
    const candidate = Math.floor(100000 + Math.random() * 900000).toString();
    if (!map.has(candidate)) {
      code = candidate;
      break;
    }
    attempts++;
  }

  if (!code) {
    code = Math.floor(1000000 + Math.random() * 9000000).toString();
  }

  const salt = crypto.randomBytes(16).toString('hex');

  // Encrypt the text content using Scrypt derived key from 6-digit code
  const textEncryption = encrypt(params.content, code, salt);

  // Encrypt each attachment's base64 content
  const encryptedAttachments: Attachment[] = params.attachments.map((file) => {
    const fileEnc = encrypt(file.data, code, salt);
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      data: fileEnc.ciphertext,
      iv: fileEnc.iv,
    };
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + params.durationHours * 60 * 60 * 1000);

  const newEncryptedMessage: EphemeralMessage = {
    code,
    content: textEncryption.ciphertext,
    iv: textEncryption.iv,
    salt,
    durationHours: params.durationHours,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    attachments: encryptedAttachments,
    burnAfterRead: params.burnAfterRead,
    viewsCount: 0,
  };

  map.set(code, newEncryptedMessage);
  saveStore(map);

  return {
    code: newEncryptedMessage.code,
    expiresAt: newEncryptedMessage.expiresAt,
    burnAfterRead: newEncryptedMessage.burnAfterRead,
  };
}

export function getMessage(code: string): {
  code: string;
  content: string;
  durationHours: number;
  createdAt: string;
  expiresAt: string;
  attachments: { name: string; type: string; size: number; data: string }[];
  burnAfterRead: boolean;
  viewsCount: number;
} | null {
  const map = getCache();
  const msg = map.get(code);
  
  if (!msg) return null;

  const now = new Date();
  if (new Date(msg.expiresAt) <= now) {
    map.delete(code);
    saveStore(map);
    return null;
  }

  try {
    // Decrypt content text using stored salt and IV
    const decryptedContent = decrypt(msg.content, code, msg.salt, msg.iv);

    // Decrypt attachments
    const decryptedAttachments = msg.attachments.map((file) => {
      if (!file.iv) return { name: file.name, type: file.type, size: file.size, data: file.data };
      const decryptedData = decrypt(file.data, code, msg.salt, file.iv);
      return {
        name: file.name,
        type: file.type,
        size: file.size,
        data: decryptedData,
      };
    });

    return {
      code: msg.code,
      content: decryptedContent,
      durationHours: msg.durationHours,
      createdAt: msg.createdAt,
      expiresAt: msg.expiresAt,
      attachments: decryptedAttachments,
      burnAfterRead: msg.burnAfterRead,
      viewsCount: msg.viewsCount,
    };
  } catch (err) {
    console.error('Failed to decrypt message payload with provided code:', err);
    return null;
  }
}

export function incrementViews(code: string): void {
  const map = getCache();
  const msg = map.get(code);
  if (!msg) return;

  msg.viewsCount += 1;
  
  if (msg.burnAfterRead && msg.viewsCount >= 1) {
    map.delete(code);
  } else {
    map.set(code, msg);
  }
  saveStore(map);
}

export function cleanExpired(): void {
  const map = getCache();
  const now = new Date();
  let changed = false;

  for (const [code, msg] of map.entries()) {
    if (new Date(msg.expiresAt) <= now) {
      map.delete(code);
      changed = true;
    }
  }

  if (changed) {
    saveStore(map);
  }
}

export function deleteMessage(code: string): boolean {
  const map = getCache();
  const result = map.delete(code);
  if (result) {
    saveStore(map);
  }
  return result;
}
