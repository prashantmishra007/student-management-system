require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const studentRoutes = require('./routes/studentRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Local MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_db')
  .then(() => console.log('MongoDB Local Database Successfully Connected!'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/students', studentRoutes);

// Test Route
app.get('/', (req, res) => {
  res.send('Student Management Backend mast chal raha hai!');
});

// Server Start
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server port ${PORT} par live ho gaya hai!`);
});