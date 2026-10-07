# 🎓 Student Management Portal (MERN Stack)

A full-stack, responsive Student Management Web Application built with the **MERN Stack** (MongoDB, Express.js, React, Node.js). Designed to streamline student record enrollment, tracking, real-time filtering, and data export.

---

## 🚀 Key Features

- **Full CRUD Operations:** Create, Read, Update, and Delete student records with persistent MongoDB storage.
- **Dynamic Dashboard Metrics:** Real-time summary cards displaying Total Enrolled, BCA students, and other courses.
- **Instant Search & Filter:** Client-side search by name or roll number without page reloads.
- **One-Click CSV Export:** Export current student records directly into Excel-compatible `.csv` format.
- **Custom Toast Feedback:** Real-time visual confirmations for successful actions and validation errors.
- **Responsive Modern UI:** Clean card layout built with CSS Grid and Flexbox.

---

## 🛠️ Tech Stack

- **Frontend:** React (Vite), Axios, Modern CSS
- **Backend:** Node.js, Express.js, CORS, Dotenv
- **Database:** MongoDB (Mongoose ODM)
- **Version Control:** Git, GitHub

---

## 📂 Project Architecture

```text
student-management/
├── backend/
│   ├── models/        # Mongoose Schema (Student.js)
│   ├── routes/        # Express REST API Routes (studentRoutes.js)
│   ├── .env           # Environment configuration
│   └── server.js      # Server entry point
├── frontend/
│   ├── src/           # React Components and UI Logic
│   └── package.json   # Frontend scripts and dependencies
├── .gitignore
└── README.md