const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.set('json replacer', (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
);

const pool = mariadb.createPool({
  host: 'localhost',
  user: 'climbapp',
  password: 'climbapp',
  database: 'climbing_app',
  connectionLimit: 5,
});

app.get('/api/staff', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT eid, name, employee_status, employee_title
      FROM staff
      ORDER BY eid
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/staff/:eid', async (req, res) => {
  const { eid } = req.params;

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT
        eid,
        name,
        nationality,
        idcard,
        gender,
        birthday,
        phone,
        household_address,
        contact_address,
        email,
        emergency_name,
        emergency_phone,
        emergency_telphone,
        emergency_address,
        emergency_relation,
        employee_id,
        employee_status,
        employee_title,
        is_active,
        password,
        note,
        created_at,
        updated_at
      FROM staff
      WHERE eid = ?`,
      [eid]
    );

    if (!rows.length) {
      return res.status(404).send('Staff not found');
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/staff', async (req, res) => {
  const staffFields = [
    'name',
    'nationality',
    'idcard',
    'gender',
    'birthday',
    'phone',
    'household_address',
    'contact_address',
    'email',
    'emergency_name',
    'emergency_phone',
    'emergency_telphone',
    'emergency_address',
    'emergency_relation',
    'employee_id',
    'employee_status',
    'employee_title',
    'is_active',
    'password',
    'note',
  ];
  const requiredFields = staffFields.filter((field) => field !== 'note');

  for (const field of requiredFields) {
    const value = req.body[field];
    if (value === null || value === undefined || value.toString().trim() === '') {
      return res.status(400).send(`缺少必要欄位: ${field}`);
    }
  }

  const {
    name,
    nationality,
    idcard,
    gender,
    birthday,
    phone,
    household_address,
    contact_address,
    email,
    emergency_name,
    emergency_phone,
    emergency_telphone,
    emergency_address,
    emergency_relation,
    employee_id,
    employee_status,
    employee_title,
    is_active,
    password,
    note,
  } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();

    const exist = await conn.query(
      'SELECT eid FROM staff WHERE idcard = ?',
      [idcard]
    );

    if (exist.length > 0) {
      return res.status(400).send('身分證字號已存在');
    }

    const result = await conn.query(
      `INSERT INTO staff (
        name, nationality, idcard, gender, birthday, phone,
        household_address, contact_address, email,
        emergency_name, emergency_phone, emergency_telphone, emergency_address,
        emergency_relation, employee_id, employee_status, employee_title, is_active,
        password, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        nationality,
        idcard,
        gender,
        birthday,
        phone,
        household_address,
        contact_address,
        email,
        emergency_name,
        emergency_phone,
        emergency_telphone,
        emergency_address,
        emergency_relation,
        employee_id,
        employee_status,
        employee_title,
        is_active,
        password,
        note,
      ]
    );

    res.json({
      success: true,
      eid: result.insertId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('STAFF DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/members', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT m.*, COALESCE(active_pass.pass_type, 'single') AS pass_type
      FROM members m
      LEFT JOIN (
        SELECT mp.member_id, mp.pass_type
        FROM member_passes mp
        INNER JOIN (
          SELECT member_id, MAX(pass_id) AS pass_id
          FROM member_passes
          WHERE is_active = 1
          GROUP BY member_id
        ) latest_pass ON latest_pass.pass_id = mp.pass_id
      ) active_pass ON active_pass.member_id = m.member_id
      ORDER BY m.member_id
    `);
    res.json(rows);
  } catch (err) {
    console.error('取得 members 失敗', err);
    res.status(500).send('DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/members', async (req, res) => {
  const {
    name,
    nationality,
    idcard,
    phone,
    birthday,
    gender,
    contact_address,
    email,
    emergency_name,
    emergency_phone,
    emergency_address,
    emergency_relation,
    line_user_id,
    is_active,
    note,
  } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();

    let prefix = 'O';
    const g = Number(gender);
    if (g === 1) prefix = 'M';
    else if (g === 2) prefix = 'W';

    const rows = await conn.query(
      'SELECT MAX(member_code) AS maxCode FROM members WHERE member_code LIKE ?',
      [`${prefix}%`]
    );

    let nextNum = 1;
    if (rows[0] && rows[0].maxCode) {
      const currentNum = parseInt(rows[0].maxCode.substring(1), 10);
      if (!Number.isNaN(currentNum)) {
        nextNum = currentNum + 1;
      }
    }

    const member_code = `${prefix}${String(nextNum).padStart(6, '0')}`;

    const result = await conn.query(
      `INSERT INTO members (
        member_code,
        name,
        nationality,
        idcard,
        phone,
        birthday,
        gender,
        contact_address,
        email,
        emergency_name,
        emergency_phone,
        emergency_address,
        emergency_relation,
        line_user_id,
        is_active,
        note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        member_code,
        name,
        nationality,
        idcard,
        phone,
        birthday,
        gender,
        contact_address,
        email,
        emergency_name,
        emergency_phone,
        emergency_address,
        emergency_relation,
        line_user_id,
        is_active,
        note,
      ]
    );

    res.json({ success: true, member_id: result.insertId, name, member_code });
  } catch (err) {
    console.error('新增 member 失敗', err);
    res.status(500).send('DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.put('/api/members/:id', async (req, res) => {
  const { id } = req.params;
  const { name, age } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      'UPDATE members SET name = ?, age = ? WHERE id = ?',
      [name, age, id]
    );

    res.json({ id, name, age });
  } catch (err) {
    res.status(500).send(err);
  } finally {
    if (conn) conn.release();
  }
});

