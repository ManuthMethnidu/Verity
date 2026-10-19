import express from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'verity-super-secret-jwt-key-attendance-2026';

// Provision a new tenant database/record
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Tenant name is required.' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        settings: {
          create: {
            targetFps: 30,
            modelQuality: 'medium',
            batterySaver: false,
            confidenceThreshold: 0.70,
          },
        },
      },
    });

    // Optionally update admin's active tenant
    await prisma.admin.update({
      where: { id: req.user.adminId },
      data: { tenantId: tenant.id },
    });

    // Generate new token with updated tenantId
    const newToken = jwt.sign(
      { adminId: req.user.adminId, tenantId: tenant.id, email: req.user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      tenantId: tenant.id,
      name: tenant.name,
      token: newToken,
      message: 'New tenant created successfully.',
    });
  } catch (err) {
    console.error('Create tenant error:', err);
    return res.status(500).json({ error: 'Failed to create tenant.' });
  }
});

export default router;
