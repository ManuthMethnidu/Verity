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
          livenessEnabled: true,
          livenessStrictness: 'standard',
        },
      });
    }

    return res.json({
      targetFps: settings.targetFps,
      modelQuality: settings.modelQuality,
      batterySaver: settings.batterySaver,
      confidenceThreshold: settings.confidenceThreshold,
      livenessEnabled: settings.livenessEnabled,
      livenessStrictness: settings.livenessStrictness,
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
    const {
      targetFps,
      modelQuality,
      batterySaver,
      confidenceThreshold,
      livenessEnabled,
      livenessStrictness,
    } = req.body;

    const fps = Number(targetFps) || 30;
    const isBatterySaver = Boolean(batterySaver);
    const validFps = isBatterySaver ? Math.min(fps, 30) : fps;
    const isLivenessEnabled = livenessEnabled !== undefined ? Boolean(livenessEnabled) : true;
    const validStrictness = ['standard', 'high'].includes(livenessStrictness)
      ? livenessStrictness
      : 'standard';

    const settings = await prisma.tenantSettings.upsert({
      where: { tenantId: req.user.tenantId },
      update: {
        targetFps: [15, 30, 60].includes(validFps) ? validFps : 30,
        modelQuality: ['low', 'medium', 'high'].includes(modelQuality) ? modelQuality : 'medium',
        batterySaver: isBatterySaver,
        confidenceThreshold:
          typeof confidenceThreshold === 'number' ? confidenceThreshold : 0.70,
        livenessEnabled: isLivenessEnabled,
        livenessStrictness: validStrictness,
      },
      create: {
        tenantId: req.user.tenantId,
        targetFps: [15, 30, 60].includes(validFps) ? validFps : 30,
        modelQuality: ['low', 'medium', 'high'].includes(modelQuality) ? modelQuality : 'medium',
        batterySaver: isBatterySaver,
        confidenceThreshold:
          typeof confidenceThreshold === 'number' ? confidenceThreshold : 0.70,
        livenessEnabled: isLivenessEnabled,
        livenessStrictness: validStrictness,
      },
    });

    return res.json({
      message: 'Settings updated successfully.',
      settings: {
        targetFps: settings.targetFps,
        modelQuality: settings.modelQuality,
        batterySaver: settings.batterySaver,
        confidenceThreshold: settings.confidenceThreshold,
        livenessEnabled: settings.livenessEnabled,
        livenessStrictness: settings.livenessStrictness,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (err) {
    console.error('Update settings error:', err);
    return res.status(500).json({ error: 'Failed to update settings.' });
  }
});

export default router;
