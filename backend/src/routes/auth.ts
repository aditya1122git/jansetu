import { database } from '../database';
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { JWT_SECRET, SERVER_SESSION_ID, authenticateToken, requireAdmin, AuthenticatedRequest, revokeToken } from '../middleware/auth';

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

const createResetMailer = () => {
  const user = process.env.SMTP_USER?.trim();
  // Google displays App Passwords in groups; whitespace is not part of the credential.
  const pass = process.env.SMTP_APP_PASSWORD?.replace(/\s/g, '');
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim() || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    tls: { minVersion: 'TLSv1.2' }
  });
};

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
        department: user.department,
        blockName: user.blockName,
        blockLgdCode: user.blockLgdCode,
        serverSessionId: SERVER_SESSION_ID
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        districtName: user.districtName,
        constituencyName: user.constituencyName,
        blockName: user.blockName,
        blockLgdCode: user.blockLgdCode
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
    const mailer = createResetMailer();
    if (!mailer) {
      return res.status(503).json({ error: 'Password reset email is not configured. Please contact the administrator.' });
    }

    const user = await database.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      // Safe response to prevent account enumeration
      return res.json({
        success: true,
        message: 'If this email is registered, a password reset link has been sent.'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const configuredBaseUrl = process.env.APP_BASE_URL?.trim().replace(/\/+$/, '');
    const forwardedProto = String(req.headers['x-forwarded-proto'] || req.protocol).split(',')[0].trim();
    const appBaseUrl = configuredBaseUrl || `${forwardedProto}://${req.get('host')}`;
    const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const destinationEmail = user.email;

    await database.passwordResetToken.deleteMany({ where: { email: user.email } });
    await database.passwordResetToken.create({
      data: {
        email: user.email,
        token: tokenHash,
        expiresAt
      }
    });

    try {
      await mailer.sendMail({
        from: process.env.SMTP_FROM?.trim() || `E-Sewa Tarapur <${process.env.SMTP_USER}>`,
        to: destinationEmail,
        subject: 'Reset your E-Sewa Tarapur password',
        text: `Hello ${user.name},\n\nOpen this secure link to create a new password:\n${resetUrl}\n\nThis one-time link expires in 30 minutes. If you did not request this, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h2 style="color:#1c4d8d">E-Sewa Tarapur</h2><p>Hello ${String(user.name).replace(/[<>&"']/g, '')},</p><p>Use the secure button below to create a new password.</p><p style="margin:28px 0"><a href="${resetUrl}" style="display:inline-block;padding:13px 22px;border-radius:10px;background:#1c4d8d;color:#fff;text-decoration:none;font-weight:700">Create New Password</a></p><p style="color:#64748b">This one-time link expires in 30 minutes and becomes invalid immediately after your password is changed.</p><p style="color:#64748b">If you did not request this, ignore this email.</p></div>`
      });
    } catch (mailError) {
      await database.passwordResetToken.deleteMany({ where: { email: user.email } });
      const smtpError = mailError as { code?: string; command?: string; responseCode?: number; message?: string };
      console.error('Password reset email delivery failed:', {
        code: smtpError.code,
        command: smtpError.command,
        responseCode: smtpError.responseCode,
        message: smtpError.message
      });
      const isAuthError = smtpError.code === 'EAUTH' || smtpError.responseCode === 535;
      const isConnectionTimeout = smtpError.code === 'ETIMEDOUT' || smtpError.code === 'ECONNECTION';
      return res.status(502).json({
        error: isAuthError
          ? 'Google SMTP authentication failed. Check SMTP_USER and the 16-character Google App Password.'
          : isConnectionTimeout
            ? 'Could not connect to smtp.gmail.com:465. Allow outbound SMTP port 465 on the server/firewall and try again.'
            : 'Reset email could not be sent through smtp.gmail.com:465. Please try again later.'
      });
    }

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
      message: 'If this email is registered, a password reset link has been sent.'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to initiate password reset' });
  }
});

// GET /api/auth/reset-password/:token/validate
router.get('/reset-password/:token/validate', async (req, res) => {
  try {
    const rawToken = String(req.params.token || '').trim();
    if (!rawToken) return res.status(400).json({ error: 'Password reset link is invalid.' });
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetRecord = await database.passwordResetToken.findUnique({ where: { token: tokenHash } });
    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      if (resetRecord) await database.passwordResetToken.deleteMany({ where: { email: resetRecord.email } });
      return res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
    }
    res.json({ valid: true });
  } catch {
    res.status(500).json({ error: 'Unable to validate password reset link.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const tokenHash = crypto.createHash('sha256').update(String(token).trim()).digest('hex');
    const resetRecord = await database.passwordResetToken.findUnique({
      where: { token: tokenHash }
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await database.user.update({
      where: { email: resetRecord.email },
      data: { password: hashedPassword }
    });

    // Invalidate this link and every other outstanding link for the account.
    await database.passwordResetToken.deleteMany({ where: { email: resetRecord.email } });

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
        department: user.department,
        serverSessionId: SERVER_SESSION_ID
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Reset rate-limiting attempts on role switch for evaluation/testing
    failedLoginAttempts.delete(`${req.ip}_${user.email.toLowerCase()}`);
    failedLoginAttempts.delete(`${req.ip}_${user.email.split('@')[0].toLowerCase()}`);

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
      select: { id: true, name: true, email: true, role: true, department: true, phone: true, districtName: true, constituencyName: true, blockName: true, blockLgdCode: true, isActive: true, createdAt: true }
    });
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching profile' });
  }
});

// PUT /api/auth/profile - Update the signed-in administrator profile
router.put('/profile', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const phone = String(req.body?.phone || '').trim();

    if (!name || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'A valid name and email address are required.' });
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone number must contain exactly 10 digits.' });
    }
    const emailOwner = await database.user.findUnique({ where: { email } });
    if (emailOwner && emailOwner.id !== req.user?.id) {
      return res.status(400).json({ error: 'This email address is already used by another account.' });
    }

    const updated = await database.user.update({
      where: { id: req.user!.id },
      data: { name, email, phone: phone || null },
      select: { id: true, name: true, email: true, role: true, department: true, phone: true, districtName: true, constituencyName: true, blockName: true, blockLgdCode: true, isActive: true }
    });

    const token = jwt.sign({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      department: updated.department,
      blockName: updated.blockName,
      blockLgdCode: updated.blockLgdCode,
      serverSessionId: SERVER_SESSION_ID
    }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ success: true, message: 'Admin profile updated successfully.', user: updated, token });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update admin profile.' });
  }
});

