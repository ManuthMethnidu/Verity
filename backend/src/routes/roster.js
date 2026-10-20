import express from 'express';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper: Convert embedding input (Array or Base64 string) to Buffer
function parseEmbeddingToBuffer(embedding) {
  if (!embedding) return null;

  if (typeof embedding === 'string') {
    // If base64
    const buffer = Buffer.from(embedding, 'base64');
    if (buffer.length > 4096) {
      throw new Error('Embedding payload exceeds 4KB limit.');
    }
    return buffer;
  }

  if (Array.isArray(embedding)) {
    // Float array (e.g. 128 elements)
    const floatArr = new Float32Array(embedding);
    const buffer = Buffer.from(floatArr.buffer, floatArr.byteOffset, floatArr.byteLength);
    if (buffer.length > 4096) {
      throw new Error('Embedding payload exceeds 4KB limit.');
    }
    return buffer;
  }

  return null;
}

// Helper: Format student record for client
function formatStudent(student) {
  let embeddingBase64 = null;
  let embeddingArray = null;

  if (student.embedding) {
    embeddingBase64 = Buffer.from(student.embedding).toString('base64');
    // Also provide float array representation for convenience
    const float32 = new Float32Array(
      student.embedding.buffer,
      student.embedding.byteOffset,
      student.embedding.byteLength / 4
    );
    embeddingArray = Array.from(float32);
  }

  return {
    id: student.id,
    tenantId: student.tenantId,
    studentIdCode: student.studentIdCode,
    name: student.name,
    imageUrl: student.imageUrl,
    embedding: embeddingBase64,
    embeddingVector: embeddingArray,
    createdAt: student.createdAt,
  };
}

// GET /api/roster - list all students for the authenticated tenant
router.get('/', authenticateToken, async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { name: 'asc' },
    });

    const formatted = students.map(formatStudent);
    return res.json(formatted);
  } catch (err) {
    console.error('Fetch roster error:', err);
    return res.status(500).json({ error: 'Failed to retrieve roster.' });
  }
});

// POST /api/roster/batch - batch upload students + embeddings
router.post('/batch', authenticateToken, async (req, res) => {
  try {
    const studentsData = req.body.students || (Array.isArray(req.body) ? req.body : [req.body]);

    if (!Array.isArray(studentsData) || studentsData.length === 0) {
      return res.status(400).json({ error: 'A non-empty list of students is required.' });
    }

    const createdRecords = [];

    for (const item of studentsData) {
      if (!item.name) {
        continue;
      }

      let embeddingBuffer = null;
      try {
        embeddingBuffer = parseEmbeddingToBuffer(item.embedding);
      } catch (embErr) {
        return res.status(400).json({ error: embErr.message });
      }

      const record = await prisma.student.create({
        data: {
          tenantId: req.user.tenantId,
          studentIdCode: item.studentIdCode || item.student_id || item.id || null,
          name: item.name,
          imageUrl: item.imageUrl || item.image_url || null,
          embedding: embeddingBuffer,
        },
      });

      createdRecords.push(formatStudent(record));
    }

    return res.status(201).json({
      message: `Successfully processed ${createdRecords.length} students.`,
      count: createdRecords.length,
      students: createdRecords,
    });
  } catch (err) {
    console.error('Batch upload error:', err);
    return res.status(500).json({ error: 'Failed to process student batch.' });
  }
});

// PUT /api/roster/:id - update student
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, studentIdCode, imageUrl, embedding } = req.body;

    const existing = await prisma.student.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    let embeddingBuffer = existing.embedding;
    if (embedding !== undefined) {
      embeddingBuffer = parseEmbeddingToBuffer(embedding);
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        studentIdCode: studentIdCode !== undefined ? studentIdCode : existing.studentIdCode,
        imageUrl: imageUrl !== undefined ? imageUrl : existing.imageUrl,
        embedding: embeddingBuffer,
      },
    });

    return res.json(formatStudent(updated));
  } catch (err) {
    console.error('Update student error:', err);
    return res.status(500).json({ error: 'Failed to update student.' });
  }
});

// DELETE /api/roster/purge/all - delete all students and attendance for tenant (wipe clean)
router.delete('/purge/all', authenticateToken, async (req, res) => {
  try {
    await prisma.attendance.deleteMany({
      where: { tenantId: req.user.tenantId },
    });
    const deleted = await prisma.student.deleteMany({
      where: { tenantId: req.user.tenantId },
    });
    return res.json({ message: `Purged ${deleted.count} students and all attendance logs.` });
  } catch (err) {
    console.error('Purge roster error:', err);
    return res.status(500).json({ error: 'Failed to purge roster.' });
  }
});

// DELETE /api/roster/:id - delete student
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.student.findFirst({
      where: { id, tenantId: req.user.tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    await prisma.student.delete({
      where: { id },
    });

    return res.json({ message: 'Student deleted successfully.' });
  } catch (err) {
    console.error('Delete student error:', err);
    return res.status(500).json({ error: 'Failed to delete student.' });
  }
});

export default router;
