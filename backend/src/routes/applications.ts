import { database } from '../database';
import { Router, Response } from 'express';
import { authenticateToken, requireWrite, requireDataEntryOrAdmin, AuthenticatedRequest } from '../middleware/auth';
import multer from 'multer';
import fs from 'fs';

const router = Router();
const uploadMem = multer({ storage: multer.memoryStorage() });

// CSV Formula Injection Sanitizer (OWASP CWE-1236)
function sanitizeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).trim();
  // If the cell begins with =, +, -, @, tab, or carriage return, prepend a single quote to neutralize formula execution
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

// Helper to generate next unique Application ID
async function generateApplicationId(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `BACMS-${currentYear}-`;

  const lastApp = await database.application.findFirst({
    where: {
      applicationId: { startsWith: prefix }
    },
    orderBy: { id: 'desc' },
    select: { applicationId: true }
  });

  let nextSeq = 1;
  if (lastApp && lastApp.applicationId) {
    const parts = lastApp.applicationId.split('-');
    if (parts.length === 3) {
      const num = parseInt(parts[2]);
      if (!isNaN(num)) {
        nextSeq = num + 1;
      }
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// Enforce authentication on all application management routes
router.use(authenticateToken);

// POST /api/applications - Create new application (Restricted to Admin and Data Entry)
router.post('/', requireDataEntryOrAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      applicantName,
      mobileNumber,
      alternateMobile,
      address,
      districtId,
      constituencyId,
      constituencyName,
      categoryId,
      categoryName,
      category: categoryInput,
      subject,
      description,
      priority,
      assignedEmployee,
      status,
      internalRemarks,
      documents,
      dateReceived
    } = req.body;

    // 1. Validate basic applicant fields
    if (!applicantName || !mobileNumber || !address || !districtId || !subject || !description) {
      return res.status(400).json({ error: 'Please provide all mandatory applicant and grievance fields.' });
    }

    if (!/^\d{10}$/.test(mobileNumber.trim())) {
      return res.status(400).json({ error: 'Valid 10-digit mobile number is required.' });
    }

    // 2. Validate Assembly Constituency (MANDATORY)
    if (!constituencyId && !constituencyName) {
      return res.status(400).json({ error: 'Please enter or select Assembly Constituency.' });
    }

    let finalConstituencyId: number | null = null;
    let finalVerifiedAcCode = 'UNVERIFIED';
    let finalCustomConstituency: string | null = null;
    let isUnverifiedAc = false;

    if (constituencyId) {
      const constituency = await database.assemblyConstituency.findUnique({
        where: { id: parseInt(constituencyId) },
        include: { district: true }
      });

      if (!constituency) {
        return res.status(400).json({ error: 'Selected Assembly Constituency not found in official roster.' });
      }

      if (constituency.districtId !== parseInt(districtId)) {
        return res.status(400).json({
          error: `Invalid mapping: Constituency "${constituency.name}" belongs to district "${constituency.district.name}", not selected district ID ${districtId}.`
        });
      }

      finalConstituencyId = constituency.id;
      finalVerifiedAcCode = constituency.acCode;
      isUnverifiedAc = false;
    } else if (constituencyName && typeof constituencyName === 'string') {
      const trimmedAcName = constituencyName.trim();
      // Search for match in official Assembly roster
      const matchedAc = await database.assemblyConstituency.findFirst({
        where: {
          districtId: parseInt(districtId),
          name: { equals: trimmedAcName }
        }
      });

      if (matchedAc) {
        finalConstituencyId = matchedAc.id;
        finalVerifiedAcCode = matchedAc.acCode;
        isUnverifiedAc = false;
      } else {
        // Flag unmatched manual entry for administrative review rather than silently treating as verified
        finalConstituencyId = null;
        finalCustomConstituency = trimmedAcName;
        finalVerifiedAcCode = 'UNVERIFIED';
        isUnverifiedAc = true;
      }
    }

    // 3. Validate Complaint Category (MANDATORY & MANUAL TEXT ENTRY)
    const rawCategory = (categoryName || categoryInput || '').trim();
    let finalCategoryId: string | null = categoryId ? String(categoryId) : null;
    let finalCategoryName = rawCategory;

    if (!rawCategory && !finalCategoryId) {
      return res.status(400).json({ error: 'Please enter a complaint category.' });
    }

    if (rawCategory) {
      finalCategoryName = rawCategory;
      // Find or create in ComplaintCategory table so autocomplete, master filters, and reporting function dynamically
      let cat = await database.complaintCategory.findFirst({
        where: { name: { equals: rawCategory } }
      });

      if (!cat) {
        const codeSlug = 'CAT-' + rawCategory.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12) + '-' + Math.floor(100 + Math.random() * 900);
        cat = await database.complaintCategory.create({
          data: {
            name: rawCategory,
            code: codeSlug,
            description: 'Citizen/User-defined complaint category'
          }
        });
      }
      finalCategoryId = cat.id;
    } else if (finalCategoryId) {
      const cat = await database.complaintCategory.findUnique({ where: { id: finalCategoryId } });
      if (cat) {
        finalCategoryName = cat.name;
      }
    }

    // 4. Generate Unique Application ID
    const applicationId = await generateApplicationId();

    const applicationPriority = (priority === 'IMPORTANT' || priority === 'Important') ? 'IMPORTANT' : 'NORMAL';
    const applicationStatus = status ? status.toUpperCase() : 'PENDING';
    const receivedDateObj = dateReceived ? new Date(dateReceived) : new Date();

    // Default follow up date: 7 days from now
    const defaultFollowUp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const created = await database.application.create({
      data: {
        applicationId,
        applicantName: applicantName.trim(),
        mobileNumber: mobileNumber.trim(),
        alternateMobile: alternateMobile ? alternateMobile.trim() : null,
        address: address.trim(),
        districtId: parseInt(districtId),
        constituencyId: finalConstituencyId,
        customConstituency: finalCustomConstituency,
        verifiedAcCode: finalVerifiedAcCode,
        isUnverifiedAc,
        categoryId: finalCategoryId,
        categoryName: finalCategoryName,
        subject: subject.trim(),
        description: description.trim(),
        priority: applicationPriority,
        status: applicationStatus,
        assignedEmployee: assignedEmployee ? assignedEmployee.trim() : 'Unassigned',
        internalRemarks: internalRemarks ? internalRemarks.trim() : null,
        documents: documents ? (typeof documents === 'string' ? documents : JSON.stringify(documents)) : null,
        dateReceived: receivedDateObj,
        nextFollowUpDate: defaultFollowUp,
        lastActionTaken: 'Application registered in JanSetu Bihar portal'
      },
      include: {
        district: true,
        constituency: true,
        category: true
      }
    });

    // Record initial follow-up
    await database.followUp.create({
      data: {
        applicationId: created.id,
        actionTaken: 'Initial Application Registration',
        reminderNotes: isUnverifiedAc
          ? `Application registered. Constituency '${finalCustomConstituency}' flagged for official delimitation review.`
          : 'Application submitted and verified against Bihar Assembly Constituency database.',
        previousStatus: 'NEW',
        newStatus: applicationStatus,
        assignedTo: created.assignedEmployee,
        nextFollowUpDate: defaultFollowUp,
        actionBy: (req as any).user ? (req as any).user.name : 'Web Intake Desk'
      }
    });

    // Audit log
    await database.auditLog.create({
      data: {
        applicationId: created.id,
        entityType: 'APPLICATION',
        action: 'CREATE',
        details: `Application ${created.applicationId} registered for ${created.applicantName} (${created.verifiedAcCode} - ${(created as any).constituency?.name || created.customConstituency}). Category: "${created.categoryName}". Priority: ${created.priority}`,
        performedBy: (req as any).user ? (req as any).user.email : 'Citizen / Intake Desk',
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      success: true,
      applicationId: created.applicationId,
      application: created
    });
  } catch (error: any) {
    console.error('Error creating application:', error);
    res.status(500).json({ error: 'Failed to record application. Please try again.' });
  }
});

