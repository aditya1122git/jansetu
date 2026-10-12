import { database } from '../database';
import { Router, Response } from 'express';
import { authenticateToken, requireWrite, requireReviewerOrAdmin, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Enforce authentication on all reminder and follow-up desk routes
router.use(authenticateToken);

// GET /api/reminders - List applications requiring follow-up or overdue
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, filterOverdue } = req.query;
    const now = new Date();

    const where: any = {
      status: { not: 'COMPLETED' }
    };

    if (filterOverdue === 'true') {
      where.nextFollowUpDate = { lte: now };
    }

    const applications = await database.application.findMany({
      where,
      orderBy: [
        { priority: 'asc' }, // IMPORTANT first (I before N)
        { nextFollowUpDate: 'asc' }
      ],
      include: {
        district: true,
        constituency: true,
        category: true,
        followUps: {
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      }
    });

    // Compute dynamic fields
    const enriched = applications.map(app => {
      const nowMs = now.getTime();
      const receivedMs = new Date(app.dateReceived).getTime();
      const updatedMs = new Date(app.updatedAt).getTime();

      const daysSinceReceipt = Math.max(0, Math.floor((nowMs - receivedMs) / (1000 * 60 * 60 * 24)));
      const daysSinceLastUpdate = Math.max(0, Math.floor((nowMs - updatedMs) / (1000 * 60 * 60 * 24)));
      const isOverdue = app.nextFollowUpDate ? new Date(app.nextFollowUpDate) <= now : false;

      return {
        ...app,
        daysSinceReceipt,
        daysSinceLastUpdate,
        isOverdue
      };
    });

    res.json({ reminders: enriched });
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching reminder records' });
  }
});

// POST /api/reminders/:applicationId/add - Record new follow-up / reminder
router.post('/:applicationId/add', authenticateToken, requireWrite, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const applicationId = req.params.applicationId;
    const { actionTaken, reminderNotes, nextFollowUpDate, reassignEmployee, newStatus } = req.body;

    if (!actionTaken || !reminderNotes) {
      return res.status(400).json({ error: 'Action taken and reminder notes are required.' });
    }

    const app = await database.application.findUnique({ where: { id: applicationId } });
    if (!app) {
      return res.status(404).json({ error: 'Application record not found.' });
    }

    const previousStatus = app.status;
    const updateData: any = {
      lastActionTaken: actionTaken.trim()
    };

    if (nextFollowUpDate) {
      updateData.nextFollowUpDate = new Date(nextFollowUpDate);
    }
    if (reassignEmployee && reassignEmployee.trim().length > 0) {
      updateData.assignedEmployee = reassignEmployee.trim();
    }
    // Only update status if explicitly passed and NOT automatically completed
    if (newStatus && newStatus !== previousStatus) {
      updateData.status = newStatus;
      if (newStatus === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.completionNotes = reminderNotes;
      }
    }

    const updatedApp = await database.application.update({
      where: { id: applicationId },
      data: updateData
    });

    const followUp = await database.followUp.create({
      data: {
        applicationId,
        actionTaken: actionTaken.trim(),
        reminderNotes: reminderNotes.trim(),
        previousStatus,
        newStatus: updateData.status || previousStatus,
        assignedTo: updateData.assignedEmployee || app.assignedEmployee,
        nextFollowUpDate: updateData.nextFollowUpDate || app.nextFollowUpDate,
        actionBy: req.user?.name || req.user?.email || 'Officer'
      }
    });

    // Record Audit Log
    await database.auditLog.create({
      data: {
        applicationId,
        entityType: 'APPLICATION',
        action: 'UPDATE',
        details: `Follow-up added: "${actionTaken}". Notes: "${reminderNotes}". Reassigned to: ${updateData.assignedEmployee || app.assignedEmployee}`,
        performedBy: req.user?.email || 'staff',
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      success: true,
      followUp,
      application: updatedApp
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error recording reminder/follow-up' });
  }
});

// POST /api/reminders/:applicationId/reopen - Authorized reopening of completed applications (Reviewer and Admin only)
router.post('/:applicationId/reopen', requireReviewerOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const applicationId = req.params.applicationId;
    const { reopenReason, assignedEmployee, nextFollowUpDate } = req.body;

    if (!reopenReason || reopenReason.trim().length === 0) {
      return res.status(400).json({ error: 'A valid reason for reopening is required.' });
    }

    const app = await database.application.findUnique({ where: { id: applicationId } });
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (app.status !== 'COMPLETED' && app.status !== 'REJECTED') {
      return res.status(400).json({ error: 'Only completed or closed applications can be reopened.' });
    }

    const nextDate = nextFollowUpDate ? new Date(nextFollowUpDate) : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    const updated = await database.application.update({
      where: { id: applicationId },
      data: {
        status: 'IN_PROGRESS',
        reopenedAt: new Date(),
        reopenReason: reopenReason.trim(),
        completedAt: null,
        assignedEmployee: assignedEmployee || app.assignedEmployee,
        nextFollowUpDate: nextDate,
        lastActionTaken: `Reopened: ${reopenReason.trim()}`
      }
    });

    await database.followUp.create({
      data: {
        applicationId,
        actionTaken: 'Authorized Application Reopening',
        reminderNotes: `Application reopened from COMPLETED state. Reason: ${reopenReason.trim()}`,
        previousStatus: 'COMPLETED',
        newStatus: 'IN_PROGRESS',
        assignedTo: updated.assignedEmployee,
        nextFollowUpDate: nextDate,
        actionBy: req.user?.name || req.user?.email || 'Authorized Official'
      }
    });

    await database.auditLog.create({
      data: {
        applicationId,
        entityType: 'APPLICATION',
        action: 'REOPEN',
        details: `Application reopened by ${req.user?.email}. Reason: ${reopenReason.trim()}`,
        performedBy: req.user?.email || 'officer',
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Application reopened successfully for further investigation.',
      application: updated
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reopen application.' });
  }
});

export default router;

