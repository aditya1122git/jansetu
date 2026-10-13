import { database } from '../database';
import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Enforce authentication on all reports routes
router.use(authenticateToken);

const getApplicationScope = (req: AuthenticatedRequest) =>
  req.user?.role === 'DATA_ENTRY' ? { createdById: req.user.id } : {};

// GET /api/reports/dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const operatorScope = getApplicationScope(authReq);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      total,
      important,
      normal,
      pending,
      inProgress,
      awaitingInfo,
      completed,
      overdue,
      receivedToday
    ] = await Promise.all([
      database.application.count({ where: operatorScope }),
      database.application.count({ where: { ...operatorScope, priority: 'IMPORTANT' } }),
      database.application.count({ where: { ...operatorScope, priority: 'NORMAL' } }),
      database.application.count({ where: { ...operatorScope, status: 'PENDING' } }),
      database.application.count({ where: { ...operatorScope, status: 'IN_PROGRESS' } }),
      database.application.count({ where: { ...operatorScope, status: 'AWAITING_INFO' } }),
      database.application.count({ where: { ...operatorScope, status: { in: ['COMPLETED', 'DISPOSED'] } } }),
      database.application.count({
        where: {
          ...operatorScope,
          status: { notIn: ['COMPLETED', 'DISPOSED'] },
          nextFollowUpDate: { lte: now }
        }
      }),
      database.application.count({
        where: {
          ...operatorScope,
          dateReceived: { gte: startOfToday }
        }
      })
    ]);

    const activeFollowUps = pending + inProgress;
    const disposed = completed;

    res.json({
      total,
      important,
      normal,
      pending,
      inProgress,
      awaitingInfo,
      completed,
      disposed,
      activeFollowUps,
      overdue,
      receivedToday,
      timestamp: now.toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error calculating dashboard statistics' });
  }
});

// GET /api/reports/block-wise
router.get('/block-wise', async (req, res) => {
  try {
    const operatorScope = getApplicationScope(req as AuthenticatedRequest);
    const blocks = [
      { blockName: 'Asarganj', blockLgdCode: '2451' },
      { blockName: 'Haveli Kharagpur', blockLgdCode: '1872' },
      { blockName: 'Sangrampur', blockLgdCode: '2457' },
      { blockName: 'Tarapur', blockLgdCode: '2458' },
      { blockName: 'Tetiha Bambar', blockLgdCode: '1877' }
    ];
    const applications = await database.application.findMany({
      where: operatorScope,
      select: { blockName: true, blockLgdCode: true, priority: true, status: true }
    });

    const report = blocks.map(block => {
      const blockApplications = applications.filter(application =>
        application.blockName === block.blockName || String(application.blockLgdCode || '') === block.blockLgdCode
      );
      let importantCount = 0;
      let normalCount = 0;
      let pendingCount = 0;
      let completedCount = 0;

      for (const a of blockApplications) {
        if (a.priority === 'IMPORTANT') importantCount++;
        else normalCount++;
        if (a.status === 'PENDING') pendingCount++;
        if (['COMPLETED', 'DISPOSED'].includes(a.status)) completedCount++;
      }

      return {
        ...block,
        constituencyName: 'Tarapur',
        districtName: 'Munger',
        totalApplications: blockApplications.length,
        importantCount,
        normalCount,
        pendingCount,
        completedCount,
        resolutionRate: blockApplications.length > 0 ? Math.round((completedCount / blockApplications.length) * 100) : 0
      };
    });

    res.json({ blocks: report });
  } catch (error: any) {
    res.status(500).json({ error: 'Error calculating block-wise statistics' });
  }
});

// GET /api/reports/category-wise
router.get('/category-wise', async (req, res) => {
  try {
    const operatorScope = getApplicationScope(req as AuthenticatedRequest);
    const categories = await database.complaintCategory.findMany({
      where: { isActive: true },
      include: {
        applications: {
          where: operatorScope,
          select: { priority: true, status: true }
        }
      }
    });

    const report = categories.map(c => {
      let importantCount = 0;
      let normalCount = 0;
      let pendingCount = 0;
      let completedCount = 0;

      for (const a of c.applications) {
        if (a.priority === 'IMPORTANT') importantCount++;
        else normalCount++;
        if (a.status === 'PENDING') pendingCount++;
        if (a.status === 'COMPLETED') completedCount++;
      }

      return {
        categoryId: c.id,
        categoryName: c.name,
        categoryCode: c.code,
        total: c.applications.length,
        importantCount,
        normalCount,
        pendingCount,
        completedCount
      };
    }).sort((a, b) => b.total - a.total);

    res.json({ categories: report });
  } catch (error: any) {
    res.status(500).json({ error: 'Error calculating category statistics' });
  }
});

// GET /api/reports/ageing
router.get('/ageing', async (req, res) => {
  try {
    const operatorScope = getApplicationScope(req as AuthenticatedRequest);
    const pendingApps = await database.application.findMany({
      where: { ...operatorScope, status: { notIn: ['COMPLETED', 'DISPOSED'] } },
      select: { dateReceived: true, priority: true }
    });

    const now = Date.now();
    let lessThan7 = 0;
    let between7and15 = 0;
    let between15and30 = 0;
    let greaterThan30 = 0;

    for (const app of pendingApps) {
      const days = Math.floor((now - new Date(app.dateReceived).getTime()) / (1000 * 60 * 60 * 24));
      if (days < 7) lessThan7++;
      else if (days <= 15) between7and15++;
      else if (days <= 30) between15and30++;
      else greaterThan30++;
    }

    res.json({
      totalPendingOrActive: pendingApps.length,
      brackets: [
        { label: '< 7 Days (Fresh)', count: lessThan7, color: '#10B981' },
        { label: '7 – 15 Days (Standard)', count: between7and15, color: '#3B82F6' },
        { label: '15 – 30 Days (Escalated)', count: between15and30, color: '#F59E0B' },
        { label: '> 30 Days (Critical Ageing)', count: greaterThan30, color: '#EF4444' }
      ]
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error calculating ageing report' });
  }
});

// GET /api/reports/employee-workload
router.get('/employee-workload', async (req, res) => {
  try {
    const operatorScope = getApplicationScope(req as AuthenticatedRequest);
    const apps = await database.application.findMany({
      where: operatorScope,
      select: { assignedEmployee: true, status: true, priority: true }
    });

    const map = new Map<string, { total: number; pending: number; completed: number; important: number }>();

    for (const a of apps) {
      const emp = a.assignedEmployee || 'Unassigned';
      if (!map.has(emp)) {
        map.set(emp, { total: 0, pending: 0, completed: 0, important: 0 });
      }
      const entry = map.get(emp)!;
      entry.total++;
      if (a.status !== 'COMPLETED') entry.pending++;
      else entry.completed++;
      if (a.priority === 'IMPORTANT') entry.important++;
    }

    const result = Array.from(map.entries()).map(([employee, data]) => ({
      employee,
      ...data
    })).sort((a, b) => b.total - a.total);

    res.json({ workload: result });
  } catch (error: any) {
    res.status(500).json({ error: 'Error generating employee workload report' });
  }
});

export default router;

