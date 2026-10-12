import { database } from '../database';
import { Router, Response } from 'express';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { getConfiguredMaxUploadSizeMb, allowedExtensions } from '../middleware/upload';

const router = Router();

// GET /api/settings - Public retrieval of system settings
router.get('/', async (req, res) => {
  try {
    let setting = await database.systemSetting.findFirst();
    if (!setting) {
      setting = await database.systemSetting.create({
        data: {
          key: 'default',
          maxUploadSizeMb: getConfiguredMaxUploadSizeMb(),
          supportEmail: null,
          supportPhone: null,
          workingHours: null
        }
      });
    }

    res.json({
      settings: {
        maxUploadSizeMb: setting.maxUploadSizeMb,
        supportEmail: setting.supportEmail,
        supportPhone: setting.supportPhone,
        workingHours: setting.workingHours,
        allowedExtensions,
        hasConfiguredEmail: !!(setting.supportEmail && setting.supportEmail.trim().length > 0),
        hasConfiguredPhone: !!(setting.supportPhone && setting.supportPhone.trim().length > 0),
        hasConfiguredHours: !!(setting.workingHours && setting.workingHours.trim().length > 0)
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching system settings' });
  }
});

// PUT /api/settings - Admin only update of system settings
router.put('/', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { maxUploadSizeMb, supportEmail, supportPhone, workingHours } = req.body;

    const dataToUpdate: any = {};

    if (maxUploadSizeMb !== undefined) {
      const parsedSize = parseInt(maxUploadSizeMb, 10);
      if (isNaN(parsedSize) || parsedSize <= 0 || parsedSize > 1000) {
        return res.status(400).json({ error: 'Max upload size must be between 1 MB and 1000 MB.' });
      }
      dataToUpdate.maxUploadSizeMb = parsedSize;
    }

    if (supportEmail !== undefined) {
      const emailTrimmed = supportEmail ? supportEmail.trim() : null;
      if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        return res.status(400).json({ error: 'Invalid support email format.' });
      }
      dataToUpdate.supportEmail = emailTrimmed || null;
    }

    if (supportPhone !== undefined) {
      dataToUpdate.supportPhone = supportPhone ? supportPhone.trim() : null;
    }

    if (workingHours !== undefined) {
      dataToUpdate.workingHours = workingHours ? workingHours.trim() : null;
    }

    const updated = await database.systemSetting.upsert({
      where: { key: 'default' },
      create: {
        key: 'default',
        ...dataToUpdate
      },
      update: dataToUpdate
    });

    await database.auditLog.create({
      data: {
        entityType: 'SETTINGS',
        action: 'UPDATE',
        details: `System settings updated: Max upload: ${updated.maxUploadSizeMb}MB, Support Email: ${updated.supportEmail || 'None'}, Working Hours: ${updated.workingHours || 'None'}`,
        performedBy: req.user?.email || 'admin',
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'System settings updated successfully',
      settings: updated
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

export default router;

