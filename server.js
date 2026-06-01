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
      SELECT ticket_id, ticket_code, ticket_name, ticket_price, is_active, note
      FROM ticket
      ${activeOnly ? 'WHERE is_active = 1' : ''}
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
    ticket_name,
    ticket_price,
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
  const activeOnly = String(req.query.activeOnly ?? '') === '1';

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(`
      SELECT rental_id, rental_code, rental_name, rental_price, is_active, note
      FROM rental_equipment
      ${activeOnly ? 'WHERE is_active = 1' : ''}
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
    rental_name,
    rental_price,
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
        mv.member_id,
        m.member_code,
        m.name AS member_name,
        m.phone,
        mv.visit_type,
        mv.checkin_time,
        mv.checkout_time,
        mv.created_at
      FROM member_visits mv
      INNER JOIN members m ON m.member_id = mv.member_id
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
  const memberId = Number(req.body.member_id);
  const ticketCode = String(req.body.ticket_code ?? '').trim();
  const rentalCodes = Array.isArray(req.body.rental_codes)
    ? req.body.rental_codes.map((code) => String(code ?? '').trim()).filter(Boolean)
    : [];

  if (!memberId) {
    return res.status(400).json({ success: false, message: 'member_id is required' });
  }

  if (!ticketCode) {
    return res.status(400).json({ success: false, message: 'ticket_code is required' });
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

    const ticketRows = await conn.query(
      `SELECT ticket_id, ticket_code
       FROM ticket
       WHERE ticket_code = ? AND is_active = 1`,
      [ticketCode]
    );

    if (!ticketRows.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Ticket not found or inactive' });
    }

    let rentals = [];
    if (rentalCodes.length) {
      const placeholders = rentalCodes.map(() => '?').join(', ');
      rentals = await conn.query(
        `SELECT rental_id, rental_code, rental_price
         FROM rental_equipment
         WHERE rental_code IN (${placeholders}) AND is_active = 1`,
        rentalCodes
      );

      if (rentals.length !== rentalCodes.length) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Rental equipment not found or inactive' });
      }
    }

    const visitResult = await conn.query(
      `INSERT INTO member_visits (
        member_id,
        checkin_time,
        visit_type
      ) VALUES (?, NOW(), ?)`,
      [memberId, ticketCode]
    );

    const visitId = Number(visitResult.insertId);

    for (const rentalCode of rentalCodes) {
      const rental = rentals.find((item) => item.rental_code === rentalCode);

      await conn.query(
        `INSERT INTO visit_rental_equipment (
          visit_id,
          rental_id,
          rental_price
        ) VALUES (?, ?, ?)`,
        [visitId, rental.rental_id, Number(rental.rental_price ?? 0)]
      );
    }

    await conn.commit();
    res.json({
      success: true,
      visit_id: visitId,
      member_id: memberId,
      ticket_code: ticketCode,
      rental_codes: rentalCodes,
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
