import express from 'express';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/attendance - record attendance verification event
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { studentId, timestamp, deviceId, confidence } = req.body;

    if (!studentId || !deviceId) {
      return res.status(400).json({ error: 'studentId and deviceId are required.' });
    }

    // Verify student belongs to this tenant
    const student = await prisma.student.findFirst({
      where: { id: studentId, tenantId: req.user.tenantId },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found in this tenant roster.' });
    }

    const eventTime = timestamp ? new Date(timestamp) : new Date();

    const record = await prisma.attendance.create({
      data: {
        tenantId: req.user.tenantId,
        studentId: student.id,
        timestamp: eventTime,
        deviceId: String(deviceId),
        confidence: typeof confidence === 'number' ? confidence : null,
      },
    });

    return res.status(201).json({
      success: true,
      id: record.id,
      studentId: record.studentId,
      studentName: student.name,
      timestamp: record.timestamp,
      deviceId: record.deviceId,
      confidence: record.confidence,
    });
  } catch (err) {
    console.error('Attendance recording error:', err);
    return res.status(500).json({ error: 'Failed to record attendance.' });
  }
});

// GET /api/attendance/report - admin view of logs for today (or given date)
router.get('/report', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;

    let startDate;
    let endDate;

    if (date) {
      startDate = new Date(`${date}T00:00:00.000Z`);
      endDate = new Date(`${date}T23:59:59.999Z`);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    const records = await prisma.attendance.findMany({
      where: {
        tenantId: req.user.tenantId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentIdCode: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const totalStudentsInTenant = await prisma.student.count({
      where: { tenantId: req.user.tenantId },
    });

    const uniquePresentStudents = new Set(records.map((r) => r.studentId)).size;

    return res.json({
      date: (date || startDate.toISOString().split('T')[0]),
      stats: {
        totalAttendanceEvents: records.length,
        uniquePresent: uniquePresentStudents,
        totalEnrolled: totalStudentsInTenant,
        attendanceRate: totalStudentsInTenant > 0 ? (uniquePresentStudents / totalStudentsInTenant) * 100 : 0,
      },
      records: records.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        studentName: r.student.name,
        studentCode: r.student.studentIdCode,
        imageUrl: r.student.imageUrl,
        timestamp: r.timestamp,
        deviceId: r.deviceId,
        confidence: r.confidence,
      })),
    });
  } catch (err) {
    console.error('Attendance report error:', err);
    return res.status(500).json({ error: 'Failed to generate attendance report.' });
  }
});

/**
 * GET /api/attendance/feed and /api/attendance/feed/:tenantId
 * Dedicated endpoint for external websites, dashboards, and integrations.
 * Supports:
 * - Direct path: /api/attendance/feed/:tenantId
 * - Query param: ?tenantId=<id>
 * - ?apiKey=<key> or Bearer <token>
 * - ?startDate=YYYY-MM-DD
 * - ?endDate=YYYY-MM-DD
 * - ?studentId=<id>
 * - ?limit=50
 *
 * Returns:
 * 1. uniqueAttendance: List of unique students with name, id, total attendance count, first seen, and latest seen timestamp.
 * 2. timeline: Time-series log grouped by date / timestamp for trend tracking.
 * 3. rawLogs: Chronological attendance events.
 */
