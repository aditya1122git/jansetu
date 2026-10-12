import { database } from '../database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';


export const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export function getConfiguredMaxUploadSizeMb(): number {
  const envVal = process.env.MAX_UPLOAD_SIZE_MB;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 200; // Default 200 MB per file
}

export async function getEffectiveMaxUploadSizeMb(): Promise<number> {
  const envVal = process.env.MAX_UPLOAD_SIZE_MB;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  try {
    const setting = await database.systemSetting.findFirst();
    if (setting && setting.maxUploadSizeMb > 0) {
      return setting.maxUploadSizeMb;
    }
  } catch (e) {}
  return 200;
}

// Disk storage streams directly to disk via fs.createWriteStream, avoiding heap memory pressure
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Sanitize filename to alphanumeric and safe characters only
    const ext = path.extname(file.originalname).toLowerCase();
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${uniqueSuffix}-${basename}${ext}`);
  }
});

export const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'];

export function createUploader(maxSizeMb = 200) {
  return multer({
    storage: storage,
    limits: {
      fileSize: maxSizeMb * 1024 * 1024, // 200 MB per file limit
      files: 10
    },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        return cb(
          new Error(
            `Unsupported file type '${ext}'. Allowed file types are: PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX.`
          )
        );
      }
      cb(null, true);
    }
  });
}

export const upload = createUploader(getConfiguredMaxUploadSizeMb());

// File content / magic bytes signature verification
// Reads only the first 16 bytes of the file, preserving memory efficiency even for 200 MB files
export function verifyFileSignature(filePath: string, ext: string): { valid: boolean; reason?: string } {
  try {
    const buffer = Buffer.alloc(16);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);

    // Executable / dangerous markers check
    // MZ (Windows exe/dll): 0x4D 0x5A
    if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return { valid: false, reason: 'Security alert: Windows executable binary signature detected.' };
    }
    // ELF (Linux executable): 0x7F 'E' 'L' 'F'
    if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
      return { valid: false, reason: 'Security alert: ELF executable binary signature detected.' };
    }
    // Shell script '#!' (0x23 0x21)
    if (buffer[0] === 0x23 && buffer[1] === 0x21) {
      return { valid: false, reason: 'Security alert: Shell script execution signature detected.' };
    }

    const extLower = ext.toLowerCase();

    // 1. PDF signature: %PDF (0x25 0x50 0x44 0x46)
    if (extLower === '.pdf') {
      if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        return { valid: true };
      }
      return { valid: false, reason: 'File does not have a valid PDF header structure.' };
    }

    // 2. PNG signature: 0x89 0x50 0x4E 0x47
    if (extLower === '.png') {
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return { valid: true };
      }
      return { valid: false, reason: 'File does not have a valid PNG image signature.' };
    }

    // 3. JPEG signature: 0xFF 0xD8 0xFF
    if (extLower === '.jpg' || extLower === '.jpeg') {
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { valid: true };
      }
      return { valid: false, reason: 'File does not have a valid JPEG image signature.' };
    }

    // 4. DOCX / XLSX (Office Open XML - Zip container starting with PK\x03\x04: 0x50 0x4B 0x03 0x04)
    if (extLower === '.docx' || extLower === '.xlsx') {
      if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
        return { valid: true };
      }
      return { valid: false, reason: `File does not have a valid Office Open XML (${extLower.slice(1).toUpperCase()}) signature.` };
    }

    // 5. DOC / XLS (Legacy MS Office OLE Compound Document: 0xD0 0xCF 0x11 0xE0)
    if (extLower === '.doc' || extLower === '.xls') {
      if (
        (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) ||
        (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04)
      ) {
        return { valid: true };
      }
      return { valid: false, reason: `File does not match expected binary format for ${extLower.slice(1).toUpperCase()}.` };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: `Failed to inspect file structure: ${err.message}` };
  }
}

// Clean up orphaned or abandoned temporary files older than 6 hours
export async function cleanupAbandonedUploads() {
  try {
    if (!fs.existsSync(uploadDir)) return;
    const files = fs.readdirSync(uploadDir);
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;

    for (const f of files) {
      const p = path.join(uploadDir, f);
      try {
        const stat = fs.statSync(p);
        if (stat.mtimeMs < sixHoursAgo) {
          // Check if associated with an application
          const inUse = await database.application.findFirst({
            where: { documents: { contains: f } }
          });
          if (!inUse) {
            fs.unlinkSync(p);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

