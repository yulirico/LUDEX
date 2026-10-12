require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');
const teacherRoutes = require('./routes/teacher');
const adminRoutes = require('./routes/admin');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'ludex-backend' }));

const distPath = path.join(__dirname, '..', 'Frontend', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
db.initialize()
  .then(() => {
    app.listen(PORT, () => console.log(`Ludex backend escuchando en el puerto ${PORT}`));
  })
  .catch(async error => {
    console.error('No se pudo iniciar la base de datos PostgreSQL:', error);
    await db.close();
    process.exitCode = 1;
  });