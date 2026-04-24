# 📚 API Reference — Complete Endpoints

## Base URL
```
http://localhost:5000/api
```

All endpoints require authentication header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Authentication

### Register
```
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "role": "patient",        // or "doctor"
  "age": 30,
  "gender": "male",
  "specialization": null    // only for doctors
}

Response: 201
{
  "token": "eyJhbGc...",
  "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "patient" }
}
```

### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword",
  "role": "patient"  // optional, validates role match
}

Response: 200
{
  "token": "eyJhbGc...",
  "user": { ... }
}
```

### Get Current User
```
GET /auth/me
Authorization: Bearer TOKEN

Response: 200
{
  "_id": "...",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "patient",
  "age": 30,
  "gender": "male",
  "createdAt": "2024-04-20T10:30:00Z",
  ...
}
```

### Update Profile
```
PATCH /auth/me
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "name": "Jane Doe",
  "age": 31,
  "gender": "female",
  "specialization": "Cardiology"  // if doctor
}

Response: 200
{ updated user object }
```

### Google OAuth
```
POST /auth/google
Content-Type: application/json

{
  "credential": "GOOGLE_ID_TOKEN",
  "role": "patient"  // required
}

Response: 200
{
  "token": "...",
  "user": { ... }
}
```

### Google Config
```
GET /auth/google-config

Response: 200
{
  "clientId": "773619619531-xxx.apps.googleusercontent.com"
}
```

---

## Medical Data

### Search Disease (with Ranking)
```
GET /medical/search?q=fever&severity=moderate&emergency=false
Authorization: Bearer TOKEN

Query Params:
  q (required)          - Search query (disease, symptom, or keyword)
  severity (optional)   - Filter: "mild", "moderate", "severe"
  emergency (optional)  - Filter: "true" or "false"

Response: 200
{
  "found": true,
  "results": [
    {
      "disease": "Common Cold",
      "severity": "mild",
      "symptoms": ["runny nose", "sneezing", ...],
      "medicines": [...],
      ...
    },
    ...
  ]
}

Response (not found): 200
{
  "found": false,
  "message": "Disease not found...",
  "suggestions": ["Disease1", "Disease2", ...]
}
```

### Get All Diseases
```
GET /medical/all?severity=severe
Authorization: Bearer TOKEN

Query Params:
  severity (optional) - Filter by severity

Response: 200
[
  {
    "disease": "Hypertension",
    "severity": "moderate",
    "keywords": ["high blood pressure", "BP high", ...],
    "emergencyAlert": false
  },
  ...
]
```

### Get All Symptoms
```
GET /medical/symptoms
Authorization: Bearer TOKEN

Response: 200
{
  "symptoms": [
    "fever",
    "cough",
    "headache",
    "chest pain",
    ...
  ]
}
```

### Get Disease by Name
```
GET /medical/influenza
Authorization: Bearer TOKEN

Response: 200
{
  "disease": "Influenza (Flu)",
  "severity": "moderate",
  "symptoms": [...],
  "medicines": [...],
  "precautions": [...],
  "description": "...",
  "dietAdvice": "...",
  ...
}

Response (not found): 404
{ "message": "Disease not found" }
```

---

## Medical Records

### Create Record
```
POST /records
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "disease": "Hypertension",
  "symptoms": ["high BP", "headache"],
  "age": 45,
  "weight": 75,
  "gender": "male",
  "medicines": [
    { "name": "Amlodipine", "dosage": "5-10mg", "frequency": "daily", "duration": "long-term" }
  ],
  "precautions": ["Monitor BP regularly", "Reduce salt"],
  "description": "Chronic hypertension",
  "severity": "moderate"
}

Response: 201
{ created record object with _id, date, etc. }
```

### Get My Records (Patient)
```
GET /records/mine?severity=mild&dateFrom=2024-01-01&dateTo=2024-12-31&disease=fever
Authorization: Bearer TOKEN

Query Params:
  disease (optional)  - Filter by disease name (regex match)
  severity (optional) - Filter: "mild", "moderate", "severe"
  dateFrom (optional) - ISO date string (YYYY-MM-DD)
  dateTo (optional)   - ISO date string (YYYY-MM-DD)

