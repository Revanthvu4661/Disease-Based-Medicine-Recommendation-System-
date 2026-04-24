# Doctor Dropdown Testing Guide

## Quick Start: Testing the Dropdown

### **Method 1: Register Doctor via Web UI (Easiest)**

1. **Logout** from current account
2. **Go to Login page**
3. **Click "Sign up as Doctor"** button
4. **Fill in registration form:**
   ```
   Name: Dr. Your Name
   Email: any-email@example.com
   Password: Test123!
   Specialization: Cardiology (or any specialty)
   ```
5. **Click Register**
6. **Logout** from doctor account
7. **Login as Patient** (with a different email)
8. **Go to Appointments section**
9. **See the doctor dropdown** with registered doctors

### **Method 2: Add Doctors via MongoDB (Direct)**

1. **Open MongoDB Compass** or mongo shell
2. **Connect to:** `mongodb://localhost:27017/MediCare`
3. **Select 'users' collection**
4. **Insert new document:**
   ```json
   {
     "name": "Dr. Rajesh Kumar",
     "email": "dr.rajesh@example.com",
     "password": "$2b$10$...",
     "role": "doctor",
     "specialization": "Cardiology",
     "loginHistory": [{"method": "local"}],
     "createdAt": new Date()
   }
   ```
   
   **Note:** For password, use bcrypt hash or use Method 1 (easier)

---

## Browser Console Debugging

### **Test if API is Working:**
Open browser console (F12) and run:
```javascript
debugDoctors()
```

**Expected Output - Doctors Found:**
```javascript
[
  {_id: "507f1f77bcf86cd799439011", name: "Dr. Smith", email: "smith@hospital.com", specialization: "Cardiology"},
  {_id: "507f1f77bcf86cd799439012", name: "Dr. Jones", email: "jones@hospital.com", specialization: "Neurology"}
]
```

**Problem - Empty Array:**
```javascript
[]
```
**Solution:** No doctors registered! Follow "Method 1" or "Method 2" above.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Dropdown shows "Loading doctors..."** | Wait 2 seconds, it's loading from database |
| **Dropdown shows "No doctors registered"** | Register doctors using Method 1 or 2 above |
| **Dropdown shows error message** | Check browser console (F12) for API errors |
| **Dropdown is disabled/grayed out** | No doctors in database, register first |
| **API returning 404 or error** | Restart server: `npm start` |

---

## Console Messages to Look For

✅ **Success:**
```
Loading doctors from API...
Doctors received: Array(2)
✓ Loaded 2 doctors into dropdown
```

❌ **Error:**
```
Loading doctors from API...
Error loading doctors: Error: Failed to fetch
```

---

## Multiple Accounts Testing

You can create multiple accounts with different roles:

**Doctor Account:**
- Email: doctor1@hospital.com
- Role: doctor
- Name: Dr. Smith
- Specialization: Cardiology

**Patient Account:**
- Email: patient1@example.com  
- Role: patient
- Name: John Doe

Then:
1. Login as patient
2. Go to Appointments
3. See doctor in dropdown
4. Request appointment
5. Logout
6. Login as doctor
7. Go to Appointments to approve/decline

---

## API Testing (Command Line)

### **Test Doctors Endpoint Directly:**
```bash
curl http://localhost:5000/api/auth/doctors

# Should return:
[
  {"_id":"...", "name":"Dr. Smith", "email":"...", "specialization":"..."},
  {"_id":"...", "name":"Dr. Jones", "email":"...", "specialization":"..."}
]
```

### **Verify Server is Running:**
```bash
curl http://localhost:5000/api-docs
# Should return Swagger UI HTML
```

---

## If Dropdown Still Not Working

1. **Refresh browser:** Ctrl+F5 or Cmd+Shift+R
2. **Clear browser cache:** DevTools → Application → Clear site data
3. **Check server logs:** Look for errors in terminal where you ran `npm start`
4. **Verify MongoDB is running:** Check connection at bottom of terminal
5. **Restart server:** Stop (Ctrl+C) and run `npm start` again

---

## Success Criteria

✅ Dropdown loads on page load
✅ Shows list of all registered doctors
✅ Can select a doctor
✅ Can request appointment
✅ Console shows "Loaded X doctors"

**If all above are working, you're good to go! 🎉**
