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

export default router;
