import { Router, Response } from 'express';
import { EventEmitter } from 'events';
import { database } from '../database';
import { AuthenticatedRequest, authenticateToken, requireAdmin, requireDataEntryOrAdmin } from '../middleware/auth';

const router = Router();
const appointmentEvents = new EventEmitter();
appointmentEvents.setMaxListeners(100);

router.use(authenticateToken);

// Keep an authenticated event stream open so appointment lists update as soon
// as another signed-in user creates or decides a request.
router.get('/events', requireDataEntryOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.write('event: connected\ndata: {}\n\n');

  const sendUpdate = (event: { operatorId: string; action: string }) => {
    if (req.user?.role === 'ADMIN' || req.user?.id === event.operatorId) {
      res.write(`event: appointment-update\ndata: ${JSON.stringify(event)}\n\n`);
    }
  };

  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 25_000);
  appointmentEvents.on('change', sendUpdate);

  res.on('close', () => {
    clearInterval(heartbeat);
    appointmentEvents.off('change', sendUpdate);
    res.end();
  });
});

// Administrators see every visitor request. Operators only see appointments
// created from their own account.
router.get('/', requireDataEntryOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where = req.user?.role === 'ADMIN' ? {} : { operatorId: req.user!.id };
    const appointments = await database.appointment.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load visitor appointments.' });
  }
});

router.post('/', requireDataEntryOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== 'DATA_ENTRY') {
      return res.status(403).json({ error: 'Visitor appointments can only be registered by an operator.' });
    }

    const visitorName = String(req.body.visitorName || '').trim();
    const phone = String(req.body.phone || '').replace(/\D/g, '');
    const address = String(req.body.address || '').trim();
    const purpose = String(req.body.purpose || '').trim();

    if (!visitorName || !phone || !address || !purpose) {
      return res.status(400).json({ error: 'Name, phone, address and purpose are required.' });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian phone number.' });
    }

    const appointment = await database.appointment.create({
      data: {
        visitorName,
        phone,
        address,
        purpose,
        operatorId: req.user.id,
        operatorName: req.user.name,
        operatorEmail: req.user.email,
        operatorBlockName: req.user.blockName || null,
        operatorBlockLgdCode: req.user.blockLgdCode || null
      }
    });

    appointmentEvents.emit('change', { operatorId: req.user.id, action: 'created' });
    res.status(201).json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register visitor appointment.' });
  }
});

router.patch('/:id/decision', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const decision = String(req.body.decision || '').toUpperCase();
    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be APPROVE or REJECT.' });
    }

    const existing = await database.appointment.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Appointment request not found.' });
    if (existing.status !== 'PENDING') {
      return res.status(409).json({ error: 'This appointment request has already been decided.' });
    }

    let appointmentDate: string | null = null;
    let appointmentTime: string | null = null;
    if (decision === 'APPROVE') {
      appointmentDate = String(req.body.appointmentDate || '').trim();
      appointmentTime = String(req.body.appointmentTime || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) || !/^\d{2}:\d{2}$/.test(appointmentTime)) {
        return res.status(400).json({ error: 'Please select a valid appointment date and time.' });
      }
      const scheduledFor = new Date(`${appointmentDate}T${appointmentTime}:00+05:30`);
      if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'Appointment date and time must be in the future.' });
      }
    }

    const appointment = await database.appointment.update({
      where: { id: req.params.id },
      data: {
        status: decision === 'APPROVE' ? 'CONFIRMED' : 'REJECTED',
        appointmentDate,
        appointmentTime,
        decidedById: req.user!.id,
        decidedByName: req.user!.name,
        decidedAt: new Date()
      }
    });

    appointmentEvents.emit('change', { operatorId: existing.operatorId, action: 'decided' });
    res.json({ success: true, appointment });
  } catch (error: any) {
    if (String(error?.message || '').includes('record not found')) {
      return res.status(404).json({ error: 'Appointment request not found.' });
    }
    res.status(500).json({ error: 'Failed to update appointment request.' });
  }
});

export default router;
