# Quick Start Guide - MongoDB Database

## 🎯 What Was Created

### 8 Mongoose Models
All models are now in `backend/models/`:
- **User** - Authentication (with role-based access)
- **Patient** - Client profiles with therapy info
- **Therapist** - Professional profiles with schedule
- **Exercise** - Reusable exercise templates
- **ExercisePlan** - Personalized therapy programs
- **Appointment** - Schedule management
- **Progress** - Exercise tracking & completion
- **Notification** - System alerts & reminders

### Database Features
✅ MongoDB connection with automatic fallback to in-memory database  
✅ Password hashing with bcrypt  
✅ Field validation on all important fields  
✅ ObjectId relationships between models  
✅ Database indexes for performance  
✅ Sample seed data for development  

---

## 🚀 Getting Started

### 1. Verify Database Connection
```bash
cd backend
node verify-db.js
```

### 2. Seed Sample Data (Optional)
```bash
cd backend
node models/seed.js
```

### 3. Run the Server
```bash
cd backend
npm run dev          # Development with auto-reload
# OR
npm start            # Production mode
```

---

## 📋 Model Quick Reference

### User
```javascript
{
  name: "John Doe",
  email: "john@example.com",
  password: "hashed_automatically",
  role: "Patient" // or "Therapist", "Admin"
}
```

### Patient
```javascript
{
  user: ObjectId,           // Reference to User
  dateOfBirth: Date,
  gender: "Male",
  medicalCondition: "ACL Reconstruction",
  assignedTherapist: ObjectId
}
```

### Therapist
```javascript
{
  user: ObjectId,           // Reference to User
  licenseNumber: "PT-2024-12345",
  specialization: "Physical Therapy",
  yearsOfExperience: 8,
  patientsAssigned: [ObjectId, ...]
}
```

### Exercise
```javascript
{
  name: "Quadriceps Set",
  description: "Isometric quad strengthening",
  category: "Strengthening",
  difficulty: "Easy",
  duration: 5,               // minutes
  sets: 3,
  reps: 15,
  targetBodyPart: "Knee",
  createdBy: ObjectId        // Therapist reference
}
```

### ExercisePlan
```javascript
{
  patient: ObjectId,
  therapist: ObjectId,
  exercises: [
    { exercise: ObjectId, frequency: "Daily", order: 1 },
    { exercise: ObjectId, frequency: "Every2Days", order: 2 }
  ],
  startDate: Date,
  endDate: Date,
  status: "Active"
}
```

### Appointment
```javascript
{
  patient: ObjectId,
  therapist: ObjectId,
  appointmentDate: Date,
  startTime: "14:00",
  endTime: "14:45",
  status: "Scheduled",
  type: "Follow-up"
}
```

### Progress
```javascript
{
  patient: ObjectId,
  exercise: ObjectId,
  exercisePlan: ObjectId,
  datePerformed: Date,
  completionStatus: "Completed",
  repsCompleted: 15,
  setsCompleted: 3,
  painLevel: 3                // 0-10 scale
}
```

### Notification
```javascript
{
  recipient: ObjectId,        // User reference
  type: "ExerciseReminder",
  title: "Daily Exercise Reminder",
  message: "Time to do your exercises",
  isRead: false,
  priority: "Normal"
}
```

---

## 💻 Common Code Patterns

### Import Models
```javascript
import { User, Patient, Therapist, Exercise, ExercisePlan, Appointment, Progress, Notification } 
  from './models/index.js';
```

### Find with Relations
```javascript
const patient = await Patient
  .findById(id)
  .populate('user')           // Get full user details
  .populate('assignedTherapist');  // Get therapist details
```

### Create with Validation
```javascript
try {
  const user = await User.create({
    name: "Jane Doe",
    email: "jane@example.com",
    password: "securePassword",  // Auto-hashed
    role: "Patient"
  });
} catch (error) {
  console.log('Validation error:', error.message);
}
```

### Query with Conditions
```javascript
// Find all active patients
const activePatients = await Patient
  .find({ status: 'Active' })
  .limit(10);

// Find therapist's appointments
const appointments = await Appointment
  .find({ therapist: therapistId })
  .sort({ appointmentDate: -1 });
```

### Update Records
```javascript
const progress = await Progress.findByIdAndUpdate(
  progressId,
  { 
    completionStatus: 'Completed',
    repsCompleted: 15,
    painLevel: 2
  },
  { new: true }  // Return updated document
);
```

---

## 🔗 Sample Data Login Credentials

After running `node models/seed.js`, you can use:

**Therapist Account:**
- Email: `therapist@movecare.com`
- Password: `SecurePassword123!`
- Role: Therapist

**Patient Accounts:**
- Email: `patient1@movecare.com`
- Email: `patient2@movecare.com`
- Password: `SecurePassword123!` (both)

**Admin Account:**
- Email: `admin@movecare.com`
- Password: `SecurePassword123!`
- Role: Admin

---

## 📊 Database Performance

### Indexes
The database includes strategic indexes for speed:
- **Progress**: Compound index on `(patient, exercise, datePerformed)` - Fast historical queries
- **Notification**: TTL index on `expiresAt` - Auto-cleanup
- **Notification**: Compound index on `(recipient, isRead, createdAt)` - Fast inbox queries

### Connection Strategy
The system uses:
1. **Production**: Real MongoDB (via `MONGODB_URI` env var)
2. **Development**: In-memory MongoDB server (automatic)
3. **Fallback**: Memory server if connection fails

---

## 🛠️ Troubleshooting

### "Cannot find module" error
```bash
cd backend
npm install
```

### MongoDB connection timeout
- Make sure no firewall is blocking port 27017
- Or just use the in-memory server (automatic)
- Check `MONGODB_URI` environment variable

### Password not being hashed
- Passwords are hashed automatically via Mongoose pre-save hook
- Never modify the password field directly - always use User.create() or User.updateOne()

### Model changes not updating
```bash
# Clear node cache
cd backend
rm -rf node_modules/.cache
npm start
```

---

## 📚 Full Documentation

See **DATABASE_SCHEMA.md** for comprehensive documentation including:
- Detailed field descriptions
- Validation rules
- Relationship diagrams
- Design decisions
- Complete API examples

---

## ✅ Ready to Use

Your database is now fully set up and ready for:
- ✅ User authentication and authorization
- ✅ Patient and therapist profile management
- ✅ Exercise plan creation and assignment
- ✅ Appointment scheduling
- ✅ Progress tracking
- ✅ Notification system

Next step: Create API routes and controllers to handle CRUD operations!

---

**Last Updated:** 2024  
**Database**: MongoDB with Mongoose ODM  
**Environment**: Auto-detects production or development setup