app.delete('/api/members/:id', async (req, res) => {
  const { id } = req.params;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('DELETE FROM members WHERE id = ?', [id]);

    res.json({ message: 'deleted', id });
  } catch (err) {
    res.status(500).send(err);
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/ticket', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT ticket_id, ticket_code, ticket_name, ticket_price, is_active, note
      FROM ticket
      ORDER BY ticket_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('ticket DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/ticket', async (req, res) => {
  const {
    ticket_code,
    ticket_name,
    ticket_price,
    is_active,
    note,
  } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `INSERT INTO ticket (
        ticket_code,
        ticket_name,
        ticket_price,
        is_active,
        note
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        ticket_code,
        ticket_name,
        ticket_price,
        is_active,
        note,
      ]
    );

    res.json({ success: true, ticket_id: result.insertId, ticket_code, ticket_name });
  } catch (err) {
    console.error('新增 ticket 失敗', err);
    res.status(500).send('DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/ticket/:price', async (req, res) => {
  const { price } = req.params;
  const { ticket_id, ticket_price } = req.body;

  let conn;
  try {
    if (!ticket_id) {
      res.status(400).json({ success: false, message: 'ticket_id is required' });
      return;
    }

    conn = await pool.getConnection();
    await conn.query(
      `UPDATE ticket
       SET ticket_price = ?
       WHERE ticket_id = ?`,
      [ticket_price, ticket_id]
    );

    res.json({ success: true, ticket_id, ticket_price, previous_price: price });
  } catch (err) {
    console.error('更新 ticket 價格失敗', err);
    res.status(500).send('DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/ticket/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `UPDATE ticket
       SET is_active = ?
       WHERE ticket_id = ?`,
      [is_active, id]
    );

    res.json({ success: true, ticket_id: id, is_active });
  } catch (err) {
    console.error('更新 ticket 啟用狀態失敗', err);
    res.status(500).send('DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/rental_equipment', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT rental_id, rental_code, rental_name, rental_price, is_active, note
      FROM rental_equipment
      ORDER BY rental_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('rental_equipment DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/rental_equipment', async (req, res) => {
  const {
    rental_code,
    rental_name,
    rental_price,
    is_active,
    note,
  } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    const result = await conn.query(
      `INSERT INTO rental_equipment (
        rental_code,
        rental_name,
        rental_price,
        is_active,
        note
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        rental_code,
        rental_name,
        rental_price,
        is_active,
        note,
      ]
    );

    res.json({ success: true, rental_id: result.insertId, rental_code, rental_name });
  } catch (err) {
    console.error('新增 rental_equipment 失敗', err);
    res.status(500).send('rental_equipment DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/rental_equipment/:price', async (req, res) => {
  const { price } = req.params;
  const { rental_id, rental_price } = req.body;

  let conn;
  try {
    if (!rental_id) {
      res.status(400).json({ success: false, message: 'rental_id is required' });
      return;
    }

    conn = await pool.getConnection();
    await conn.query(
      `UPDATE rental_equipment
       SET rental_price = ?
       WHERE rental_id = ?`,
      [rental_price, rental_id]
    );

    res.json({ success: true, rental_id, rental_price, previous_price: price });
  } catch (err) {
    console.error('更新 rental_equipment 價格失敗', err);
    res.status(500).send('rental_equipment DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
  const routeStack = app.router?.stack ?? app._router?.stack ?? [];
  console.log('Routes:', routeStack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`)
  );
});
