
const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');

const app = express();
const port = 3000;

// 讓前端 http://localhost:8080 可以連線
app.use(cors());
app.use(express.json());

// MariaDB 連線池
const pool = mariadb.createPool({
  host: 'localhost',
  user: 'climbapp',
  password: 'climbapp',
  database: 'climbing_app',
  connectionLimit: 5
});

// app.get('/api/members', (req, res) => {
//   res.json([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
// });

app.get('/api/staff', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const rows = await conn.query(`SELECT eid, name, role 
                                  FROM staff ORDER BY eid`);
    conn.release();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  }
});

// ------------------------------------
// 1. 取得所有會員（GET）
// ------------------------------------
app.get('/api/members', async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const rows = await conn.query('SELECT * FROM members');
    conn.release();
    res.json(rows);
  } catch (err) {
    res.status(500).send(err);
  }
});

// ------------------------------------
// 2. 新增會員（POST）
// ------------------------------------
app.post('/api/members', async (req, res) => {
  const { name, age } = req.body;
  try {
    const conn = await pool.getConnection();
    const result = await conn.query(
      'INSERT INTO members(name, age) VALUES (?, ?)',
      [name, age]
    );
    conn.release();
    res.json({ id: result.insertId, name, age });
  } catch (err) {
    res.status(500).send(err);
  }
});

// ------------------------------------
// 3. 修改會員（PUT）
// ------------------------------------
app.put('/api/members/:id', async (req, res) => {
  const { id } = req.params;
  const { name, age } = req.body;

  try {
    const conn = await pool.getConnection();
    await conn.query(
      'UPDATE members SET name = ?, age = ? WHERE id = ?',
      [name, age, id]
    );
    conn.release();

    res.json({ id, name, age });
  } catch (err) {
    res.status(500).send(err);
  }
});

// ------------------------------------
// 4. 刪除會員（DELETE）
// ------------------------------------
app.delete('/api/members/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const conn = await pool.getConnection();
    await conn.query('DELETE FROM members WHERE id = ?', [id]);
    conn.release();

    res.json({ message: 'deleted', id });
  } catch (err) {
    res.status(500).send(err);
  }
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
