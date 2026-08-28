require("dotenv").config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mobile Care API is running.' });
});

const publicDir = path.join(__dirname, '../../public');
app.use(express.static(publicDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/admin-login.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin-login.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin.html'));
});

app.get('/track-repair.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'track-repair.html'));
});

app.get('/services.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'services.html'));
});

app.get('/about.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'about.html'));
});

app.get('/contact.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'contact.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

module.exports = app;
