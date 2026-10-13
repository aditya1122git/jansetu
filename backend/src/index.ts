import { database } from './database';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import authRoutes from './routes/auth';
import masterRoutes from './routes/master';
import categoriesRoutes from './routes/categories';
import applicationRoutes from './routes/applications';
import reminderRoutes from './routes/reminders';
import reportRoutes from './routes/reports';
import settingsRoutes from './routes/settings';
import appointmentRoutes from './routes/appointments';
import { upload, uploadDir, verifyFileSignature, getConfiguredMaxUploadSizeMb, getEffectiveMaxUploadSizeMb, createUploader, cleanupAbandonedUploads, allowedExtensions } from './middleware/upload';
import { authenticateToken, AuthenticatedRequest, requireDataEntryOrAdmin } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Starting E-Sewa Tarapur Server...');
console.log('⚙️ Configuring middleware...');

// Security Hardening Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ extended: true, limit: '250mb' }));

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File Upload Route with authentication, RBAC, and magic byte signature verification
app.post('/api/upload', authenticateToken, requireDataEntryOrAdmin, async (req: AuthenticatedRequest, res: any) => {
  const maxMb = await getEffectiveMaxUploadSizeMb();
  const uploader = createUploader(maxMb);
  const uploadHandler = uploader.array('files', 10);

  uploadHandler(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: `File size exceeds the maximum limit of ${maxMb} MB per file. Please upload smaller files.`
          });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }

    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files were uploaded.' });
      }

      const verifiedFiles: any[] = [];

      // Validate signatures / magic bytes for each file
      for (const file of files) {
        const ext = path.extname(file.originalname);
        const sigCheck = verifyFileSignature(file.path, ext);

        if (!sigCheck.valid) {
          // Immediately delete unsafe/invalid file from disk
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(400).json({
            error: `Validation failed for file "${file.originalname}": ${sigCheck.reason}`
          });
        }

        verifiedFiles.push({
          originalName: file.originalname,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          url: `/api/documents/${file.filename}`
        });
      }

      res.json({ files: verifiedFiles });
    } catch (error: any) {
      res.status(500).json({ error: 'Internal error processing uploaded files' });
    }
  });
});

// Secure Document Download - Restricted to Authorized Users with Revocation Check & Audit Trail
app.get('/api/documents/:filename', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const filename = req.params.filename;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const safeFilename = path.basename(filename);
  const filePath = path.join(uploadDir, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const ext = path.extname(safeFilename).toLowerCase();

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Audit log attachment access
  await database.auditLog.create({
    data: {
      entityType: 'DOCUMENT',
      action: 'DOWNLOAD',
      details: `Attachment accessed: ${safeFilename}`,
      performedBy: req.user?.email || 'authenticated-user',
      ipAddress: req.ip
    }
  }).catch(() => {});

  if (req.query.download === '1' || req.query.download === 'true') {
    return res.download(filePath, safeFilename);
  }

  const inlineExts = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.txt'];
  if (inlineExts.includes(ext)) {
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  }

  res.sendFile(filePath);
});

// API Routes
console.log('🛣️ Setting up routes...');
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/appointments', appointmentRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const maxMb = await getEffectiveMaxUploadSizeMb();
  res.json({
    status: 'ONLINE',
    system: 'E-Sewa Tarapur — Application & Grievance Management Portal',
    version: '2.0.0',
    maxUploadSizeMb: maxMb,
    timestamp: new Date().toISOString()
  });
});

// Serve frontend assets and build
const clientDistPath = path.resolve(__dirname, '../../frontend/dist');
const clientPublicPath = path.resolve(__dirname, '../../frontend/public');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    }
  });
} else if (fs.existsSync(clientPublicPath)) {
  app.use(express.static(clientPublicPath));
}

async function startServer() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await database.connect();
    await database.createIndexes();
    console.log('✅ MongoDB connected successfully');

    const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
      const httpServer = app.listen(PORT);
      const handleError = (error: NodeJS.ErrnoException) => {
        httpServer.off('listening', handleListening);
        reject(error);
      };
      const handleListening = () => {
        httpServer.off('error', handleError);
        resolve(httpServer);
      };

      httpServer.once('error', handleError);
      httpServer.once('listening', handleListening);
    });

    console.log(`✅ Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   Max upload size: ${getConfiguredMaxUploadSizeMb()} MB`);

    // Configure server timeouts for large 200MB uploads (10 minutes)
    server.timeout = 600000;
    server.headersTimeout = 610000;
    server.keepAliveTimeout = 65000;

    // Periodic cleanup of abandoned temporary uploads every hour and on startup
    cleanupAbandonedUploads();
    setInterval(cleanupAbandonedUploads, 60 * 60 * 1000);
  } catch (error) {
    const serverError = error as NodeJS.ErrnoException;
    if (serverError.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use.`);
      console.error('   E-Sewa Tarapur Server is probably already running. Stop the previous backend process before starting another one.');
    } else {
      console.error('❌ Unable to start E-Sewa Tarapur Server:', error instanceof Error ? error.message : error);
    }
    await database.disconnect().catch(() => undefined);
    process.exit(1);
  }
}

startServer();



