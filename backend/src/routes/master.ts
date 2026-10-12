import { database } from '../database';
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import multer from 'multer';

const router = Router();
const uploadMem = multer({ storage: multer.memoryStorage() });

// GET /api/master/districts
router.get('/districts', async (req, res) => {
  try {
    const districts = await database.district.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { constituencies: true, applications: true }
        }
      }
    });
    res.json({ districts });
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching districts' });
  }
});

// GET /api/master/constituencies (Optional query ?districtId=...)
router.get('/constituencies', async (req, res) => {
  try {
    const { districtId, activeOnly } = req.query;
    const where: any = {};

    if (districtId) {
      where.districtId = parseInt(districtId as string);
    }
    if (activeOnly !== 'false') {
      where.isActive = true;
    }

    const constituencies = await database.assemblyConstituency.findMany({
      where,
      orderBy: { acNumber: 'asc' },
      include: {
        district: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    res.json({ constituencies });
  } catch (error: any) {
    res.status(500).json({ error: 'Error fetching constituencies' });
  }
});

// GET /api/master/stats - Validation Report
router.get('/validation-report', async (req, res) => {
  try {
    const totalDistricts = await database.district.count();
    const totalConstituencies = await database.assemblyConstituency.count();

    // Check expected count (38 districts, 243 constituencies)
    const expectedDistricts = 38;
    const expectedConstituencies = 243;
    const warnings: string[] = [];

    if (totalDistricts !== expectedDistricts) {
      warnings.push(`Expected 38 districts, found ${totalDistricts}. Missing: ${Math.abs(expectedDistricts - totalDistricts)}.`);
    }
    if (totalConstituencies !== expectedConstituencies) {
      warnings.push(`Expected 243 assembly constituencies, found ${totalConstituencies}. Missing: ${Math.abs(expectedConstituencies - totalConstituencies)}.`);
    }

    // Check for constituencies without valid district mapping
    const orphanCount = await database.assemblyConstituency.count({
      where: { district: isNaN as any }
    }).catch(() => 0);

    // Distribution by reservation
    const genCount = await database.assemblyConstituency.count({ where: { reservation: 'GEN' } });
    const scCount = await database.assemblyConstituency.count({ where: { reservation: 'SC' } });
    const stCount = await database.assemblyConstituency.count({ where: { reservation: 'ST' } });

    res.json({
      status: warnings.length === 0 ? 'VALID' : 'WARNING',
      totalDistricts,
      expectedDistricts,
      totalConstituencies,
      expectedConstituencies,
      breakdown: {
        generalSeats: genCount,
        scReservedSeats: scCount,
        stReservedSeats: stCount
      },
      warnings,
      isFullyCompliant: warnings.length === 0
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error calculating master data validation' });
  }
});

// GET /api/master/export/constituencies-csv
router.get('/export/constituencies-csv', async (req, res) => {
  try {
    const data = await database.assemblyConstituency.findMany({
      orderBy: { acNumber: 'asc' },
      include: { district: true }
    });

    const headers = ['AC_Number', 'AC_Code', 'Constituency_Name', 'Reservation', 'District_Name', 'District_Code', 'Lok_Sabha_Constituency', 'Status'];
    const rows = data.map(c => [
      c.acNumber,
      c.acCode,
      `"${c.name.replace(/"/g, '""')}"`,
      c.reservation,
      `"${c.district.name.replace(/"/g, '""')}"`,
      c.district.code,
      `"${(c.lokSabhaConstituency || '').replace(/"/g, '""')}"`,
      c.isActive ? 'Active' : 'Inactive'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Bihar_243_Assembly_Constituencies.csv"');
    res.send(csvContent);
  } catch (error: any) {
    res.status(500).json({ error: 'Error exporting CSV' });
  }
});

// POST /api/master/import/preview-constituencies (Admin only)
router.post('/import/preview-constituencies', authenticateToken, requireAdmin, uploadMem.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a CSV file' });
    }

    const csvText = req.file.buffer.toString('utf-8');
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);

    if (lines.length < 2) {
      return res.status(400).json({ error: 'File appears empty or missing header row' });
    }

    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    
    // Check required columns
    const acNumIdx = header.findIndex(h => h.includes('ac_num') || h.includes('number') || h === 'no' || h === 'no.');
    const nameIdx = header.findIndex(h => h.includes('constituency') || h.includes('name'));
    const distIdx = header.findIndex(h => h.includes('district'));

    if (acNumIdx === -1 || nameIdx === -1 || distIdx === -1) {
      return res.status(400).json({
        error: 'Invalid CSV format. Missing required columns: AC Number, Constituency Name, and District Name.'
      });
    }

    const districts = await database.district.findMany();
    const districtMap = new Map(districts.map(d => [d.name.toLowerCase().trim(), d.id]));

    const validRows: any[] = [];
    const invalidRows: any[] = [];
    const duplicates: any[] = [];
    const seenAcNumbers = new Set<number>();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length <= Math.max(acNumIdx, nameIdx, distIdx)) continue;

      const acNum = parseInt(parts[acNumIdx]);
      const acName = parts[nameIdx];
      const distName = parts[distIdx];

      if (isNaN(acNum) || acNum < 1 || acNum > 243) {
        invalidRows.push({ line: i + 1, data: lines[i], reason: `Invalid AC Number: ${parts[acNumIdx]} (Must be 1 to 243)` });
        continue;
      }

      if (seenAcNumbers.has(acNum)) {
        duplicates.push({ line: i + 1, acNumber: acNum, reason: `Duplicate AC Number ${acNum} in file` });
        continue;
      }
      seenAcNumbers.add(acNum);

      const mappedDistId = districtMap.get(distName.toLowerCase().trim());
      if (!mappedDistId) {
        invalidRows.push({ line: i + 1, data: lines[i], reason: `Unrecognized Bihar district: "${distName}"` });
        continue;
      }

      validRows.push({
        acNumber: acNum,
        acCode: `AC-${String(acNum).padStart(3, '0')}`,
        name: acName,
        districtId: mappedDistId,
        districtName: distName,
        reservation: 'GEN'
      });
    }

    res.json({
      totalRowsInFile: lines.length - 1,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      duplicateCount: duplicates.length,
      preview: validRows.slice(0, 10),
      invalidRows: invalidRows.slice(0, 10),
      duplicates: duplicates.slice(0, 10)
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error parsing CSV file' });
  }
});

export default router;