Response: 200
[
  {
    "_id": "...",
    "disease": "Hypertension",
    "severity": "moderate",
    "age": 45,
    "weight": 75,
    "medicines": [...],
    "reviewed": false,
    "date": "2024-04-20T10:30:00Z",
    ...
  },
  ...
]
```

### Get All Records with Pagination (Doctor Only)
```
GET /records?page=1&limit=10&severity=severe&dateFrom=2024-01-01&reviewed=false&search=hypertension
Authorization: Bearer TOKEN

Query Params:
  page (optional)      - Page number (default 1)
  limit (optional)     - Records per page (default 10)
  severity (optional)  - Filter: "mild", "moderate", "severe"
  dateFrom (optional)  - ISO date string
  dateTo (optional)    - ISO date string
  reviewed (optional)  - "true" or "false"
  disease (optional)   - Filter by disease
  search (optional)    - Search in patient name or disease

Response: 200
{
  "records": [{ ...record objects... }],
  "total": 150,
  "page": 1,
  "limit": 10,
  "pages": 15
}
```

### Get Single Record (Doctor Only)
```
GET /records/:id
Authorization: Bearer TOKEN

Response: 200
{ full record object }

Response (not found): 404
{ "message": "Record not found" }
```

### Get Dashboard Stats (Doctor Only)
```
GET /records/stats
Authorization: Bearer TOKEN

Response: 200
{
  "total": 150,
  "reviewed": 120,
  "severe": 8,
  "pending": 30,
  "deleted": 5,
  "bySeverity": {
    "mild": 80,
    "moderate": 62,
    "severe": 8
  },
  "byDisease": [
    { "_id": "Hypertension", "count": 15 },
    { "_id": "Type 2 Diabetes", "count": 12 },
    ...
  ]
}
```

### Get Deleted Records (Doctor Only)
```
GET /records/deleted
Authorization: Bearer TOKEN

Response: 200
[
  { ...deleted record objects... }
]
```

### Mark Record as Reviewed (Doctor Only)
```
PATCH /records/:id/review
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "notes": "Patient needs follow-up in 2 weeks"
}

Response: 200
{ updated record with reviewed: true, reviewedAt, reviewedBy fields }
```

### Delete Own Record (Patient Only)
```
DELETE /records/:id
Authorization: Bearer TOKEN

Response: 200
{ "message": "Record deleted" }

Response (not authorized): 403
{ "message": "Can only delete your own records" }
```

### Soft Delete Record (Doctor Only)
```
DELETE /records/:id
Authorization: Bearer TOKEN (doctor token)

Response: 200
{ "message": "Record moved to deleted" }
```

### Restore Deleted Record (Doctor Only)
```
PATCH /records/:id/restore
Authorization: Bearer TOKEN

Response: 200
{ restored record object }
```

### Permanently Delete Record (Doctor Only)
```
DELETE /records/:id/permanent
Authorization: Bearer TOKEN

Response: 200
{ "message": "Record permanently deleted" }
```

### Generate Prescription PDF (Doctor Only)
```
GET /records/:id/prescription
Authorization: Bearer TOKEN

Response: 200 (HTML document)
Content-Type: text/html; charset=utf-8

<html>
  <!-- Formatted prescription with medicines table, patient info, etc. -->
  <!-- Browser will render and allow printing as PDF -->
</html>

Example usage in browser:
- JavaScript: window.open('/api/records/ID/prescription')
- Then print (Ctrl+P / Cmd+P) as PDF
```

---

## Notifications

### Get All Notifications
```
GET /notifications
Authorization: Bearer TOKEN

Response: 200
[
  {
    "_id": "...",
    "type": "record_reviewed",
    "title": "Your Record Reviewed",
    "message": "Your medical record for Hypertension has been reviewed by Dr. Smith",
    "read": false,
    "recordId": { "disease": "Hypertension", "severity": "moderate" },
    "createdAt": "2024-04-24T10:30:00Z"
  },
  ...
]
```

### Get Unread Count
```
GET /notifications/unread
Authorization: Bearer TOKEN

Response: 200
{
  "unread": 5
}
```

### Mark Notification as Read
```
PATCH /notifications/:id/read
Authorization: Bearer TOKEN

Response: 200
{ notification object with read: true }
```

### Mark All Notifications as Read
```
PATCH /notifications/read/all
Authorization: Bearer TOKEN

