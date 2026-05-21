const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');

const app = express();
const port = 3000;

// 讓前端 http://localhost:8080 可以連線
app.use(cors());
app.use(express.json());
app.set('json replacer', (key, value) =>
  typeof value === 'bigint' ? value.toString() : value
);

// MariaDB 連線池
const pool = mariadb.createPool({
  host: 'localhost',
  user: 'climbapp',
  password: 'climbapp',
  database: 'climbing_app',
  connectionLimit: 5
});

// 取得所有員工（GET）
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

// 新增員工（POST）
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

    // 檢查身份證是否重複
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
        name, nationality, idcard, gender, birthday, phone,
        household_address, contact_address, email,
        emergency_name, emergency_phone, emergency_telphone, emergency_address,
        emergency_relation, employee_id, employee_status, employee_title, is_active,
        password, note
      ]
    );

    res.json({
      success: true,
      eid: result.insertId
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('STAFF DB error');
  } finally {
    if (conn) conn.release();
  }
});

// 取得所有會員（GET）
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

// 新增會員（POST）
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
    note
  } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();

    // 1. 根據性別決定前綴 (1:男 M, 2:女 W, 其他 O)
    let prefix = 'O';
    const g = Number(gender);
    if (g === 1) prefix = 'M';
    else if (g === 2) prefix = 'W';

    // 2. 查詢該性別目前最大的 member_code
    const rows = await conn.query(
      'SELECT MAX(member_code) as maxCode FROM members WHERE member_code LIKE ?',
      [`${prefix}%`]
    );

    // 取得後 6 位數字部分並加 1
    let nextNum = 1;
    if (rows[0] && rows[0].maxCode) {
      const currentNum = parseInt(rows[0].maxCode.substring(1), 10);
      if (!isNaN(currentNum)) nextNum = currentNum + 1;
    }

    // 3. 生成新的 member_code (例如 M000001)
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
        note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        note
      ]
    );
    
    res.json({ success: true, member_id: result.insertId, name, member_code });
  } catch (err) {
    console.error('新增會員失敗:', err);
    res.status(500).send('DB error');
  } finally {
    if (conn) conn.release();
  }
});

// 修改會員（PUT）
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

// 刪除會員（DELETE）
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

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
  const routeStack = app.router?.stack ?? app._router?.stack ?? [];
  console.log('Routes:', routeStack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`)
  );
});
