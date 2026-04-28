const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'API Perpustakaan - Responsi Modul 4' });
});

// ENDPOINT UTAMA
app.get('/api/loans/top-borrowers', async (req, res) => {
  try {
    const query = `
      SELECT 
        m.id AS member_id,
        m.name,
        m.email,
        m.phone,
        m.address,
        m.created_at AS member_since,
        COUNT(l.id) AS total_pinjaman,
        (
          SELECT b2.title
          FROM loans l2
          JOIN books b2 ON l2.book_id = b2.id
          WHERE l2.member_id = m.id
          GROUP BY b2.title
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) AS buku_favorit,
        MAX(l.loan_date) AS pinjaman_terakhir
      FROM members m
      JOIN loans l ON m.id = l.member_id
      GROUP BY m.id, m.name, m.email, m.phone, m.address, m.created_at
      ORDER BY total_pinjaman DESC
      LIMIT 3;
    `;

    const result = await pool.query(query);

    const topBorrowers = result.rows.map((row, index) => ({
      rank: index + 1,
      member: {
        id: row.member_id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        member_since: row.member_since
      },
      total_pinjaman: parseInt(row.total_pinjaman),
      buku_favorit: row.buku_favorit,
      pinjaman_terakhir: row.pinjaman_terakhir
    }));

    res.status(200).json({
      success: true,
      message: 'Top 3 Peminjam berhasil diambil',
      data: topBorrowers
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di port ${PORT}`));

module.exports = app;