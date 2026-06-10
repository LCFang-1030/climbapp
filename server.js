const express = require('express');
const cors = require('cors');
const mariadb = require('mariadb');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;
const BCRYPT_SALT_ROUNDS = 10;

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

function isBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$/.test(String(value ?? ''));
}

async function verifyStaffPassword(storedPassword, inputPassword) {
  const normalizedStoredPassword = String(storedPassword ?? '');
  const normalizedInputPassword = String(inputPassword ?? '');

  if (!isBcryptHash(normalizedStoredPassword)) {
    return false;
  }

  return bcrypt.compare(normalizedInputPassword, normalizedStoredPassword);
}

async function isDefaultStaffPassword(staff, inputPassword) {
  const defaultPassword = String(staff?.employee_id ?? '');
  const normalizedInputPassword = String(inputPassword ?? '');

  if (!defaultPassword || normalizedInputPassword !== defaultPassword) {
    return false;
  }

  return verifyStaffPassword(staff?.password, normalizedInputPassword);
}

app.post('/api/staff/login', async (req, res) => {
  const { employee_id: employeeId, password } = req.body;

  if (!employeeId || !password) {
    return res.status(400).send('請輸入員工編號與密碼');
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT eid, employee_id, alias, employee_title, password, is_active
       FROM staff
       WHERE employee_id = ?`,
      [employeeId]
    );

    if (!rows.length) {
      return res.status(401).send('員工編號或密碼錯誤');
    }

    const staff = rows[0];
    const passwordMatched = await verifyStaffPassword(staff.password, password);

    if (!passwordMatched) {
      return res.status(401).send('員工編號或密碼錯誤');
    }

    if (Number(staff.is_active) !== 1) {
      return res.status(403).send('此帳號尚未啟用');
    }

    res.json({
      eid: staff.eid,
      employee_id: staff.employee_id,
      alias: staff.alias,
      employee_title: staff.employee_title,
      is_default_password: await isDefaultStaffPassword(staff, password),
    });
  } catch (err) {
    console.error('staff login error', err);
    res.status(500).send('staff login DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/staff/:eid/change-password', async (req, res) => {
  const staffId = Number(req.params.eid);
  const currentPassword = String(req.body.current_password ?? '');
  const newPassword = String(req.body.new_password ?? '');

  if (!staffId) {
    return res.status(400).send('缺少員工編號');
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).send('請輸入目前密碼與新密碼');
  }

  if (currentPassword === newPassword) {
    return res.status(400).send('新密碼不可與目前密碼相同');
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT eid, employee_id, password, is_active
       FROM staff
       WHERE eid = ?`,
      [staffId]
    );

    if (!rows.length) {
      return res.status(404).send('找不到員工資料');
    }

    const staff = rows[0];

    if (Number(staff.is_active) !== 1) {
      return res.status(403).send('此帳號尚未啟用');
    }

    const passwordMatched = await verifyStaffPassword(staff.password, currentPassword);

    if (!passwordMatched) {
      return res.status(401).send('目前密碼輸入錯誤');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await conn.query(
      `UPDATE staff
       SET password = ?
       WHERE eid = ?`,
      [hashedNewPassword, staffId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('change password error', err);
    res.status(500).send('change password DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/staff/:eid/verify-password', async (req, res) => {
  const staffId = Number(req.params.eid);
  const currentPassword = String(req.body.current_password ?? '');

  if (!staffId) {
    return res.status(400).send('缺少員工編號');
  }

  if (!currentPassword) {
    return res.status(400).send('請輸入目前密碼');
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT eid, password, is_active
       FROM staff
       WHERE eid = ?`,
      [staffId]
    );

    if (!rows.length) {
      return res.status(404).send('找不到員工資料');
    }

    const staff = rows[0];

    if (Number(staff.is_active) !== 1) {
      return res.status(403).send('此帳號尚未啟用');
    }

    const passwordMatched = await verifyStaffPassword(staff.password, currentPassword);

    if (!passwordMatched) {
      return res.status(401).send('目前密碼輸入錯誤');
    }

    res.json({ success: true });
  } catch (err) {
    console.error('verify password error', err);
    res.status(500).send('verify password DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/staff', async (req, res) => {
  const staffFields = [
    'name',
    'alias',
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
    'employee_status',
    'employee_title',
    'is_active',
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
    alias,
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
    employee_status,
    employee_title,
    is_active,
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
      return res.status(400).send('身分證字號已經註冊過');
    }

    const nextIdRows = await conn.query(
      `SELECT AUTO_INCREMENT
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff'`
    );
    const nextEid = Number(nextIdRows[0]?.AUTO_INCREMENT);
    const employeeId = `${employee_title}${gender}${String(nextEid).padStart(4, '0')}`;
    const hashedDefaultPassword = await bcrypt.hash(employeeId, BCRYPT_SALT_ROUNDS);

    const result = await conn.query(
      `INSERT INTO staff (
        name, alias, nationality, idcard, gender, birthday, phone,
        household_address, contact_address, email,
        emergency_name, emergency_phone, emergency_telphone, emergency_address,
        emergency_relation, employee_id, employee_status, employee_title, is_active,
        password, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        alias,
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
        employeeId,
        employee_status,
        employee_title,
        is_active,
        hashedDefaultPassword,
        note,
      ]
    );

    const eid = Number(result.insertId);

    res.json({
      success: true,
      eid,
      employee_id: employeeId,
    });
  } catch (err) {
    console.error('staff create error', err);
    res.status(500).send('STAFF DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/staff', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT eid, name, alias, employee_id, employee_status, employee_title
      FROM staff
      ORDER BY eid
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('staff DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/staff/login', async (req, res) => {
  const { employee_id: employeeId, password } = req.body;

  if (!employeeId || !password) {
    return res.status(400).send('請輸入員工編號與密碼');
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT eid, employee_id, alias, employee_title, password, is_active
       FROM staff
       WHERE employee_id = ?`,
      [employeeId]
    );

    if (!rows.length) {
      return res.status(401).send('帳號或密碼錯誤');
    }

    const staff = rows[0];

    if (String(staff.password) !== String(password)) {
      return res.status(401).send('帳號或密碼錯誤');
    }

    if (Number(staff.is_active) !== 1) {
      return res.status(403).send('此帳號已停用');
    }

    res.json({
      eid: staff.eid,
      employee_id: staff.employee_id,
      alias: staff.alias,
      employee_title: staff.employee_title,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('staff login DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/staff/:eid/change-password', async (req, res) => {
  const staffId = Number(req.params.eid);
  const currentPassword = String(req.body.current_password ?? '');
  const newPassword = String(req.body.new_password ?? '');

  if (!staffId) {
    return res.status(400).send('無效的員工編號');
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).send('請輸入目前密碼與新密碼');
  }

  if (currentPassword === newPassword) {
    return res.status(400).send('新密碼不可與目前密碼相同');
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT eid, password, is_active
       FROM staff
       WHERE eid = ?`,
      [staffId]
    );

    if (!rows.length) {
      return res.status(404).send('找不到員工帳號');
    }

    const staff = rows[0];

    if (Number(staff.is_active) !== 1) {
      return res.status(403).send('此帳號已停用');
    }

    if (String(staff.password) !== currentPassword) {
      return res.status(401).send('目前密碼輸入錯誤');
    }

    await conn.query(
      `UPDATE staff
       SET password = ?
       WHERE eid = ?`,
      [newPassword, staffId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('change password error', err);
    res.status(500).send('change password DB error');
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
        alias,
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

app.get('/api/staff_schedule', async (req, res) => {
  const month = String(req.query.month ?? '').trim();

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ success: false, message: 'month must be YYYY-MM' });
  }

  const monthStart = `${month}-01`;

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT
        ss.schedule_id,
        ss.staff_id,
        s.name AS staff_name,
        s.alias AS staff_alias,
        s.employee_id,
        DATE_FORMAT(ss.work_date, '%Y-%m-%d') AS work_date,
        TIME_FORMAT(ss.start_time, '%H:%i') AS start_time,
        TIME_FORMAT(ss.end_time, '%H:%i') AS end_time,
        ss.schedule_type,
        ss.is_active,
        ss.note,
        ss.created_by,
        creator.name AS created_by_name,
        creator.alias AS created_by_alias,
        ss.created_at,
        ss.updated_at
      FROM staff_schedule ss
      INNER JOIN staff s ON s.eid = ss.staff_id
      LEFT JOIN staff creator ON creator.eid = ss.created_by
      WHERE ss.work_date >= ?
        AND ss.work_date < DATE_ADD(?, INTERVAL 1 MONTH)
      ORDER BY ss.work_date, ss.start_time, ss.schedule_id`,
      [monthStart, monthStart]
    );

    res.json(rows);
  } catch (err) {
    console.error('staff_schedule fetch error', err);
    res.status(500).send('staff_schedule DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/staff_schedule/:scheduleId', async (req, res) => {
  const scheduleId = Number(req.params.scheduleId);

  if (!scheduleId) {
    return res.status(400).json({ success: false, message: 'Invalid schedule id' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT
        ss.schedule_id,
        ss.staff_id,
        s.name AS staff_name,
        s.alias AS staff_alias,
        s.employee_id,
        DATE_FORMAT(ss.work_date, '%Y-%m-%d') AS work_date,
        TIME_FORMAT(ss.start_time, '%H:%i') AS start_time,
        TIME_FORMAT(ss.end_time, '%H:%i') AS end_time,
        ss.schedule_type,
        ss.is_active,
        ss.note,
        ss.created_by,
        creator.name AS created_by_name,
        creator.alias AS created_by_alias,
        ss.created_at,
        ss.updated_at
      FROM staff_schedule ss
      INNER JOIN staff s ON s.eid = ss.staff_id
      LEFT JOIN staff creator ON creator.eid = ss.created_by
      WHERE ss.schedule_id = ?`,
      [scheduleId]
    );

    if (!rows.length) {
      return res.status(404).send('Schedule not found');
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('staff_schedule detail error', err);
    res.status(500).send('staff_schedule DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/bulletin_board', async (req, res) => {
  const includeInactive = String(req.query.includeInactive ?? '') === '1';

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT
        bb.id,
        bb.content,
        bb.status,
        bb.created_by,
        bb.updated_by,
        bb.is_active,
        bb.created_at,
        bb.updated_at,
        creator.name AS created_by_name,
        creator.alias AS created_by_alias,
        updater.name AS updated_by_name,
        updater.alias AS updated_by_alias
      FROM bulletin_board bb
      INNER JOIN staff creator ON creator.eid = bb.created_by
      LEFT JOIN staff updater ON updater.eid = bb.updated_by
      ${includeInactive ? '' : 'WHERE bb.is_active = 1'}
      ORDER BY
        CASE WHEN bb.status = 4 THEN 0 ELSE 1 END,
        bb.updated_at DESC,
        bb.id DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error('bulletin_board fetch error', err);
    res.status(500).send('bulletin_board DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/bulletin_board', async (req, res) => {
  const content = String(req.body.content ?? '').trim();
  const createdBy = Number(req.body.created_by);
  const status = Number(req.body.status) === 4 ? 4 : 1;
  const isActive = Number(req.body.is_active) === 0 ? 0 : 1;

  if (!content) {
    return res.status(400).json({ success: false, message: 'content is required' });
  }

  if (!createdBy) {
    return res.status(400).json({ success: false, message: 'created_by is required' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const staffRows = await conn.query(
      'SELECT eid FROM staff WHERE eid = ?',
      [createdBy]
    );

    if (!staffRows.length) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    const result = await conn.query(
      `INSERT INTO bulletin_board (
        content,
        status,
        created_by,
        is_active
      ) VALUES (?, ?, ?, ?)`,
      [content, status, createdBy, isActive]
    );

    res.json({
      success: true,
      id: Number(result.insertId),
      content,
      status,
      created_by: createdBy,
      is_active: isActive,
    });
  } catch (err) {
    console.error('bulletin_board create error', err);
    res.status(500).send('bulletin_board DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.patch('/api/bulletin_board/:id', async (req, res) => {
  const bulletinId = Number(req.params.id);
  const content = String(req.body.content ?? '').trim();
  const status = Number(req.body.status);
  const updatedBy = Number(req.body.updated_by);
  const isActive = Number(req.body.is_active) === 0 ? 0 : 1;

  if (!bulletinId) {
    return res.status(400).json({ success: false, message: 'Invalid bulletin id' });
  }

  if (!content) {
    return res.status(400).json({ success: false, message: 'content is required' });
  }

  if (![1, 2, 3, 4].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be 1, 2, 3, or 4' });
  }

  if (!updatedBy) {
    return res.status(400).json({ success: false, message: 'updated_by is required' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const staffRows = await conn.query(
      'SELECT eid FROM staff WHERE eid = ?',
      [updatedBy]
    );

    if (!staffRows.length) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    const existingRows = await conn.query(
      'SELECT id FROM bulletin_board WHERE id = ?',
      [bulletinId]
    );

    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: 'Bulletin not found' });
    }

    await conn.query(
      `UPDATE bulletin_board
       SET content = ?,
           status = ?,
           updated_by = ?,
           is_active = ?
       WHERE id = ?`,
      [content, status, updatedBy, isActive, bulletinId]
    );

    res.json({
      success: true,
      id: bulletinId,
      content,
      status,
      updated_by: updatedBy,
      is_active: isActive,
    });
  } catch (err) {
    console.error('bulletin_board update error', err);
    res.status(500).send('bulletin_board DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/staff_schedule', async (req, res) => {
  const staffId = Number(req.body.staff_id);
  const workDate = String(req.body.work_date ?? '').trim();
  const startTime = String(req.body.start_time ?? '').trim();
  const endTime = String(req.body.end_time ?? '').trim();
  const isActive = Number(req.body.is_active) === 0 ? 0 : 1;
  const createdByRaw = req.body.created_by;
  const createdBy = createdByRaw === null || createdByRaw === undefined || createdByRaw === ''
    ? null
    : Number(createdByRaw);
  const note = req.body.note === null || req.body.note === undefined
    ? null
    : String(req.body.note).trim();
  const scheduleType = req.body.schedule_type === null || req.body.schedule_type === undefined || req.body.schedule_type === ''
    ? 1
    : Number(req.body.schedule_type);

  if (!staffId) {
    return res.status(400).json({ success: false, message: 'staff_id is required' });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    return res.status(400).json({ success: false, message: 'work_date must be YYYY-MM-DD' });
  }

  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
    return res.status(400).json({ success: false, message: 'start_time and end_time must be HH:mm' });
  }

  if (startTime >= endTime) {
    return res.status(400).json({ success: false, message: 'start_time must be earlier than end_time' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    const staffRows = await conn.query(
      'SELECT eid FROM staff WHERE eid = ?',
      [staffId]
    );

    if (!staffRows.length) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }

    if (createdBy !== null) {
      const creatorRows = await conn.query(
        'SELECT eid FROM staff WHERE eid = ?',
        [createdBy]
      );

      if (!creatorRows.length) {
        return res.status(404).json({ success: false, message: 'Creator not found' });
      }
    }

    const result = await conn.query(
      `INSERT INTO staff_schedule (
        staff_id,
        work_date,
        start_time,
        end_time,
        schedule_type,
        is_active,
        note,
        created_by
      ) VALUES (?, STR_TO_DATE(?, '%Y-%m-%d'), ?, ?, ?, ?, ?, ?)`,
      [staffId, workDate, startTime, endTime, scheduleType, isActive, note, createdBy]
    );

    res.json({
      success: true,
      schedule_id: Number(result.insertId),
    });
  } catch (err) {
    console.error('staff_schedule create error', err);
    res.status(500).send('staff_schedule DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/staff', async (req, res) => {
  const staffFields = [
    'name',
    'alias',
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
    'employee_status',
    'employee_title',
    'is_active',
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
    alias,
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
    employee_status,
    employee_title,
    is_active,
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

    const nextIdRows = await conn.query(
      `SELECT AUTO_INCREMENT
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff'`
    );
    const nextEid = Number(nextIdRows[0]?.AUTO_INCREMENT);
    const employeeId = `${employee_title}${gender}${String(nextEid).padStart(4, '0')}`;

    const result = await conn.query(
      `INSERT INTO staff (
        name, alias, nationality, idcard, gender, birthday, phone,
        household_address, contact_address, email,
        emergency_name, emergency_phone, emergency_telphone, emergency_address,
        emergency_relation, employee_id, employee_status, employee_title, is_active,
        password, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        alias,
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
        employeeId,
        employee_status,
        employee_title,
        is_active,
        employeeId,
        note,
      ]
    );

    const eid = Number(result.insertId);

    res.json({
      success: true,
      eid,
      employee_id: employeeId,
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
      SELECT m.*, COALESCE(active_pass.pass_type, '單次票券') AS pass_type
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
    signature_data,
  } = req.body;

  if (!signature_data || signature_data.toString().trim() === '') {
    return res.status(400).send('請提供手寫簽名');
  }

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
        note,
        signature_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        signature_data,
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
  const activeOnly = String(req.query.activeOnly ?? '') === '1';

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT
        t.ticket_id,
        t.ticket_code,
        t.ticket_name,
        t.ticket_price,
        t.category_id,
        tc.category_code,
        tc.category_name,
        t.is_active,
        t.note
      FROM ticket t
      LEFT JOIN ticket_category tc ON tc.category_id = t.category_id
      ${activeOnly ? 'WHERE t.is_active = 1' : ''}
      ORDER BY t.ticket_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('ticket DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/ticket_category', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT category_id, category_code, category_name
      FROM ticket_category
      ORDER BY category_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('ticket_category DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/ticket', async (req, res) => {
  const {
    ticket_name,
    ticket_price,
    category_id,
    is_active,
    note,
  } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT COALESCE(MAX(ticket_id), 0) + 1 AS nextTicketId FROM ticket'
    );
    const nextTicketId = Number(rows[0]?.nextTicketId ?? 1);
    const ticket_code = `TK${String(nextTicketId).padStart(4, '0')}`;

    const result = await conn.query(
      `INSERT INTO ticket (
        ticket_code,
        ticket_name,
        ticket_price,
        category_id,
        is_active,
        note
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ticket_code,
        ticket_name,
        ticket_price,
        category_id,
        is_active,
        note,
      ]
    );

    res.json({
      success: true,
      ticket_id: result.insertId,
      ticket_code,
      ticket_name,
      category_id,
    });
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
  const activeOnly = String(req.query.activeOnly ?? '') === '1';

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT
        r.rental_id,
        r.rental_code,
        r.rental_name,
        r.rental_price,
        r.category_id,
        rc.category_code,
        rc.category_name,
        r.is_active,
        r.note
      FROM rental_equipment r
      LEFT JOIN rental_equipment_category rc ON rc.category_id = r.category_id
      ${activeOnly ? 'WHERE r.is_active = 1' : ''}
      ORDER BY r.rental_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('rental_equipment DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/rental_equipment_category', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT category_id, category_code, category_name
      FROM rental_equipment_category
      ORDER BY category_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('rental_equipment_category DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/rental_equipment', async (req, res) => {
  const {
    rental_name,
    rental_price,
    category_id,
    is_active,
    note,
  } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT COALESCE(MAX(rental_id), 0) + 1 AS nextRentalId FROM rental_equipment'
    );
    const nextRentalId = Number(rows[0]?.nextRentalId ?? 1);
    const rental_code = `REN${String(nextRentalId).padStart(4, '0')}`;

    const result = await conn.query(
      `INSERT INTO rental_equipment (
        rental_code,
        rental_name,
        rental_price,
        category_id,
        is_active,
        note
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        rental_code,
        rental_name,
        rental_price,
        category_id,
        is_active,
        note,
      ]
    );

    res.json({
      success: true,
      rental_id: result.insertId,
      rental_code,
      rental_name,
      category_id,
    });
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

app.post('/api/rental_equipment/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `UPDATE rental_equipment
       SET is_active = ?
       WHERE rental_id = ?`,
      [is_active, id]
    );

    res.json({ success: true, rental_id: id, is_active });
  } catch (err) {
    console.error('更新 rental_equipment 啟用狀態失敗', err);
    res.status(500).send('rental_equipment DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/product', async (req, res) => {
  const activeOnly = String(req.query.activeOnly ?? '') === '1';

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT
        p.product_id,
        p.product_code,
        p.product_name,
        p.product_price,
        p.category_id,
        pc.category_code,
        pc.category_name,
        p.stock_qty,
        p.is_active,
        p.note
      FROM product p
      LEFT JOIN product_category pc ON pc.category_id = p.category_id
      ${activeOnly ? 'WHERE p.is_active = 1' : ''}
      ORDER BY p.product_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('product DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/product_category', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT category_id, category_code, category_name
      FROM product_category
      ORDER BY category_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('product_category DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/member_activities_legacy_disabled', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();

    const categories = await conn.query(`
      SELECT category_id, category_code, category_name
      FROM activity_categories
      WHERE is_active = 1
      ORDER BY category_id
    `);

    const promotions = await conn.query(`
      SELECT
        p.promotion_id,
        p.category_id,
        p.promotion_name,
        p.start_time,
        p.end_time,
        pr.rule_id,
        pr.discount_type,
        pr.discount_value
      FROM promotions p
      LEFT JOIN promotion_rules pr ON pr.promotion_id = p.promotion_id
      WHERE p.is_active = 1
      ORDER BY p.category_id, p.promotion_id, pr.rule_id
    `);

    const giftCampaigns = await conn.query(`
      SELECT
        gc.gift_campaign_id,
        gc.category_id,
        gc.campaign_name,
        gc.start_time,
        gc.end_time,
        gi.gift_item_id,
        gi.gift_name,
        gi.total_qty,
        gi.remaining_qty,
        gi.limit_per_member
      FROM gift_campaigns gc
      LEFT JOIN gift_items gi ON gi.gift_campaign_id = gc.gift_campaign_id
      WHERE gc.is_active = 1
      ORDER BY gc.category_id, gc.gift_campaign_id, gi.gift_item_id
    `);

    const formatDateTime = (value) => {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleString('zh-TW', {
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const formatPercentDiscountText = (value) => {
      const amount = Number(value ?? 0);
      if (amount <= 0) return '折扣活動';
      const discountNumber = amount * 100;
      return Number.isInteger(discountNumber) && discountNumber % 10 === 0
        ? `${discountNumber / 10} 折`
        : `${discountNumber} 折`;
    };

    const formatDiscountText = (type, value) => {
      const amount = Number(value ?? 0);
      if (type === 'amount') return `折抵 ${amount.toLocaleString('zh-TW')} 元`;
      if (type === 'percent') return formatPercentDiscountText(amount);
      if (type === 'fixed') return `固定成 ${amount.toLocaleString('zh-TW')} 元`;
      return '優惠活動';
    };

    const formatPeriodText = (startTime, endTime) => {
      const startLabel = formatDateTime(startTime);
      const endLabel = formatDateTime(endTime);
      if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
      if (startLabel) return `${startLabel} 起`;
      if (endLabel) return `至 ${endLabel}`;
      return '';
    };

    const promotionsByCategoryId = promotions.reduce((map, promotion) => {
      const categoryId = Number(promotion.category_id);
      const promotionId = Number(promotion.promotion_id);
      const list = map.get(categoryId) ?? [];

      if (!list.some((item) => item.activity_id === promotionId)) {
        const discountText = formatDiscountText(promotion.discount_type, promotion.discount_value);
        const periodText = formatPeriodText(promotion.start_time, promotion.end_time);
        list.push({
          key: `promotion-${promotionId}`,
          activity_id: promotionId,
          label: promotion.promotion_name,
          description: periodText ? `${discountText} | ${periodText}` : discountText,
          type: String(promotion.discount_type ?? 'none'),
          value: Number(promotion.discount_value ?? 0),
          selectable: true,
        });
      }

      map.set(categoryId, list);
      return map;
    }, new Map());

    const formatGiftItemText = (item) => {
      const details = [`數量 ${Number(item.remaining_qty ?? 0).toLocaleString('zh-TW')} / ${Number(item.total_qty ?? 0).toLocaleString('zh-TW')}`];
      if (item.limit_per_member != null) details.push(`每次限額 ${Number(item.limit_per_member)} 個`);
      return `${item.gift_name} (${details.join(' | ')})`;
    };

    const giftsByCategoryId = giftCampaigns.reduce((map, campaign) => {
      const categoryId = Number(campaign.category_id);
      const campaignId = Number(campaign.gift_campaign_id);
      const list = map.get(categoryId) ?? [];
      let entry = list.find((item) => item.activity_id === campaignId);

      if (!entry) {
        entry = {
          key: `gift-${campaignId}`,
          activity_id: campaignId,
          label: campaign.campaign_name,
          description: formatPeriodText(campaign.start_time, campaign.end_time),
          type: 'gift',
          selectable: false,
          gift_items: [],
        };
        list.push(entry);
      }

      if (campaign.gift_item_id != null) {
        entry.gift_items.push({
          gift_item_id: Number(campaign.gift_item_id),
          gift_name: campaign.gift_name,
          total_qty: Number(campaign.total_qty ?? 0),
          remaining_qty: Number(campaign.remaining_qty ?? 0),
          limit_per_member: campaign.limit_per_member == null ? null : Number(campaign.limit_per_member),
          summary: formatGiftItemText(campaign),
        });
      }

      map.set(categoryId, list);
      return map;
    }, new Map());

    res.json(
      categories.map((category) => ({
        category_id: Number(category.category_id),
        category_code: category.category_code,
        category_name: category.category_name,
        promotions: [
          ...(promotionsByCategoryId.get(Number(category.category_id)) ?? []),
          ...(giftsByCategoryId.get(Number(category.category_id)) ?? []),
        ],
      }))
    );
  } catch (err) {
    console.error('member_activities DB error', err);
    res.status(500).send('member_activities DB error');
  } finally {
    if (conn) conn.release();
  }
});

const formatActivityDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-TW', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPercentDiscountText = (value) => {
  const amount = Number(value ?? 0);
  if (amount <= 0) return '折扣活動';
  const discountNumber = amount * 100;
  return Number.isInteger(discountNumber) && discountNumber % 10 === 0
    ? `${discountNumber / 10} 折`
    : `${discountNumber} 折`;
};

const formatDiscountText = (type, value) => {
  const amount = Number(value ?? 0);
  if (type === 'amount') return `折抵 ${amount.toLocaleString('zh-TW')} 元`;
  if (type === 'percent') return formatPercentDiscountText(amount);
  if (type === 'fixed') return `固定價格 ${amount.toLocaleString('zh-TW')} 元`;
  return '折扣活動';
};

const formatActivityPeriodText = (startTime, endTime) => {
  const startLabel = formatActivityDateTime(startTime);
  const endLabel = formatActivityDateTime(endTime);
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  if (startLabel) return `${startLabel} 起`;
  if (endLabel) return `至 ${endLabel}`;
  return '';
};

const formatGiftItemText = (item) => {
  const details = [
    `剩餘 ${Number(item.remaining_qty ?? 0).toLocaleString('zh-TW')} / ${Number(item.total_qty ?? 0).toLocaleString('zh-TW')}`,
  ];
  if (item.limit_per_member != null) details.push(`每會員上限 ${Number(item.limit_per_member)} 份`);
  return `${item.gift_name} (${details.join(' | ')})`;
};

async function getActivityManagementRows(conn, { activeOnly = false } = {}) {
  const categoryWhere = activeOnly ? 'WHERE is_active = 1' : '';
  const promotionWhere = activeOnly ? 'WHERE p.is_active = 1' : '';
  const giftWhere = activeOnly ? 'WHERE gc.is_active = 1' : '';

  const categories = await conn.query(`
    SELECT category_id, category_code, category_name, is_active
    FROM activity_categories
    ${categoryWhere}
    ORDER BY category_id
  `);

  const promotions = await conn.query(`
    SELECT
      p.promotion_id,
      p.category_id,
      p.promotion_name,
      p.start_time,
      p.end_time,
      p.is_active,
      pr.rule_id,
      pr.discount_type,
      pr.discount_value
    FROM promotions p
    LEFT JOIN promotion_rules pr ON pr.promotion_id = p.promotion_id
    ${promotionWhere}
    ORDER BY p.category_id, p.promotion_id, pr.rule_id
  `);

  const giftCampaigns = await conn.query(`
    SELECT
      gc.gift_campaign_id,
      gc.category_id,
      gc.campaign_name,
      gc.start_time,
      gc.end_time,
      gc.is_active,
      gi.gift_item_id,
      gi.gift_name,
      gi.total_qty,
      gi.remaining_qty,
      gi.limit_per_member
    FROM gift_campaigns gc
    LEFT JOIN gift_items gi ON gi.gift_campaign_id = gc.gift_campaign_id
    ${giftWhere}
    ORDER BY gc.category_id, gc.gift_campaign_id, gi.gift_item_id
  `);

  const promotionsByCategoryId = promotions.reduce((map, promotion) => {
    const categoryId = Number(promotion.category_id);
    const promotionId = Number(promotion.promotion_id);
    const list = map.get(categoryId) ?? [];

    if (!list.some((item) => item.id === promotionId)) {
      const discountText = formatDiscountText(promotion.discount_type, promotion.discount_value);
      const periodText = formatActivityPeriodText(promotion.start_time, promotion.end_time);
      list.push({
        id: promotionId,
        key: `promotion-${promotionId}`,
        activity_id: promotionId,
        category_id: categoryId,
        title: promotion.promotion_name,
        subtitle: periodText || '未設定活動期間',
        summary: periodText ? `${discountText} | ${periodText}` : discountText,
        description: periodText ? `${discountText} | ${periodText}` : discountText,
        type: 'promotion',
        discount_type: String(promotion.discount_type ?? 'none'),
        discount_value: Number(promotion.discount_value ?? 0),
        selectable: true,
        is_active: Number(promotion.is_active ?? 0),
        rule_id: promotion.rule_id == null ? null : Number(promotion.rule_id),
        start_time: promotion.start_time,
        end_time: promotion.end_time,
      });
    }

    map.set(categoryId, list);
    return map;
  }, new Map());

  const giftsByCategoryId = giftCampaigns.reduce((map, campaign) => {
    const categoryId = Number(campaign.category_id);
    const campaignId = Number(campaign.gift_campaign_id);
    const list = map.get(categoryId) ?? [];
    let entry = list.find((item) => item.id === campaignId);

    if (!entry) {
      entry = {
        id: campaignId,
        key: `gift-${campaignId}`,
        activity_id: campaignId,
        category_id: categoryId,
        title: campaign.campaign_name,
        subtitle: formatActivityPeriodText(campaign.start_time, campaign.end_time) || '未設定活動期間',
        summary: '贈品活動',
        description: formatActivityPeriodText(campaign.start_time, campaign.end_time),
        type: 'gift',
        selectable: false,
        is_active: Number(campaign.is_active ?? 0),
        start_time: campaign.start_time,
        end_time: campaign.end_time,
        gift_items: [],
      };
      list.push(entry);
    }

    if (campaign.gift_item_id != null) {
      entry.gift_items.push({
        gift_item_id: Number(campaign.gift_item_id),
        gift_name: campaign.gift_name,
        total_qty: Number(campaign.total_qty ?? 0),
        remaining_qty: Number(campaign.remaining_qty ?? 0),
        limit_per_member: campaign.limit_per_member == null ? null : Number(campaign.limit_per_member),
        summary: formatGiftItemText(campaign),
      });
      entry.summary = `${entry.gift_items.length} 個贈品項目`;
    }

    map.set(categoryId, list);
    return map;
  }, new Map());

  return categories.map((category) => ({
    category_id: Number(category.category_id),
    category_code: category.category_code,
    category_name: category.category_name,
    is_active: Number(category.is_active ?? 0),
    promotions: promotionsByCategoryId.get(Number(category.category_id)) ?? [],
    gift_campaigns: giftsByCategoryId.get(Number(category.category_id)) ?? [],
  }));
}

app.get('/api/member_activities', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await getActivityManagementRows(conn, { activeOnly: true });
    res.json(rows.map((category) => ({
      category_id: category.category_id,
      category_code: category.category_code,
      category_name: category.category_name,
      promotions: [
        ...category.promotions.map((item) => ({
          key: item.key,
          activity_id: item.activity_id,
          label: item.title,
          description: item.description,
          type: item.discount_type,
          value: item.discount_value,
          selectable: true,
        })),
        ...category.gift_campaigns.map((item) => ({
          key: item.key,
          activity_id: item.activity_id,
          label: item.title,
          description: item.description,
          type: 'gift',
          selectable: false,
          gift_items: item.gift_items,
        })),
      ],
    })));
  } catch (err) {
    console.error('member_activities DB error', err);
    res.status(500).send('member_activities DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/activity_management', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await getActivityManagementRows(conn, { activeOnly: false });
    res.json(rows);
  } catch (err) {
    console.error('activity_management DB error', err);
    res.status(500).json({ message: '取得活動管理資料失敗。' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/promotions', async (req, res) => {
  let conn;
  try {
    const {
      category_id,
      promotion_name,
      start_time = null,
      end_time = null,
      is_active = 1,
      discount_type,
      discount_value,
    } = req.body ?? {};

    if (!category_id || !promotion_name || !discount_type) {
      return res.status(400).json({ message: '缺少必要的折扣活動欄位。' });
    }

    conn = await pool.getConnection();
    const result = await conn.query(
      `
        INSERT INTO promotions (category_id, promotion_name, start_time, end_time, is_active)
        VALUES (?, ?, ?, ?, ?)
      `,
      [Number(category_id), String(promotion_name).trim(), start_time || null, end_time || null, Number(is_active)]
    );

    await conn.query(
      `
        INSERT INTO promotion_rules (promotion_id, discount_type, discount_value)
        VALUES (?, ?, ?)
      `,
      [Number(result.insertId), String(discount_type), Number(discount_value ?? 0)]
    );

    res.json({ success: true, promotion_id: Number(result.insertId) });
  } catch (err) {
    console.error('create promotion DB error', err);
    res.status(500).json({ message: '建立折扣活動失敗。' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/promotions/:promotionId', async (req, res) => {
  let conn;
  try {
    const promotionId = Number(req.params.promotionId);
    const {
      category_id,
      promotion_name,
      start_time = null,
      end_time = null,
      is_active = 1,
      discount_type,
      discount_value,
    } = req.body ?? {};

    if (!promotionId || !category_id || !promotion_name || !discount_type) {
      return res.status(400).json({ message: '缺少必要的折扣活動欄位。' });
    }

    conn = await pool.getConnection();
    await conn.query(
      `
        UPDATE promotions
        SET category_id = ?, promotion_name = ?, start_time = ?, end_time = ?, is_active = ?
        WHERE promotion_id = ?
      `,
      [Number(category_id), String(promotion_name).trim(), start_time || null, end_time || null, Number(is_active), promotionId]
    );

    const existingRule = await conn.query(
      'SELECT rule_id FROM promotion_rules WHERE promotion_id = ? ORDER BY rule_id LIMIT 1',
      [promotionId]
    );

    if (Array.isArray(existingRule) && existingRule.length) {
      await conn.query(
        `
          UPDATE promotion_rules
          SET discount_type = ?, discount_value = ?
          WHERE promotion_id = ?
        `,
        [String(discount_type), Number(discount_value ?? 0), promotionId]
      );
    } else {
      await conn.query(
        `
          INSERT INTO promotion_rules (promotion_id, discount_type, discount_value)
          VALUES (?, ?, ?)
        `,
        [promotionId, String(discount_type), Number(discount_value ?? 0)]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('update promotion DB error', err);
    res.status(500).json({ message: '更新折扣活動失敗。' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/promotions/:promotionId/status', async (req, res) => {
  let conn;
  try {
    const promotionId = Number(req.params.promotionId);
    const { is_active } = req.body ?? {};

    if (!promotionId) {
      return res.status(400).json({ message: '找不到折扣活動。' });
    }

    conn = await pool.getConnection();
    await conn.query('UPDATE promotions SET is_active = ? WHERE promotion_id = ?', [
      Number(is_active) === 0 ? 0 : 1,
      promotionId,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('toggle promotion status DB error', err);
    res.status(500).json({ message: '更新折扣活動狀態失敗。' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/gift_campaigns', async (req, res) => {
  let conn;
  try {
    const {
      category_id,
      campaign_name,
      start_time = null,
      end_time = null,
      is_active = 1,
      gift_items = [],
    } = req.body ?? {};

    if (!category_id || !campaign_name) {
      return res.status(400).json({ message: '缺少必要的贈品活動欄位。' });
    }

    conn = await pool.getConnection();
    const result = await conn.query(
      `
        INSERT INTO gift_campaigns (category_id, campaign_name, start_time, end_time, is_active)
        VALUES (?, ?, ?, ?, ?)
      `,
      [Number(category_id), String(campaign_name).trim(), start_time || null, end_time || null, Number(is_active)]
    );

    for (const giftItem of Array.isArray(gift_items) ? gift_items : []) {
      await conn.query(
        `
          INSERT INTO gift_items (gift_campaign_id, gift_name, total_qty, remaining_qty, limit_per_member)
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          Number(result.insertId),
          String(giftItem.gift_name ?? '').trim(),
          Number(giftItem.total_qty ?? 0),
          Number(giftItem.remaining_qty ?? 0),
          giftItem.limit_per_member == null || giftItem.limit_per_member === ''
            ? null
            : Number(giftItem.limit_per_member),
        ]
      );
    }

    res.json({ success: true, gift_campaign_id: Number(result.insertId) });
  } catch (err) {
    console.error('create gift campaign DB error', err);
    res.status(500).json({ message: '建立贈品活動失敗。' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/gift_campaigns/:campaignId', async (req, res) => {
  let conn;
  try {
    const campaignId = Number(req.params.campaignId);
    const {
      category_id,
      campaign_name,
      start_time = null,
      end_time = null,
      is_active = 1,
      gift_items = [],
    } = req.body ?? {};

    if (!campaignId || !category_id || !campaign_name) {
      return res.status(400).json({ message: '缺少必要的贈品活動欄位。' });
    }

    conn = await pool.getConnection();
    await conn.query(
      `
        UPDATE gift_campaigns
        SET category_id = ?, campaign_name = ?, start_time = ?, end_time = ?, is_active = ?
        WHERE gift_campaign_id = ?
      `,
      [Number(category_id), String(campaign_name).trim(), start_time || null, end_time || null, Number(is_active), campaignId]
    );

    await conn.query('DELETE FROM gift_items WHERE gift_campaign_id = ?', [campaignId]);

    for (const giftItem of Array.isArray(gift_items) ? gift_items : []) {
      await conn.query(
        `
          INSERT INTO gift_items (gift_campaign_id, gift_name, total_qty, remaining_qty, limit_per_member)
          VALUES (?, ?, ?, ?, ?)
        `,
        [
          campaignId,
          String(giftItem.gift_name ?? '').trim(),
          Number(giftItem.total_qty ?? 0),
          Number(giftItem.remaining_qty ?? 0),
          giftItem.limit_per_member == null || giftItem.limit_per_member === ''
            ? null
            : Number(giftItem.limit_per_member),
        ]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('update gift campaign DB error', err);
    res.status(500).json({ message: '更新贈品活動失敗。' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/gift_campaigns/:campaignId/status', async (req, res) => {
  let conn;
  try {
    const campaignId = Number(req.params.campaignId);
    const { is_active } = req.body ?? {};

    if (!campaignId) {
      return res.status(400).json({ message: '找不到贈品活動。' });
    }

    conn = await pool.getConnection();
    await conn.query('UPDATE gift_campaigns SET is_active = ? WHERE gift_campaign_id = ?', [
      Number(is_active) === 0 ? 0 : 1,
      campaignId,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('toggle gift campaign status DB error', err);
    res.status(500).json({ message: '更新贈品活動狀態失敗。' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/product', async (req, res) => {
  const {
    product_name,
    product_price,
    category_id,
    stock_qty,
    is_active,
    note,
  } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      'SELECT COALESCE(MAX(product_id), 0) + 1 AS nextProductId FROM product'
    );
    const nextProductId = Number(rows[0]?.nextProductId ?? 1);
    const product_code = `TK${String(nextProductId).padStart(4, '0')}`;

    const result = await conn.query(
      `INSERT INTO product (
        product_code,
        product_name,
        product_price,
        category_id,
        stock_qty,
        is_active,
        note
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        product_code,
        product_name,
        product_price,
        category_id,
        stock_qty,
        is_active,
        note,
      ]
    );

    res.json({
      success: true,
      product_id: result.insertId,
      product_code,
      product_name,
      category_id,
      stock_qty,
    });
  } catch (err) {
    console.error('新增 product 失敗', err);
    res.status(500).send('DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/product/:price', async (req, res) => {
  const { price } = req.params;
  const { product_id, product_price } = req.body;

  let conn;
  try {
    if (!product_id) {
      res.status(400).json({ success: false, message: 'product_id is required' });
      return;
    }

    conn = await pool.getConnection();
    await conn.query(
      `UPDATE product
       SET product_price = ?
       WHERE product_id = ?`,
      [product_price, product_id]
    );

    res.json({ success: true, product_id, product_price, previous_price: price });
  } catch (err) {
    console.error('更新 product 價格失敗', err);
    res.status(500).send('DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/product/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(
      `UPDATE product
       SET is_active = ?
       WHERE product_id = ?`,
      [is_active, id]
    );

    res.json({ success: true, product_id: id, is_active });
  } catch (err) {
    console.error('更新 product 啟用狀態失敗', err);
    res.status(500).send('DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/business_hours', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT
        id,
        weekday,
        weekday_name,
        is_active,
        TIME_FORMAT(open_time, '%H:%i:%s') AS open_time,
        TIME_FORMAT(close_time, '%H:%i:%s') AS close_time
      FROM business_hours
      ORDER BY weekday
    `);
    res.json(rows);
  } catch (err) {
    console.error('business_hours fetch error', err);
    res.status(500).send('business_hours DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/business_hours', async (req, res) => {
  const businessHours = Array.isArray(req.body.business_hours) ? req.body.business_hours : [];
  const weekdayNames = {
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
    7: 'Sunday',
  };

  if (businessHours.length !== 7) {
    return res.status(400).json({ success: false, message: 'business_hours must contain 7 days' });
  }

  const timeRule = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

  for (const item of businessHours) {
    const weekday = Number(item.weekday);
    const isActive = Number(item.is_active) === 1 ? 1 : 0;
    const openTime = String(item.open_time ?? '').trim();
    const closeTime = String(item.close_time ?? '').trim();

    if (!weekdayNames[weekday]) {
      return res.status(400).json({ success: false, message: `Invalid weekday: ${item.weekday}` });
    }

    if (isActive) {
      if (!timeRule.test(openTime) || !timeRule.test(closeTime)) {
        return res.status(400).json({ success: false, message: `Invalid time format for weekday ${weekday}` });
      }

      if (openTime >= closeTime) {
        return res.status(400).json({ success: false, message: `Open time must be earlier than close time for weekday ${weekday}` });
      }
    }
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    for (const item of businessHours) {
      const weekday = Number(item.weekday);
      const weekdayName = String(item.weekday_name ?? weekdayNames[weekday]).trim() || weekdayNames[weekday];
      const isActive = Number(item.is_active) === 1 ? 1 : 0;
      const openTime = isActive ? String(item.open_time).trim() : null;
      const closeTime = isActive ? String(item.close_time).trim() : null;

      await conn.query(
        `INSERT INTO business_hours (
          weekday,
          weekday_name,
          is_active,
          open_time,
          close_time
        ) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          weekday_name = VALUES(weekday_name),
          is_active = VALUES(is_active),
          open_time = VALUES(open_time),
          close_time = VALUES(close_time),
          updated_at = CURRENT_TIMESTAMP`,
        [weekday, weekdayName, isActive, openTime, closeTime]
      );
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        console.error('business_hours rollback error', rollbackError);
      }
    }
    console.error('business_hours save error', err);
    res.status(500).send('business_hours DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/member_visits', async (req, res) => {
  const scope = String(req.query.scope ?? 'today').toLowerCase();
  const todayOnly = scope !== 'all';

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT
        mv.visit_id,
        mv.order_id,
        mv.member_id,
        m.member_code,
        m.name AS member_name,
        m.phone,
        t.ticket_code AS visit_type,
        t.ticket_name,
        mv.checkin_time,
        mv.checkout_time,
        mv.created_at,
        o.order_no,
        o.total_amount,
        o.payment_method,
        o.invoice_type
      FROM member_visits mv
      INNER JOIN members m ON m.member_id = mv.member_id
      LEFT JOIN ticket t ON t.ticket_id = mv.ticket_id
      LEFT JOIN orders o ON o.order_id = mv.order_id
      ${todayOnly ? 'WHERE DATE(mv.checkin_time) = CURDATE()' : ''}
      ORDER BY mv.checkin_time DESC, mv.visit_id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('取得 member_visits 失敗', err);
    res.status(500).send('member_visits DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/member_visits/:visitId/rentals', async (req, res) => {
  const { visitId } = req.params;

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(
      `SELECT
        vre.id,
        vre.visit_id,
        vre.rental_id,
        re.rental_code,
        re.rental_name,
        vre.rental_price,
        vre.created_at
      FROM visit_rental_equipment vre
      INNER JOIN rental_equipment re ON re.rental_id = vre.rental_id
      WHERE vre.visit_id = ?
      ORDER BY vre.id`,
      [visitId]
    );
    res.json(rows);
  } catch (err) {
    console.error('取得 visit_rental_equipment 失敗', err);
    res.status(500).send('visit_rental_equipment DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/member_visits', async (req, res) => {
  const timestampPart = (value) => String(value).padStart(2, '0');
  const createOrderNo = (date = new Date()) => (
    `${date.getFullYear()}${timestampPart(date.getMonth() + 1)}${timestampPart(date.getDate())}`
    + `${timestampPart(date.getHours())}${timestampPart(date.getMinutes())}${timestampPart(date.getSeconds())}`
  );
  const isDuplicateEntryError = (error) => Number(error?.errno) === 1062 || error?.code === 'ER_DUP_ENTRY';
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const memberId = Number(req.body.member_id);
  const normalizeQuantityItems = (items, codeKey) => (
    Array.isArray(items)
      ? items
        .map((item) => ({
          [codeKey]: String(item?.[codeKey] ?? '').trim(),
          quantity: Number(item?.quantity ?? 0),
        }))
        .filter((item) => item[codeKey] && item.quantity > 0)
      : []
  );
  const ticketItems = normalizeQuantityItems(req.body.ticket_items, 'ticket_code');
  const rentalItems = normalizeQuantityItems(req.body.rental_items, 'rental_code');
  const productItems = normalizeQuantityItems(req.body.product_items, 'product_code');
  const paymentMethod = Number(req.body.payment_method);
  const invoiceType = Number(req.body.invoice_type ?? 0);
  const discountAmountInput = Number(req.body.discount_amount ?? 0);
  const activityIdInput = Number(req.body.activity_id ?? 0);
  const taxId = String(req.body.tax_id ?? '').trim();
  const carrierCode = String(req.body.carrier_code ?? '').trim();
  const donateCode = String(req.body.donate_code ?? '').trim();
  const note = String(req.body.note ?? '').trim();
  const createdBy = Number(req.body.created_by ?? 0) || null;

  if (!memberId) {
    return res.status(400).json({ success: false, message: 'member_id is required' });
  }

  if (!ticketItems.length) {
    return res.status(400).json({ success: false, message: 'ticket_items is required' });
  }

  if (![1, 2, 3, 4].includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'payment_method is invalid' });
  }

  if (![0, 1, 2, 3].includes(invoiceType)) {
    return res.status(400).json({ success: false, message: 'invoice_type is invalid' });
  }

  if (invoiceType === 1 && !taxId) {
    return res.status(400).json({ success: false, message: 'tax_id is required' });
  }

  if (invoiceType === 2 && !carrierCode) {
    return res.status(400).json({ success: false, message: 'carrier_code is required' });
  }

  if (invoiceType === 3 && !donateCode) {
    return res.status(400).json({ success: false, message: 'donate_code is required' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const memberRows = await conn.query(
      'SELECT member_id FROM members WHERE member_id = ?',
      [memberId]
    );

    if (!memberRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const uniqueTicketCodes = [...new Set(ticketItems.map((item) => item.ticket_code))];
    const ticketPlaceholders = uniqueTicketCodes.map(() => '?').join(', ');
    const ticketRows = await conn.query(
      `SELECT ticket_id, ticket_code, ticket_name, ticket_price
       FROM ticket
       WHERE ticket_code IN (${ticketPlaceholders}) AND is_active = 1`,
      uniqueTicketCodes
    );

    if (ticketRows.length !== uniqueTicketCodes.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Ticket not found or inactive' });
    }

    let rentals = [];
    if (rentalItems.length) {
      const uniqueRentalCodes = [...new Set(rentalItems.map((item) => item.rental_code))];
      const placeholders = uniqueRentalCodes.map(() => '?').join(', ');
      rentals = await conn.query(
        `SELECT rental_id, rental_code, rental_name, rental_price
         FROM rental_equipment
         WHERE rental_code IN (${placeholders}) AND is_active = 1`,
        uniqueRentalCodes
      );

      if (rentals.length !== uniqueRentalCodes.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Rental equipment not found or inactive' });
      }
    }

    let products = [];
    if (productItems.length) {
      const uniqueProductCodes = [...new Set(productItems.map((item) => item.product_code))];
      const placeholders = uniqueProductCodes.map(() => '?').join(', ');
      products = await conn.query(
        `SELECT product_id, product_code, product_name, product_price
         FROM product
         WHERE product_code IN (${placeholders}) AND is_active = 1`,
        uniqueProductCodes
      );

      if (products.length !== uniqueProductCodes.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Product not found or inactive' });
      }
    }

    const ticketOrderItems = ticketItems.map((item) => {
      const ticket = ticketRows.find((row) => row.ticket_code === item.ticket_code);
      const unitPrice = Number(ticket?.ticket_price ?? 0);
      return {
        item_type: 1,
        item_id: Number(ticket.ticket_id),
        item_name: ticket.ticket_name,
        unit_price: unitPrice,
        quantity: Number(item.quantity),
        subtotal: unitPrice * Number(item.quantity),
      };
    });

    const rentalOrderItems = rentalItems.map((item) => {
      const rental = rentals.find((row) => row.rental_code === item.rental_code);
      const unitPrice = Number(rental?.rental_price ?? 0);
      return {
        item_type: 2,
        item_id: Number(rental.rental_id),
        item_name: rental.rental_name,
        unit_price: unitPrice,
        quantity: Number(item.quantity),
        subtotal: unitPrice * Number(item.quantity),
      };
    });

    const productOrderItems = productItems.map((item) => {
      const product = products.find((row) => row.product_code === item.product_code);
      const unitPrice = Number(product?.product_price ?? 0);
      return {
        item_type: 3,
        item_id: Number(product.product_id),
        item_name: product.product_name,
        unit_price: unitPrice,
        quantity: Number(item.quantity),
        subtotal: unitPrice * Number(item.quantity),
      };
    });

    const orderItems = [...ticketOrderItems, ...rentalOrderItems, ...productOrderItems];
    const subtotalAmount = orderItems.reduce((total, item) => total + Number(item.subtotal ?? 0), 0);
    const discountAmount = Math.min(Math.max(discountAmountInput, 0), subtotalAmount);
    const totalAmount = Math.max(subtotalAmount - discountAmount, 0);
    const activityId = activityIdInput > 0 ? activityIdInput : null;

    let orderInsertResult = null;
    let orderNo = '';
    for (let attempt = 0; attempt < 3; attempt += 1) {
      orderNo = createOrderNo();
      try {
        orderInsertResult = await conn.query(
          `INSERT INTO orders (
            order_no,
            member_id,
            activity_id,
            subtotal_amount,
            discount_amount,
            total_amount,
            payment_method,
            invoice_type,
            tax_id,
            carrier_code,
            donate_code,
            status,
            note,
            created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          [
            orderNo,
            memberId,
            activityId,
            subtotalAmount,
            discountAmount,
            totalAmount,
            paymentMethod,
            invoiceType,
            invoiceType === 1 ? taxId : null,
            invoiceType === 2 ? carrierCode : null,
            invoiceType === 3 ? donateCode : null,
            note || null,
            createdBy,
          ]
        );
        break;
      } catch (error) {
        if (!isDuplicateEntryError(error) || attempt === 2) {
          throw error;
        }
        await wait(1000);
      }
    }

    const orderId = Number(orderInsertResult.insertId);

    for (const item of orderItems) {
      await conn.query(
        `INSERT INTO order_items (
          order_id,
          item_type,
          item_id,
          item_name,
          unit_price,
          quantity,
          subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.item_type,
          item.item_id,
          item.item_name,
          item.unit_price,
          item.quantity,
          item.subtotal,
        ]
      );
    }

    const visitIds = [];
    for (const ticketItem of ticketItems) {
      const ticket = ticketRows.find((row) => row.ticket_code === ticketItem.ticket_code);
      const ticketId = Number(ticket?.ticket_id ?? 0);

      for (let index = 0; index < Number(ticketItem.quantity); index += 1) {
        const visitResult = await conn.query(
          `INSERT INTO member_visits (
            order_id,
            member_id,
            ticket_id,
            checkin_time
          ) VALUES (?, ?, ?, NOW())`,
          [orderId, memberId, ticketId]
        );
        visitIds.push(Number(visitResult.insertId));
      }
    }

    const primaryVisitId = visitIds[0] ?? null;
    if (primaryVisitId) {
      for (const rentalItem of rentalItems) {
        const rental = rentals.find((item) => item.rental_code === rentalItem.rental_code);

        for (let index = 0; index < rentalItem.quantity; index += 1) {
          await conn.query(
            `INSERT INTO visit_rental_equipment (
              visit_id,
              rental_id,
              rental_price
            ) VALUES (?, ?, ?)`,
            [primaryVisitId, rental.rental_id, Number(rental.rental_price ?? 0)]
          );
        }
      }
    }

    await conn.commit();
    res.json({
      success: true,
      order_id: orderId,
      order_no: orderNo,
      visit_ids: visitIds,
      member_id: memberId,
      ticket_items: ticketItems,
      rental_items: rentalItems,
      product_items: productItems,
      subtotal_amount: subtotalAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
    });
  } catch (err) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackError) {
        console.error('member_visits rollback 失敗', rollbackError);
      }
    }
    console.error('新增 member_visits 失敗', err);
    res.status(500).send('member_visits DB error');
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
