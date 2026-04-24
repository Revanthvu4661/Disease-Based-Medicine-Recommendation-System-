# 🏥 MediRec — Disease-Based Medical Recommendation System

A full-stack medical recommendation system with patient and doctor dashboards, built with Node.js, Express, MongoDB Atlas, and vanilla JavaScript.

---

## 🚀 Quick Start

```bash
# 1. Clone / unzip the project
cd Disease-Medical-Recommendation-System

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your MongoDB Atlas connection string

# 4. Start the development server
npm run dev
```

The app runs on **http://localhost:5000**

---

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb://localhost:27017/MediCare
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
PORT=5000
NODE_ENV=development

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### MongoDB (Local) Setup:
1. Install MongoDB Community Edition from [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Start the MongoDB service:
   - **Windows:** `net start MongoDB` or start via Services
   - **macOS:** `brew services start mongodb-community`
   - **Linux:** `sudo systemctl start mongod`
3. The database `MediCare` is created automatically on first run — no manual setup needed
4. Default connection: `mongodb://localhost:27017/MediCare`

> **Optional GUI:** Use [MongoDB Compass](https://www.mongodb.com/products/compass) to visually browse your data.

---

## 🔑 Setting Up Google OAuth

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add **Authorized JavaScript origins**:
   - `http://127.0.0.1:3001` (development — the login page runs here in `npm run dev`)
   - `http://localhost:5000` (development — if you serve the client from Express)
   - `https://yourdomain.com` (production)
7. Copy the **Client ID** and paste it as `GOOGLE_CLIENT_ID` in `.env`
8. No redirect URIs needed — we use the newer Google Identity Services (GIS) popup flow

> **Note:** Google login is optional. If `GOOGLE_CLIENT_ID` is not set, the Google buttons are automatically hidden and the app works with email/password only.

---

## 📁 Project Structure

```
Disease-Medical-Recommendation-System/
├── server/
│   ├── index.js              # Express app entry point
│   ├── models/
│   │   ├── User.js           # User model (patient/doctor)
│   │   └── Record.js         # Medical record model
│   ├── routes/
│   │   ├── auth.js           # /api/auth routes
│   │   ├── records.js        # /api/records routes
│   │   └── medical.js        # /api/medical routes
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── recordController.js
│   │   └── medicalController.js
│   ├── middleware/
│   │   └── auth.js           # JWT protection middleware
│   └── data/
│       └── medicalDataset.json  # 10 disease entries with full data
├── client/
│   ├── index.html            # Login / Register page
│   ├── pages/
│   │   ├── patient.html      # Patient dashboard
│   │   └── doctor.html       # Doctor dashboard
│   ├── css/
│   │   ├── main.css          # Shared styles, glassmorphism
│   │   ├── patient.css       # Patient dashboard styles
│   │   └── doctor.css        # Doctor dashboard styles
│   ├── js/
│   │   ├── api.js            # Fetch wrapper + auth helpers
│   │   ├── auth.js           # Login/Register logic
│   │   ├── patient.js        # Patient dashboard logic
│   │   ├── doctor.js         # Doctor dashboard logic
│   │   ├── theme.js          # Dark/Light mode toggle
│   │   └── particles.js      # Animated particles
│   └── assets/
│       └── video/
│           └── README.md     # Video background instructions
├── .env.example
├── package.json
└── README.md
```

---

## 🧑‍💻 Features

### Authentication
- JWT-based login / register
- Two roles: **Patient** and **Doctor**
- Glassmorphism login card with fullscreen video background
- Role toggle (Patient / Doctor)
- Form validation
- Password show/hide toggle
- Medical disclaimer popup

### Patient Dashboard
- 🔍 **Disease Search** with autocomplete suggestions
- 📋 **Recommendations**: description, medicines, dosage, precautions
- ⚖️ **Smart Dosage**: auto-calculates based on age/weight (mg/kg)
- 🚨 **Emergency alerts** for severe conditions
- 🥗 **Diet advice** per condition
- 📁 **Medical History** — all past searches
- 🧮 **Dosage Calculator** standalone tool

### Doctor Dashboard
- 📊 **Overview stats** — total, reviewed, pending, severe counts
- 📈 **Disease frequency** bar chart
- 👥 **Patient table** with search + filter
- ✅ **Mark as Reviewed** with optional notes
- 🗑️ **Delete records**
- 🔍 **Pending / Severe case views**
- 📋 **Patient Detail Modal**

### UI / UX
- 🌙 **Dark / Light mode** toggle (persisted)
- 📱 **Mobile responsive** design
- ✨ **Animated particles** on login
- 💫 **Glassmorphism** login card
- 🔴 **Heartbeat logo** animation
- ⏳ **DNA loader** animation

---

## 🗃️ Database Collections

### `users`
| Field | Type | Description |
|-------|------|-------------|
| name | String | Full name |
| email | String | Unique email |
| password | String | Hashed (bcrypt) |
| role | Enum | `patient` or `doctor` |
| age | Number | Optional |
| gender | String | Optional |
| specialization | String | Doctor only |

### `records`
| Field | Type | Description |
|-------|------|-------------|
| patientId | ObjectId | Reference to User |
| disease | String | Disease name |
| symptoms | [String] | Symptom list |
| age / weight / gender | Mixed | Patient info |
| medicines | [Object] | Medicine list with dosage |
| precautions | [String] | Precaution list |
| severity | Enum | mild / moderate / severe |
| reviewed | Boolean | Doctor review status |
| reviewedBy / reviewedAt | Mixed | Review metadata |
| notes | String | Doctor notes |

---

## 💊 Medical Dataset

Includes 10 diseases with complete data:
1. Common Cold
2. Influenza (Flu)
3. Hypertension
4. Type 2 Diabetes
5. Dengue Fever
6. Malaria
7. Typhoid Fever
8. Asthma
9. Migraine
10. Gastroenteritis

Each entry includes: description, symptoms, keywords, medicines (with adult/child dosage, mg/kg), precautions, diet advice, when-to-see-doctor, emergency flag.

---

## 🔒 API Endpoints

### Auth
```
POST /api/auth/register     Register new user
POST /api/auth/login        Login
GET  /api/auth/me           Get current user (protected)
```

### Medical Data
```
GET /api/medical/search?q=  Search disease/symptoms
GET /api/medical/all        List all diseases
GET /api/medical/:name      Get disease by name
```

### Records
```
POST   /api/records          Create record (patient)
GET    /api/records/mine     Get own records (patient)
GET    /api/records          Get all records (doctor)
GET    /api/records/stats    Get statistics (doctor)
GET    /api/records/:id      Get single record (doctor)
PATCH  /api/records/:id/review  Mark reviewed (doctor)
DELETE /api/records/:id     Delete record (doctor)
```

---

## ⚠️ Medical Disclaimer

This system is for **educational and informational purposes only**. It is NOT a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional.

---

## 📜 License

MIT License — Feel free to use, modify, and distribute.
