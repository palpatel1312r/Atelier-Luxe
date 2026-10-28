import { Router } from 'express';
import { query } from '../db.js';
import { sendEmail } from '../services/email.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Name, email, and message required' });
    }
    const result = await query(
      'INSERT INTO messages (name, email, message, is_read) VALUES (?, ?, ?, 0)',
      [name, email, message]
    );
    await sendEmail({
      to: process.env.MAIL_FROM || 'orders@atelierluxe.com',
      subject: `Contact form: ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });
    res.status(201).json({
      ok: true,
      message: {
        id: result.insertId,
        name,
        email,
        message,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
