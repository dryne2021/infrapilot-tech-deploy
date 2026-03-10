// server/models/User.js

const pool = require("../config/db");
const bcrypt = require("bcryptjs");

/* =========================================================
   CREATE USER
========================================================= */
async function createUser({ name, email, username, password, role = "candidate" }) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (name, email, username, password, role, status)
     VALUES ($1,$2,$3,$4,$5,'active')
     RETURNING id,name,email,username,role,status,created_at,updated_at`,
    [
      name.trim(),
      email.trim().toLowerCase(),
      username ? username.trim().toLowerCase() : null,
      hashedPassword,
      role,
    ]
  );

  return result.rows[0];
}

/* =========================================================
   FIND USER BY EMAIL
========================================================= */
async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [email.trim().toLowerCase()]
  );

  return result.rows[0] || null;
}

/* =========================================================
   FIND USER BY USERNAME
========================================================= */
async function findUserByUsername(username) {
  const result = await pool.query(
    `SELECT * FROM users WHERE username = $1 LIMIT 1`,
    [username.trim().toLowerCase()]
  );

  return result.rows[0] || null;
}

/* =========================================================
   FIND USER BY ID
========================================================= */
async function findUserById(id) {
  const result = await pool.query(
    `SELECT id,name,email,username,role,status,created_at,updated_at
     FROM users
     WHERE id=$1`,
    [id]
  );

  return result.rows[0] || null;
}

/* =========================================================
   COMPARE PASSWORD
========================================================= */
async function comparePassword(enteredPassword, hashedPassword) {
  return bcrypt.compare(String(enteredPassword || ""), hashedPassword);
}

/* =========================================================
   GET ALL USERS
========================================================= */
async function getAllUsers() {
  const result = await pool.query(
    `SELECT id,name,email,username,role,status,created_at
     FROM users
     ORDER BY created_at DESC`
  );

  return result.rows;
}

/* =========================================================
   UPDATE USER
========================================================= */
async function updateUser(id, data) {
  const result = await pool.query(
    `UPDATE users
     SET name=$1,
         email=$2,
         role=$3,
         status=$4,
         updated_at=NOW()
     WHERE id=$5
     RETURNING id,name,email,username,role,status`,
    [
      data.name,
      data.email.toLowerCase(),
      data.role,
      data.status,
      id,
    ]
  );

  return result.rows[0];
}

/* =========================================================
   DELETE USER
========================================================= */
async function deleteUser(id) {
  await pool.query(`DELETE FROM users WHERE id=$1`, [id]);
  return true;
}

/* =========================================================
   CHANGE USER STATUS
========================================================= */
async function changeUserStatus(id, status) {
  const result = await pool.query(
    `UPDATE users
     SET status=$1,
         updated_at=NOW()
     WHERE id=$2
     RETURNING id,name,email,status`,
    [status, id]
  );

  return result.rows[0];
}

/* =========================================================
   EXPORTS
========================================================= */
module.exports = {
  createUser,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  comparePassword,
  getAllUsers,
  updateUser,
  deleteUser,
  changeUserStatus,
};