import express from 'express';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/settings - retrieve tenant settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    let settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: req.user.tenantId },
    });

    if (!settings) {
      settings = await prisma.tenantSettings.create({
        data: {
          tenantId: req.user.tenantId,
          targetFps: 30,
          modelQuality: 'medium',
          batterySaver: false,
          confidenceThreshold: 0.70,
        },
      });
    }

    return res.json({
      targetFps: settings.targetFps,
      modelQuality: settings.modelQuality,
      batterySaver: settings.batterySaver,
      confidenceThreshold: settings.confidenceThreshold,
      updatedAt: settings.updatedAt,
    });
  } catch (err) {
    console.error('Fetch settings error:', err);
    return res.status(500).json({ error: 'Failed to retrieve settings.' });
  }
});

// PUT /api/settings - update tenant settings
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { targetFps, modelQuality, batterySaver, confidenceThreshold } = req.body;

    const fps = Number(targetFps) || 30;
    const isBatterySaver = Boolean(batterySaver);
    const validFps = isBatterySaver ? Math.min(fps, 30) : fps;

    const settings = await prisma.tenantSettings.upsert({
      where: { tenantId: req.user.tenantId },
      update: {
        targetFps: [15, 30, 60].includes(validFps) ? validFps : 30,
        modelQuality: ['low', 'medium', 'high'].includes(modelQuality) ? modelQuality : 'medium',
        batterySaver: isBatterySaver,
        confidenceThreshold:
          typeof confidenceThreshold === 'number' ? confidenceThreshold : 0.70,
      },
      create: {
        tenantId: req.user.tenantId,
        targetFps: [15, 30, 60].includes(validFps) ? validFps : 30,
        modelQuality: ['low', 'medium', 'high'].includes(modelQuality) ? modelQuality : 'medium',
        batterySaver: isBatterySaver,
        confidenceThreshold:
          typeof confidenceThreshold === 'number' ? confidenceThreshold : 0.70,
      },
    });

    return res.json({
      message: 'Settings updated successfully.',
      settings: {
        targetFps: settings.targetFps,
        modelQuality: settings.modelQuality,
        batterySaver: settings.batterySaver,
        confidenceThreshold: settings.confidenceThreshold,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (err) {
    console.error('Update settings error:', err);
    return res.status(500).json({ error: 'Failed to update settings.' });
  }
});

export default router;
