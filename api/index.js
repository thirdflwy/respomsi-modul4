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

app.get('/', (req, res) => {
  res.json({ message: 'API Perpustakaan - Responsi Modul 4' });
});

app.get('/api/loans/top-borrowers', async (req, res) => {
  try {
    const query = `
      SELECT 
        m.id AS member_id,
        m.name AS full_name,
        m.email,
        'STUDENT' AS member_type,
        COUNT(l.id) AS total_loans,
        MAX(l.loan_date) AS last_loan_date,
        (
          SELECT b2.title
          FROM loans l2
          JOIN books b2 ON l2.book_id = b2.id
          WHERE l2.member_id = m.id
          GROUP BY b2.title
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ) AS favorite_book_title,
        (
          SELECT COUNT(*)
          FROM loans l3
          JOIN books b3 ON l3.book_id = b3.id
          WHERE l3.member_id = m.id
          AND b3.title = (
            SELECT b4.title
            FROM loans l4
            JOIN books b4 ON l4.book_id = b4.id
            WHERE l4.member_id = m.id
            GROUP BY b4.title
            ORDER BY COUNT(*) DESC
            LIMIT 1
          )
        ) AS favorite_book_count
      FROM members m
      JOIN loans l ON m.id = l.member_id
      GROUP BY m.id, m.name, m.email
      ORDER BY total_loans DESC
      LIMIT 3;
    `;

    const result = await pool.query(query);

    const data = result.rows.map((row) => ({
      member_id: row.member_id,
      full_name: row.full_name,
      email: row.email,
      member_type: row.member_type,
      total_loans: parseInt(row.total_loans),
      last_loan_date: row.last_loan_date,
      favorite_book: {
        title: row.favorite_book_title,
        times_borrowed: parseInt(row.favorite_book_count)
      }
    }));

    res.status(200).json({
      message: 'Top 3 peminjam buku berhasil diambil',
      data: data
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