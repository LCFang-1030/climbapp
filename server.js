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
      SELECT product_id, product_code, product_name, product_price, is_active, note
      FROM product
      ${activeOnly ? 'WHERE is_active = 1' : ''}
      ORDER BY product_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('product DB error');
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/product', async (req, res) => {
  const {
    product_name,
    product_price,
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
        is_active,
        note
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        product_code,
        product_name,
        product_price,
        is_active,
        note,
      ]
    );

    res.json({ success: true, product_id: result.insertId, product_code, product_name });
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