async function handleAttendanceFeed(req, res) {
  try {
    let tenantId = null;

    // Check direct route parameter /feed/:tenantId first
    const paramTenantId = req.params?.tenantId;

    // Check Bearer Token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        const decoded = (await import('jsonwebtoken')).default.verify(
          token,
          process.env.JWT_SECRET || 'verity-super-secret-jwt-key-attendance-2026'
        );
        tenantId = decoded.tenantId;
      } catch (e) {
        // Token invalid, fall back to check query / API key
      }
    }

    // Check API Key or direct tenantId query if not authenticated via Bearer
    const apiKey = req.query.apiKey || req.headers['x-api-key'];
    const requestedTenantId = paramTenantId || req.query.tenantId;

    if (!tenantId) {
      if (apiKey) {
        // Accept JWT token or standard API key in ?apiKey
        try {
          const decoded = (await import('jsonwebtoken')).default.verify(
            apiKey,
            process.env.JWT_SECRET || 'verity-super-secret-jwt-key-attendance-2026'
          );
          tenantId = decoded.tenantId;
        } catch {
          // If custom key matching tenant
          const tenant = await prisma.tenant.findFirst({
            where: requestedTenantId ? { id: requestedTenantId } : {},
          });
          if (tenant) tenantId = tenant.id;
        }
      } else if (requestedTenantId) {
        // Allow public read if tenantId is provided for external embedding
        const tenant = await prisma.tenant.findUnique({ where: { id: requestedTenantId } });
        if (tenant) tenantId = tenant.id;
      }
    }

    if (!tenantId) {
      // Default to primary active tenant
      const firstTenant = await prisma.tenant.findFirst();
      if (firstTenant) {
        tenantId = firstTenant.id;
      } else {
        return res.status(401).json({
          error: 'Unauthorized. Please supply a valid tenant ID or Bearer token.',
        });
      }
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, createdAt: true },
    });

    const { startDate, endDate, studentId, limit } = req.query;

    const whereClause = {
      tenantId,
    };

    if (studentId) {
      whereClause.studentId = studentId;
    }

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = new Date(startDate);
      if (endDate) whereClause.timestamp.lte = new Date(endDate);
    }

    const takeLimit = limit ? Math.min(parseInt(limit, 10), 1000) : 500;

    const logs = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentIdCode: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: takeLimit,
    });

    // Compute unique attendance summaries per student
    const studentMap = new Map();
    // Compute timeline (attendance count per date)
    const timelineMap = new Map();

    for (const log of logs) {
      const sId = log.studentId;
      const sName = log.student?.name || 'Unknown';
      const sCode = log.student?.studentIdCode || '';
      const sImage = log.student?.imageUrl || null;
      const dateKey = log.timestamp.toISOString().split('T')[0];

      // 1. Group unique students
      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          studentId: sId,
          name: sName,
          studentIdCode: sCode,
          imageUrl: sImage,
          totalAttendanceCount: 0,
          latestAttendance: log.timestamp,
          firstAttendance: log.timestamp,
          history: [],
        });
      }

      const stuSummary = studentMap.get(sId);
      stuSummary.totalAttendanceCount += 1;
      if (new Date(log.timestamp) > new Date(stuSummary.latestAttendance)) {
        stuSummary.latestAttendance = log.timestamp;
      }
      if (new Date(log.timestamp) < new Date(stuSummary.firstAttendance)) {
        stuSummary.firstAttendance = log.timestamp;
      }
      stuSummary.history.push({
        id: log.id,
        timestamp: log.timestamp,
        deviceId: log.deviceId,
        confidence: log.confidence,
      });

      // 2. Group timeline by calendar date
      timelineMap.set(dateKey, (timelineMap.get(dateKey) || 0) + 1);
    }

    // Convert timeline map to sorted array
    const timeline = Array.from(timelineMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Convert unique students map to array
    const uniqueStudents = Array.from(studentMap.values()).sort(
      (a, b) => b.totalAttendanceCount - a.totalAttendanceCount
    );

    return res.json({
      success: true,
      tenantId,
      tenantName: tenant ? tenant.name : 'Unknown Tenant',
      totalEvents: logs.length,
      uniqueStudentsCount: uniqueStudents.length,
      timeline,
      uniqueAttendance: uniqueStudents,
      recentLogs: logs.map((l) => ({
        id: l.id,
        studentId: l.studentId,
        studentName: l.student?.name,
        studentCode: l.student?.studentIdCode,
        imageUrl: l.student?.imageUrl,
        timestamp: l.timestamp,
        deviceId: l.deviceId,
        confidence: l.confidence,
      })),
    });
  } catch (err) {
    console.error('Attendance feed error:', err);
    return res.status(500).json({ error: 'Failed to retrieve attendance feed.' });
  }
}

router.get('/feed', handleAttendanceFeed);
router.get('/feed/:tenantId', handleAttendanceFeed);

export default router;
