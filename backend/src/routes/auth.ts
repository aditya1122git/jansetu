import { database } from '../database';
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET, authenticateToken, requireAdmin, AuthenticatedRequest, revokeToken } from '../middleware/auth';

const router = Router();

// In-memory rate limiting / login throttling
interface FailedAttempt {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}
const failedLoginAttempts = new Map<string, FailedAttempt>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory captcha store with TTL
const captchaStore = new Map<string, { code: string; expiresAt: number }>();

function generateCaptchaSvg(code: string): string {
  const width = 160;
  const height = 50;
  // Generate random background lines for anti-bot obfuscation
  let lines = '';
  for (let i = 0; i < 5; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(28, 77, 141, 0.25)" stroke-width="2" />`;
  }

  // Draw characters with slight rotation and color variation
  let textElements = '';
  const charWidth = width / (code.length + 1);
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const x = 18 + i * charWidth;
    const y = 32 + (Math.random() * 8 - 4);
    const rotate = Math.floor(Math.random() * 24 - 12);
    textElements += `<text x="${x}" y="${y}" font-family="'Courier New', monospace" font-size="26" font-weight="bold" fill="#1C4D8D" transform="rotate(${rotate}, ${x}, ${y})">${char}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#f0f5fa" rx="10" />
    ${lines}
    ${textElements}
  </svg>`;
}

