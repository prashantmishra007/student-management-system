const express = require('express');
const router = express.Router();
const Student = require('../models/Student');

// 1. Naya Student Add Karna (Create)
router.post('/add', async (req, res) => {
  try {
    const student = new Student(req.body);
    const savedStudent = await student.save();
    res.status(201).json(savedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 2. Saare Students Ki List Dekhna (Read All)
router.get('/', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Single Student Ki Details Dekhna (Read One)
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student nahi mila' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. Student Details Update Karna (Update)
router.put('/:id', async (req, res) => {
  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 5. Student Delete Karna (Delete)
router.delete('/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student successfully delete ho gaya' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;