// GET /api/applications - List with filters, search, and pagination
router.get('/', async (req, res) => {
  try {
    const {
      search,
      districtId,
      constituencyId,
      categoryId,
      category,
      priority,
      status,
      assignedEmployee,
      viewType,
      dateFrom,
      dateTo,
      page = '1',
      limit = '15',
      sortBy = 'dateReceived',
      sortOrder = 'desc'
    } = req.query;

    const where: any = {};

    // Free text search
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { applicationId: { contains: q } },
        { applicantName: { contains: q } },
        { mobileNumber: { contains: q } },
        { subject: { contains: q } },
        { verifiedAcCode: { contains: q } },
        { categoryName: { contains: q } },
        { customConstituency: { contains: q } }
      ];
    }

    // Specific filters
    if (districtId) where.districtId = parseInt(districtId as string);
    if (constituencyId) where.constituencyId = parseInt(constituencyId as string);
    if (categoryId) where.categoryId = parseInt(categoryId as string);
    if (category && typeof category === 'string') {
      where.categoryName = { contains: category.trim() };
    }
    if (priority) where.priority = (priority as string).toUpperCase();
    if (status) {
      const s = (status as string).toUpperCase();
      if (s === 'ACTIVE_FOLLOWUPS' || s === 'FOLLOWUPS') {
        where.status = { in: ['PENDING', 'IN_PROGRESS'] };
      } else if (s === 'DISPOSED' || s === 'COMPLETED') {
        where.status = { in: ['COMPLETED', 'DISPOSED'] };
      } else {
        where.status = s;
      }
    }
    if (assignedEmployee && typeof assignedEmployee === 'string') {
      where.assignedEmployee = { contains: assignedEmployee.trim() };
    }

    // Date range
    if (dateFrom || dateTo) {
      where.dateReceived = {};
      if (dateFrom) where.dateReceived.gte = new Date(dateFrom as string);
      if (dateTo) {
        const dTo = new Date(dateTo as string);
        dTo.setHours(23, 59, 59, 999);
        where.dateReceived.lte = dTo;
      }
    }

    // Separate View Types
    const now = new Date();
    if (viewType === 'important') {
      where.priority = 'IMPORTANT';
    } else if (viewType === 'normal') {
      where.priority = 'NORMAL';
    } else if (viewType === 'pending') {
      where.status = 'PENDING';
    } else if (viewType === 'in_progress') {
      where.status = 'IN_PROGRESS';
    } else if (viewType === 'completed' || viewType === 'disposed') {
      where.status = { in: ['COMPLETED', 'DISPOSED'] };
    } else if (viewType === 'active_followups' || viewType === 'followups') {
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    } else if (viewType === 'overdue') {
      where.status = { not: 'COMPLETED' };
      where.nextFollowUpDate = { lte: now };
    }

    const pageNum = Math.max(1, parseInt(page as string));
    const pageSize = Math.max(1, parseInt(limit as string));
    const skip = (pageNum - 1) * pageSize;

    const orderByField = (sortBy as string) || 'dateReceived';
    const orderDirection = (sortOrder as string).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, applications] = await Promise.all([
      database.application.count({ where }),
      database.application.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [orderByField]: orderDirection },
        include: {
          district: { select: { id: true, name: true, code: true } },
          constituency: { select: { id: true, name: true, acCode: true, acNumber: true } },
          category: { select: { id: true, name: true, code: true } },
          _count: { select: { followUps: true } }
        }
      })
    ]);

    // Enhance application objects with calculated helper metrics
    const enhancedApps = applications.map((app) => {
      const daysSinceReceipt = Math.floor(
        (now.getTime() - new Date(app.dateReceived).getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysSinceLastUpdate = Math.floor(
        (now.getTime() - new Date(app.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      const isOverdue =
        app.status !== 'COMPLETED' &&
        app.nextFollowUpDate !== null &&
        new Date(app.nextFollowUpDate).getTime() < now.getTime();

      return {
        ...app,
        daysSinceReceipt,
        daysSinceLastUpdate,
        isOverdue
      };
    });

    res.json({
      total,
      page: pageNum,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      applications: enhancedApps
    });
  } catch (error: any) {
    console.error('Error listing applications:', error);
    res.status(500).json({ error: 'Failed to retrieve applications.' });
  }
});

// GET /api/applications/:id - Detailed view with audit logs and follow-up trail
router.get('/:id', async (req, res) => {
  try {
    const idParam = req.params.id;
    let where: any = {};
    if (/^[a-f\d]{24}$/i.test(idParam)) {
      where = { id: idParam };
    } else {
      where = { applicationId: idParam };
    }

    const application = await database.application.findFirst({
      where,
      include: {
        district: true,
        constituency: true,
        category: true,
        followUps: {
          orderBy: { createdAt: 'desc' }
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const now = new Date();
    const daysSinceReceipt = Math.floor(
      (now.getTime() - new Date(application.dateReceived).getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceLastUpdate = Math.floor(
      (now.getTime() - new Date(application.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const isOverdue =
      application.status !== 'COMPLETED' &&
      application.nextFollowUpDate !== null &&
      new Date(application.nextFollowUpDate).getTime() < now.getTime();

    res.json({
      application: {
        ...application,
        daysSinceReceipt,
        daysSinceLastUpdate,
        isOverdue
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching application details' });
  }
});

// PUT /api/applications/:id - Edit application record
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const userRole = req.user?.role;

    if (userRole === 'READONLY') {
      return res.status(403).json({
        error: 'Permission denied: Read-Only users cannot modify application records.'
      });
    }

    const existing = await database.application.findUnique({
      where: { id },
      include: { category: true, constituency: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Application record not found' });
    }

    const {
      applicantName,
      mobileNumber,
      alternateMobile,
      address,
      subject,
      description,
      priority,
      status,
      assignedEmployee,
      internalRemarks,
      categoryId,
      categoryName,
      constituencyId,
      constituencyName,
      completionNotes
    } = req.body;

    // RBAC: REVIEWER cannot modify applicant registration profile
    if (userRole === 'REVIEWER') {
      const isAttemptingApplicantDataChange =
        (applicantName !== undefined && applicantName.trim() !== existing.applicantName) ||
        (mobileNumber !== undefined && mobileNumber.trim() !== existing.mobileNumber) ||
        (alternateMobile !== undefined && alternateMobile !== existing.alternateMobile) ||
        (address !== undefined && address.trim() !== existing.address) ||
        (subject !== undefined && subject.trim() !== existing.subject) ||
        (description !== undefined && description.trim() !== existing.description) ||
        (constituencyId !== undefined && parseInt(constituencyId) !== existing.constituencyId) ||
        (categoryName !== undefined && categoryName.trim() !== existing.categoryName);

      if (isAttemptingApplicantDataChange) {
        return res.status(403).json({
          error: 'Permission denied: Reviewers can update status, remarks, and employee assignments, but cannot modify applicant profile details.'
        });
      }
    }

    const updateData: any = {};
    const auditChanges: string[] = [];

    if (applicantName && applicantName.trim() !== existing.applicantName) {
      updateData.applicantName = applicantName.trim();
      auditChanges.push(`Applicant Name changed to "${applicantName.trim()}"`);
    }
    if (mobileNumber && mobileNumber.trim() !== existing.mobileNumber) {
      updateData.mobileNumber = mobileNumber.trim();
      auditChanges.push(`Mobile Number updated`);
    }
    if (alternateMobile !== undefined) updateData.alternateMobile = alternateMobile;
    if (address && address.trim() !== existing.address) updateData.address = address.trim();
    if (subject && subject.trim() !== existing.subject) updateData.subject = subject.trim();
    if (description && description.trim() !== existing.description) updateData.description = description.trim();
    if (assignedEmployee && assignedEmployee.trim() !== existing.assignedEmployee) {
      updateData.assignedEmployee = assignedEmployee.trim();
      auditChanges.push(`Assigned employee changed from "${existing.assignedEmployee}" to "${assignedEmployee.trim()}"`);
    }
    if (internalRemarks !== undefined) updateData.internalRemarks = internalRemarks;

    // Complaint Category update / preservation:
    // If categoryName is provided, update it and link to ComplaintCategory
    // If not provided in edit payload, preserve original categoryName intact!
    if (categoryName !== undefined && categoryName.trim() !== '') {
      const trimmedCat = categoryName.trim();
      if (trimmedCat !== existing.categoryName) {
        updateData.categoryName = trimmedCat;
        auditChanges.push(`Complaint Category changed from "${existing.categoryName || (existing as any).category?.name}" to "${trimmedCat}"`);

        // Find or create category in ComplaintCategory table
        let cat = await database.complaintCategory.findFirst({
          where: { name: { equals: trimmedCat } }
        });
        if (!cat) {
          const codeSlug = 'CAT-' + trimmedCat.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 12) + '-' + Math.floor(100 + Math.random() * 900);
          cat = await database.complaintCategory.create({
            data: {
              name: trimmedCat,
              code: codeSlug,
              description: 'Citizen/User-defined category'
            }
          });
        }
        updateData.categoryId = cat.id;
      }
    } else if (categoryId && String(categoryId) !== existing.categoryId) {
      updateData.categoryId = String(categoryId);
      const cat = await database.complaintCategory.findUnique({ where: { id: String(categoryId) } });
      if (cat) {
        updateData.categoryName = cat.name;
        auditChanges.push(`Complaint Category updated to "${cat.name}"`);
      }
    }

    // Assembly Constituency update
    if (constituencyId && parseInt(constituencyId) !== existing.constituencyId) {
      const ac = await database.assemblyConstituency.findUnique({ where: { id: parseInt(constituencyId) } });
      if (ac) {
        updateData.constituencyId = ac.id;
        updateData.verifiedAcCode = ac.acCode;
        updateData.isUnverifiedAc = false;
        auditChanges.push(`Assembly Constituency changed to ${ac.name} (${ac.acCode})`);
      }
    }

    // Check Priority Change
    if (priority && priority.toUpperCase() !== existing.priority) {
      updateData.priority = priority.toUpperCase();
      auditChanges.push(`Priority changed from ${existing.priority} to ${priority.toUpperCase()}`);
    }

    // Check Status Change
    if (status && status.toUpperCase() !== existing.status) {
      const newStatus = status.toUpperCase();
      updateData.status = newStatus;
      if (newStatus === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.completionNotes = completionNotes || req.body.completionNotes || 'Marked as completed by staff';
      }
      auditChanges.push(`Status changed from ${existing.status} to ${newStatus}`);
    }

    // Support updating or appending attached documents
    if (req.body.documents !== undefined) {
      updateData.documents = typeof req.body.documents === 'string'
        ? req.body.documents
        : JSON.stringify(req.body.documents);
      auditChanges.push('Attached documents & evidence updated');
    }

    const updated = await database.application.update({
      where: { id },
      data: updateData,
      include: { district: true, constituency: true, category: true }
    });

    if (auditChanges.length > 0) {
      await database.auditLog.create({
        data: {
          applicationId: id,
          entityType: 'APPLICATION',
          action: 'UPDATE',
          details: auditChanges.join('; '),
          performedBy: req.user?.email || 'staff',
          ipAddress: req.ip
        }
      });
    }

    res.json({ success: true, application: updated });
  } catch (error: any) {
    res.status(500).json({ error: 'Error updating application record' });
  }
});

// GET /api/applications/export/csv
router.get('/export/csv', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { districtId, categoryId, category, priority, status, viewType, search } = req.query;
    const where: any = {};
    if (districtId) where.districtId = parseInt(districtId as string);
    if (categoryId) where.categoryId = parseInt(categoryId as string);
    if (category && typeof category === 'string') {
      where.categoryName = { contains: category.trim() };
    }
    if (priority) where.priority = (priority as string).toUpperCase();
    if (status) where.status = (status as string).toUpperCase();

    if (viewType) {
      const vt = (viewType as string).toLowerCase();
      if (vt === 'important') {
        where.priority = 'IMPORTANT';
      } else if (vt === 'normal') {
        where.priority = 'NORMAL';
      } else if (vt === 'active_followups' || vt === 'active' || vt === 'reminders') {
        where.status = { in: ['PENDING', 'IN_PROGRESS'] };
      } else if (vt === 'disposed' || vt === 'completed') {
        where.status = { in: ['COMPLETED', 'DISPOSED'] };
      }
    }

    if (search && typeof search === 'string') {
      const s = search.trim();
      where.OR = [
        { applicationId: { contains: s } },
        { applicantName: { contains: s } },
        { mobileNumber: { contains: s } },
        { subject: { contains: s } },
        { description: { contains: s } }
      ];
    }

    const apps = await database.application.findMany({
      where,
      orderBy: { dateReceived: 'desc' },
      include: { district: true, constituency: true, category: true }
    });

    // Audit log CSV export
    await database.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        action: 'EXPORT_CSV',
        details: `Exported ${apps.length} applications to CSV file.`,
        performedBy: req.user?.email || 'authenticated_user',
        ipAddress: req.ip
      }
    }).catch(() => {});

    const headers = [
      'Application_ID',
      'Date_Received',
      'Applicant_Name',
      'Mobile_Number',
      'District',
      'Assembly_Constituency',
      'Assembly_Code',
      'Category',
      'Priority',
      'Status',
      'Assigned_Employee',
      'Subject',
      'Last_Updated'
    ];

    const rows = apps.map(a => [
      sanitizeCsvValue(a.applicationId),
      sanitizeCsvValue(a.dateReceived.toISOString().split('T')[0]),
      sanitizeCsvValue(a.applicantName),
      sanitizeCsvValue(a.mobileNumber),
      sanitizeCsvValue(a.district.name),
      sanitizeCsvValue(a.constituency?.name || a.customConstituency || 'Unassigned'),
      sanitizeCsvValue(a.verifiedAcCode),
      sanitizeCsvValue(a.categoryName || a.category?.name || 'General'),
      sanitizeCsvValue(a.priority),
      sanitizeCsvValue(a.status),
      sanitizeCsvValue(a.assignedEmployee),
      sanitizeCsvValue(a.subject),
      sanitizeCsvValue(a.updatedAt.toISOString().split('T')[0])
    ]);

    const csvData = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="JanSetu_Bihar_Applications_Export.csv"');
    res.send(csvData);
  } catch (error: any) {
    res.status(500).json({ error: 'Error exporting CSV' });
  }
});

// DELETE /api/applications/:id - Delete single application record
router.delete('/:id', authenticateToken, requireWrite, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ error: 'Invalid application ID' });
    }

    const existing = await database.application.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Application record not found' });
    }

    // Delete associated follow-ups
    await database.followUp.deleteMany({
      where: { applicationId: id }
    });

    // Delete associated audit logs
    await database.auditLog.deleteMany({
      where: { applicationId: id }
    });

    // Clean up physical document files if present in uploads
    if (existing.documents) {
      try {
        const docs = typeof existing.documents === 'string' ? JSON.parse(existing.documents) : existing.documents;
        if (Array.isArray(docs)) {
          for (const doc of docs) {
            const docPath = doc.path || doc.filePath;
            if (docPath && fs.existsSync(docPath)) {
              fs.unlinkSync(docPath);
            }
          }
        }
      } catch (e) {
        console.warn('Could not remove document file:', e);
      }
    }

    // Delete the application itself
    await database.application.delete({
      where: { id }
    });

    // Record deletion event in system audit trail
    await database.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        action: 'DELETE',
        details: `Deleted application record ${existing.applicationId} (${existing.applicantName})`,
        performedBy: req.user?.email || 'staff',
        ipAddress: req.ip
      }
    }).catch(() => {});

    res.json({
      success: true,
      message: `Application ${existing.applicationId} permanently deleted.`
    });
  } catch (error: any) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Failed to delete application record' });
  }
});