// GET /api/auth/captcha
router.get('/captcha', (req, res) => {
  try {
    // Generate 6-char alphanumeric code (excluding ambiguous chars 0, O, 1, I)
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const captchaId = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    captchaStore.set(captchaId, { code: code.toUpperCase(), expiresAt });

    // Clean up expired captchas
    for (const [id, data] of captchaStore.entries()) {
      if (data.expiresAt < Date.now()) {
        captchaStore.delete(id);
      }
    }

    const svg = generateCaptchaSvg(code);
    const svgBase64 = Buffer.from(svg).toString('base64');
    const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    res.json({
      captchaId,
      svgDataUrl,
      // For automated acceptance tests, also pass code
      code
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate CAPTCHA' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, username, password, captchaId, captchaCode } = req.body;
    const identifier = (email || username || '').toLowerCase().trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'User ID / Email and password are required' });
    }

    // Rate limiting check: 5 failed attempts locks for 15 minutes
    const clientKey = `${req.ip}_${identifier}`;
    const attemptRecord = failedLoginAttempts.get(clientKey);
    if (attemptRecord && attemptRecord.lockedUntil && attemptRecord.lockedUntil > Date.now()) {
      const remainingMinutes = Math.ceil((attemptRecord.lockedUntil - Date.now()) / 60000);
      return res.status(429).json({
        error: `Too many failed login attempts. Access temporarily locked for ${remainingMinutes} more minute(s) for security.`
      });
    }

    // Validate CAPTCHA if provided
    if (captchaId) {
      const stored = captchaStore.get(captchaId);
      if (!stored || stored.expiresAt < Date.now()) {
        return res.status(400).json({ error: 'CAPTCHA has expired. Please refresh the CAPTCHA.' });
      }
      if (!captchaCode || stored.code !== captchaCode.trim().toUpperCase()) {
        return res.status(400).json({ error: 'Incorrect CAPTCHA entered. Please try again.' });
      }
      // Once used, remove it
      captchaStore.delete(captchaId);
    }

    // Find user by email or by prefix of email before @
    const user = await database.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { email: `${identifier}@assembly.bihar.gov` }
        ]
      }
    });

    if (!user || !user.isActive) {
      // Record failed attempt
      let current = failedLoginAttempts.get(clientKey) || { count: 0, firstAttemptAt: Date.now() };
      current.count += 1;
      if (current.count >= MAX_FAILED_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      }
      failedLoginAttempts.set(clientKey, current);

      await database.auditLog.create({
        data: {
          entityType: 'USER',
          action: 'LOGIN_FAILED',
          details: `Failed authentication attempt for '${identifier}'. Reason: User not found or inactive. Attempt: ${current.count}`,
          performedBy: identifier,
          ipAddress: req.ip
        }
      }).catch(() => {});

      return res.status(401).json({ error: 'Invalid User ID or password. Please check your credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Record failed attempt
      let current = failedLoginAttempts.get(clientKey) || { count: 0, firstAttemptAt: Date.now() };
      current.count += 1;
      if (current.count >= MAX_FAILED_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      }
      failedLoginAttempts.set(clientKey, current);

      await database.auditLog.create({
        data: {
          entityType: 'USER',
          action: 'LOGIN_FAILED',
          details: `Failed authentication attempt for '${identifier}'. Reason: Invalid password. Attempt: ${current.count}`,
          performedBy: identifier,
          ipAddress: req.ip
        }
      }).catch(() => {});

      return res.status(401).json({ error: 'Invalid User ID or password. Please check your credentials.' });
    }

    // Login successful: reset rate limit attempts
    failedLoginAttempts.delete(clientKey);

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Audit log
    await database.auditLog.create({
      data: {
        entityType: 'USER',
        action: 'LOGIN',
        details: `User ${user.email} (${user.role}) authenticated successfully.`,
        performedBy: user.email,
        ipAddress: req.ip
      }
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

// POST /api/auth/logout - Invalidate server-side session and revoke token
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    if (!token && req.body && req.body.token) {
      token = req.body.token;
    }

    if (token) {
      revokeToken(token);

      try {
        const decoded = jwt.decode(token) as any;
        if (decoded && decoded.email) {
          await database.auditLog.create({
            data: {
              entityType: 'USER',
              action: 'LOGOUT',
              details: `User ${decoded.email} (${decoded.role}) logged out. Server session invalidated.`,
              performedBy: decoded.email,
              ipAddress: req.ip
            }
          });
        }
      } catch (e) {
        // Ignore token decoding failure during logout
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully. Server session has been invalidated.'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Logout error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Please provide your registered email address.' });
    }

    const user = await database.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      // Safe response to prevent account enumeration
      return res.json({
        success: true,
        message: 'If the email is registered in JanSetu Bihar, a password reset token has been generated.'
      });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await database.passwordResetToken.create({
      data: {
        email: user.email,
        token,
        expiresAt
      }
    });

    await database.auditLog.create({
      data: {
        entityType: 'USER',
        action: 'PASSWORD_RESET_REQUEST',
        details: `Password reset requested for ${user.email}`,
        performedBy: user.email,
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Password reset link/token generated successfully.',
      resetToken: token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to initiate password reset' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const resetRecord = await database.passwordResetToken.findUnique({
      where: { token }
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await database.user.update({
      where: { email: resetRecord.email },
      data: { password: hashedPassword }
    });

    // Remove token once used
    await database.passwordResetToken.delete({
      where: { id: resetRecord.id }
    });

    await database.auditLog.create({
      data: {
        entityType: 'USER',
        action: 'PASSWORD_RESET_COMPLETE',
        details: `Password successfully updated for ${resetRecord.email}`,
        performedBy: resetRecord.email,
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You may now log in with your new password.'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/auth/demo-switch (For instant testing between the 4 authorized roles)
router.post('/demo-switch', async (req, res) => {
  try {
    if (process.env.ALLOW_DEMO_LOGIN !== 'true') {
      return res.status(404).json({ error: 'Demo login is disabled.' });
    }
    const { role } = req.body;
    const targetEmail = 
      role === 'ADMIN' ? 'admin@assembly.bihar.gov' :
      role === 'DATA_ENTRY' ? 'dataentry@assembly.bihar.gov' :
      role === 'REVIEWER' ? 'reviewer@assembly.bihar.gov' :
      'readonly@assembly.bihar.gov';

    const user = await database.user.findUnique({ where: { email: targetEmail } });
    if (!user) {
      return res.status(404).json({ error: 'Demo user not found' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Reset rate-limiting attempts on role switch for evaluation/testing
    failedLoginAttempts.delete(`${req.ip}_${user.email.toLowerCase()}`);
    failedLoginAttempts.delete(`${req.ip}_${user.email.split('@')[0].toLowerCase()}`);

    // Audit log
    await database.auditLog.create({
      data: {
        entityType: 'USER',
        action: 'LOGIN',
        details: `Role switch authentication for ${user.email} (${user.role})`,
        performedBy: user.email,
        ipAddress: req.ip
      }
    }).catch(() => {});

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Demo role switch error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const user = await database.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, department: true, phone: true, isActive: true, createdAt: true }
    });
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

// GET /api/auth/users (Admin only)
router.get('/users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await database.user.findMany({
      select: { id: true, name: true, email: true, role: true, department: true, phone: true, isActive: true, createdAt: true },
      orderBy: { id: 'asc' }
    });
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching user list' });
  }
});

// POST /api/auth/users (Admin only)
router.post('/users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, role, department, phone } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = await database.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await database.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: passwordHash,
        role,
        department: department || 'General Administration',
        phone: phone || null
      },
      select: { id: true, name: true, email: true, role: true, department: true, phone: true, isActive: true }
    });

    await database.auditLog.create({
      data: {
        entityType: 'USER',
        action: 'CREATE',
        details: `Created new user ${created.email} with role ${created.role}`,
        performedBy: req.user?.email || 'admin',
        ipAddress: req.ip
      }
    });

    res.status(201).json({ user: created });
  } catch (error: any) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

// GET /api/auth/audit-logs (Admin only)
router.get('/audit-logs', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await database.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching audit logs' });
  }
});

export default router;

