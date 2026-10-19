import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'verity-super-secret-jwt-key-attendance-2026';

// Register a new tenant & admin
router.post('/register', async (req, res) => {
  try {
    const { email, password, tenantName } = req.body;

    if (!email || !password || !tenantName) {
      return res.status(400).json({ error: 'Email, password, and tenantName are required.' });
    }

    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (existingAdmin) {
      return res.status(409).json({ error: 'An admin with this email already exists.' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
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

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const admin = await prisma.admin.create({
      data: {
        email,
        passwordHash,
        tenantId: tenant.id,
      },
    });

    const token = jwt.sign(
      { adminId: admin.id, tenantId: tenant.id, email: admin.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      tenantId: tenant.id,
      admin: {
        id: admin.id,
        email: admin.email,
        tenantName: tenant.name,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { adminId: admin.id, tenantId: admin.tenantId, email: admin.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      tenantId: admin.tenantId,
      admin: {
        id: admin.id,
        email: admin.email,
        tenantName: admin.tenant.name,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get current profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.adminId },
      include: { tenant: true },
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    return res.json({
      admin: {
        id: admin.id,
        email: admin.email,
        tenantId: admin.tenantId,
        tenantName: admin.tenant.name,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch admin profile.' });
  }
});

export default router;