// POST /api/applications/bulk-delete - Delete multiple application records
router.post('/bulk-delete', authenticateToken, requireWrite, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Please provide an array of application IDs to delete.' });
    }

    const validIds = ids.map(String).filter((id: string) => /^[a-f\d]{24}$/i.test(id));
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid application IDs found.' });
    }

    const apps = await database.application.findMany({
      where: { id: { in: validIds } }
    });

    // Delete follow-ups
    await database.followUp.deleteMany({
      where: { applicationId: { in: validIds } }
    });

    // Delete audit logs
    await database.auditLog.deleteMany({
      where: { applicationId: { in: validIds } }
    });

    // Delete physical files
    for (const a of apps) {
      if (a.documents) {
        try {
          const docs = typeof a.documents === 'string' ? JSON.parse(a.documents) : a.documents;
          if (Array.isArray(docs)) {
            for (const doc of docs) {
              const docPath = doc.path || doc.filePath;
              if (docPath && fs.existsSync(docPath)) {
                fs.unlinkSync(docPath);
              }
            }
          }
        } catch (e) {}
      }
    }

    // Delete applications
    const deletedCount = await database.application.deleteMany({
      where: { id: { in: validIds } }
    });

    // Audit log
    await database.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        action: 'BULK_DELETE',
        details: `Bulk deleted ${deletedCount.count} application records.`,
        performedBy: req.user?.email || 'staff',
        ipAddress: req.ip
      }
    }).catch(() => {});

    res.json({
      success: true,
      count: deletedCount.count,
      message: `Successfully deleted ${deletedCount.count} application records.`
    });
  } catch (error: any) {
    console.error('Error in bulk-delete:', error);
    res.status(500).json({ error: 'Failed to bulk delete applications' });
  }
});

// POST /api/applications/clear-all - Delete all application records from the database
router.post('/clear-all', authenticateToken, requireWrite, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Delete all follow-ups first
    await database.followUp.deleteMany({});

    // Delete all applications
    const deletedCount = await database.application.deleteMany({});

    // Audit log
    await database.auditLog.create({
      data: {
        entityType: 'APPLICATION',
        action: 'CLEAR_ALL',
        details: `Cleared all application data (${deletedCount.count} records purged).`,
        performedBy: req.user?.email || 'staff',
        ipAddress: req.ip
      }
    }).catch(() => {});

    res.json({
      success: true,
      count: deletedCount.count,
      message: `Successfully cleared all ${deletedCount.count} application records.`
    });
  } catch (error: any) {
    console.error('Error in clear-all:', error);
    res.status(500).json({ error: 'Failed to clear all applications' });
  }
});

export default router;