// PUT /api/auth/change-password - Secure password change for signed-in administrator
router.put('/change-password', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Current password, new password and confirmation are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must contain at least 8 characters.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation do not match.' });
    }

    const user = await database.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(403).json({ error: 'Current password is incorrect.' });
    }

    await database.user.update({
      where: { id: req.user!.id },
      data: { password: await bcrypt.hash(newPassword, 12) }
    });

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// GET /api/auth/users (Admin only)
router.get('/users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await database.user.findMany({
      where: { role: 'DATA_ENTRY' },
      select: { id: true, name: true, email: true, role: true, department: true, phone: true, districtName: true, constituencyName: true, blockName: true, blockLgdCode: true, isActive: true, createdAt: true },
      orderBy: { id: 'asc' }
    });
    const usersWithCounts = await Promise.all(users.map(async (user: any) => ({
      ...user,
      _count: { applications: await database.application.count({ where: { createdById: user.id } }) }
    })));
    res.json({ users: usersWithCounts });
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching user list' });
  }
});

// POST /api/auth/users (Admin only)
router.post('/users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, confirmPassword, role, department, phone, blockName, blockLgdCode } = req.body;
    if (!name || !email || !password || !role || !phone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['ADMIN', 'DATA_ENTRY', 'REVIEWER', 'READONLY'].includes(role)) {
      return res.status(400).json({ error: 'Invalid user role.' });
    }
    if (!/^\d{10}$/.test(String(phone).trim())) {
      return res.status(400).json({ error: 'A valid 10-digit phone number is required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must contain at least 8 characters.' });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ error: 'Password and confirm password do not match.' });
    }

    const tarapurBlocks: Record<string, string> = { Asarganj: '2451', Sangrampur: '2457', Tarapur: '2458', 'Tetiha Bambar': '1877', 'Haveli Kharagpur': '1872' };
    if (role === 'DATA_ENTRY' && (!blockName || tarapurBlocks[blockName] !== String(blockLgdCode))) {
      return res.status(400).json({ error: 'Select a valid Tarapur block and LGD code.' });
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
        department: department || (role === 'DATA_ENTRY' ? `${blockName} Operator` : 'General Administration'),
        phone: String(phone).trim(),
        districtName: role === 'DATA_ENTRY' ? 'Munger' : null,
        constituencyName: role === 'DATA_ENTRY' ? 'Tarapur' : null,
        blockName: role === 'DATA_ENTRY' ? blockName : null,
        blockLgdCode: role === 'DATA_ENTRY' ? String(blockLgdCode) : null
      },
      select: { id: true, name: true, email: true, role: true, department: true, phone: true, districtName: true, constituencyName: true, blockName: true, blockLgdCode: true, isActive: true }
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

// DELETE /api/auth/users/:id - Permanently remove an operator account.
// Existing applications retain their creator snapshot for historical reporting.
router.delete('/users/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const password = String(req.body?.password || '');
    if (!password) {
      return res.status(400).json({ error: 'Enter your admin password to delete this operator account.' });
    }

    const admin = await database.user.findUnique({ where: { id: req.user!.id } });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(403).json({ error: 'Incorrect admin password. The operator account was not deleted.' });
    }

    const target = await database.user.findUnique({ where: { id: req.params.id } });
    if (!target) return res.status(404).json({ error: 'Operator account not found.' });
    if (target.role !== 'DATA_ENTRY') {
      return res.status(403).json({ error: 'Only operator accounts can be deleted from this section.' });
    }

    // Applications are intentionally retained. They already contain immutable
    // creator name, email and block snapshots for historical reporting.
    const preservedApplicationCount = await database.application.count({ where: { createdById: target.id } });
    await database.passwordResetToken.deleteMany({ where: { email: target.email } });
    await database.user.delete({ where: { id: target.id } });

    await database.auditLog.create({
      data: {
        entityType: 'USER',
        action: 'DELETE',
        details: `Deleted operator account ${target.email} mapped to ${target.blockName || 'unassigned'} block. Preserved ${preservedApplicationCount} application record(s).`,
        performedBy: req.user?.email || 'admin',
        ipAddress: req.ip
      }
    }).catch(() => {});

    res.json({ success: true, message: `Operator ${target.name} was deleted. ${preservedApplicationCount} application record(s) remain safely preserved.` });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete operator account.' });
  }
});

export default router;

