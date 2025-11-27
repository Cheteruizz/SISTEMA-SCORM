const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'scorm_system',   // <-- tu BD REAL
});

db.connect((err) => {
  if (err) {
    console.error(' Error conectando a MySQL:', err);
    return;
  }
  console.log(' Conexión a MySQL establecida correctamente.');
});

module.exports = db;