Response: 200
{ "message": "All notifications marked as read" }
```

---

## Appointments

### Create Appointment Request (Patient)
```
POST /appointments
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "doctorId": "507f1f77bcf86cd799439011",
  "requestedDate": "2024-05-15",
  "timeSlot": "14:30",
  "reason": "Follow-up consultation for hypertension"
}

Response: 201
{
  "_id": "...",
  "patientId": "...",
  "patientName": "John Doe",
  "doctorId": "...",
  "doctorName": "Dr. Smith",
  "requestedDate": "2024-05-15T00:00:00Z",
  "timeSlot": "14:30",
  "reason": "Follow-up consultation for hypertension",
  "status": "pending",
  "createdAt": "2024-04-24T10:30:00Z"
}
```

### Get Appointments
```
GET /appointments?status=pending
Authorization: Bearer TOKEN

Query Params:
  status (optional) - Filter: "pending", "approved", "declined", "cancelled"

Response: 200
[
  { ...appointment objects... }
]

Note:
- Doctors see appointment requests FOR them
- Patients see their appointment requests
```

### Get Appointment by ID
```
GET /appointments/:id
Authorization: Bearer TOKEN

Response: 200
{ appointment object }

Response (not found): 404
{ "message": "Appointment not found" }
```

### Update Appointment Status (Doctor or Patient)
```
PATCH /appointments/:id
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "status": "approved",  // or "declined", "cancelled"
  "notes": "Available at 3:30 PM in clinic room B"
}

Response: 200
{ updated appointment object with new status }

Authorization Checks:
- Doctor can approve/decline appointment requests for them
- Patient can cancel their own appointment requests
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Please fill all required fields" // or specific validation error
}
```

### 401 Unauthorized
```json
{
  "message": "Not authorized, no token" // or "token failed" or "User not found"
}
```

### 403 Forbidden
```json
{
  "message": "Access denied: Doctors only" // or role-specific message
}
```

### 404 Not Found
```json
{
  "message": "Record not found" // or relevant entity
}
```

### 500 Internal Server Error
```json
{
  "message": "Error message details"
}
```

---

## Response Headers

All responses include:
```
Content-Type: application/json; charset=utf-8
```

Prescription PDF response:
```
Content-Type: text/html; charset=utf-8
```

---

## Rate Limiting

⚠️ **Not implemented yet** — add middleware if deployed to production

---

## WebSocket/Polling

Notifications are fetched via polling:
```javascript
// Frontend can poll every 30 seconds
setInterval(() => {
  api.get('/notifications')
    .then(notifications => {
      // Update notification bell with count
    });
}, 30000);
```

For production with many users, consider implementing WebSocket for real-time notifications.

---

## Example Workflows

### Patient Workflow
1. Register/Login
2. Create a medical record (POST /records)
3. View my records (GET /records/mine)
4. View record notifications (GET /notifications)
5. Request appointment (POST /appointments)
6. View appointment status (GET /appointments)
7. Update profile (PATCH /auth/me)

### Doctor Workflow
1. Login
2. View all records with pagination (GET /records?page=1&limit=10)
3. Filter by severity (GET /records?severity=severe)
4. View single record (GET /records/:id)
5. Generate prescription (GET /records/:id/prescription)
6. Mark as reviewed (PATCH /records/:id/review)
7. View appointment requests (GET /appointments?status=pending)
8. Approve appointment (PATCH /appointments/:id)
9. View dashboard stats (GET /records/stats)

---

## Testing with cURL

```bash
# Set token
TOKEN="your_jwt_token"

# Get notifications
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/notifications

# Search diseases
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/medical/search?q=fever"

# Get paginated records
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5000/api/records?page=1&limit=5"

# Create appointment
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"doctorId":"ID","requestedDate":"2024-05-15","timeSlot":"14:30","reason":"Consultation"}' \
  http://localhost:5000/api/appointments
```

---

## Changelog

**v2.0 (Current)**
- ✅ Database indexes for performance
- ✅ Pagination on records list
- ✅ Severity + date range filters
- ✅ Prescription PDF generation
- ✅ Profile editing
- ✅ Patient record deletion
- ✅ Advanced search with ranking
- ✅ Notifications system
- ✅ Appointment scheduling

**v1.0**
- Basic CRUD for records
- Simple disease search
- Patient and doctor dashboards
