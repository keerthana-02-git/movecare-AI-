# MoveCare AI - MongoDB Database Schema

## Overview
This document describes the MongoDB database schema for the MoveCare AI rehabilitation management system. The schema uses Mongoose ODM (Object Data Modeling) with Node.js/Express backend.

## Database Models

### 1. **User** 
Core authentication model for all system users.

**Fields:**
- `_id` (ObjectId) - Auto-generated unique identifier
- `name` (String) - Full name of the user
- `email` (String) - Unique email address
- `password` (String) - Hashed password (bcrypt)
- `role` (String) - User type: `Patient`, `Therapist`, or `Admin`
- `createdAt` (DateTime) - Account creation timestamp
- `updatedAt` (DateTime) - Last update timestamp

**Validation:**
- Email must be unique and valid format
- Password must be at least 6 characters
- Password is automatically hashed before saving

---

### 2. **Patient**
Profile information for patients/clients in rehabilitation.

**Fields:**
- `user` (ObjectId) - Reference to User document
- `dateOfBirth` (Date) - Patient's birth date
- `gender` (String) - `Male`, `Female`, or `Other`
- `medicalCondition` (String) - Primary condition (e.g., "Post-operative knee recovery")
- `injuryDescription` (String) - Detailed injury/condition description
- `assignedTherapist` (ObjectId) - Reference to assigned Therapist
- `phoneNumber` (String) - Contact phone number
- `address` (String) - Patient's address
- `emergencyContact` (Object) - Emergency contact name and phone
- `status` (String) - `Active`, `Inactive`, or `Completed`
- `createdAt`, `updatedAt` (DateTime)

**Relationships:**
- References `User` (1-to-1)
- References `Therapist` (many-to-1)
- Referenced by `ExercisePlan`, `Appointment`, `Progress`

---

### 3. **Therapist**
Profile information for therapists/rehabilitation professionals.

**Fields:**
- `user` (ObjectId) - Reference to User document
- `licenseNumber` (String) - Professional license number (unique)
- `specialization` (String) - `Physical Therapy`, `Occupational Therapy`, `Speech Therapy`, or `General`
- `yearsOfExperience` (Number) - Years of professional experience
- `phoneNumber` (String) - Contact phone number
- `address` (String) - Clinic/office address
- `patientsAssigned` (Array of ObjectIds) - References to assigned Patient documents
- `availability` (Object) - Weekly availability schedule with start/end times
- `status` (String) - `Available`, `Unavailable`, or `OnLeave`
- `createdAt`, `updatedAt` (DateTime)

**Relationships:**
- References `User` (1-to-1)
- References multiple `Patients` (1-to-many)
- Referenced by `Exercise`, `ExercisePlan`, `Appointment`

---

### 4. **Exercise**
Reusable exercise templates created by therapists.

**Fields:**
- `name` (String) - Exercise name (e.g., "Quadriceps Set")
- `description` (String) - What the exercise does
- `category` (String) - `Stretching`, `Strengthening`, `Balance`, `Cardio`, `Flexibility`, or `Coordination`
- `difficulty` (String) - `Easy`, `Medium`, or `Hard`
- `duration` (Number) - Exercise duration in minutes
- `sets` (Number) - Number of sets to perform
- `reps` (Number) - Number of repetitions per set
- `instructions` (String) - Step-by-step instructions
- `videoUrl` (String) - Optional URL to instructional video
- `targetBodyPart` (String) - Body part being exercised (e.g., "Knee", "Shoulder")
- `precautions` (String) - Safety warnings or contraindications
- `createdBy` (ObjectId) - Reference to creating Therapist
- `createdAt`, `updatedAt` (DateTime)

**Relationships:**
- References `Therapist` (many-to-1)
- Referenced by `ExercisePlan`, `Progress`

---

### 5. **ExercisePlan**
Personalized exercise programs assigned to patients by therapists.

**Fields:**
- `patient` (ObjectId) - Reference to Patient
- `therapist` (ObjectId) - Reference to Therapist
- `name` (String) - Plan name (e.g., "Post-Op Knee Recovery Week 1-2")
- `description` (String) - Overall plan description
- `exercises` (Array) - List of exercises with:
  - `exercise` (ObjectId) - Reference to Exercise
  - `frequency` (String) - `Daily`, `Every2Days`, `EveryOtherDay`, `Twice`, or `Weekly`
  - `order` (Number) - Sequence in plan
- `startDate` (Date) - Plan start date
- `endDate` (Date) - Plan end date
- `goals` (String) - Therapeutic goals for the plan
- `notes` (String) - Additional notes from therapist
- `status` (String) - `Active`, `Paused`, `Completed`, or `Cancelled`
- `createdAt`, `updatedAt` (DateTime)

**Relationships:**
- References `Patient` (many-to-1)
- References `Therapist` (many-to-1)
- References multiple `Exercises` (many-to-many)
- Referenced by `Progress`

**Validation:**
- End date must be after start date

---

### 6. **Appointment**
Scheduling appointments between patients and therapists.

**Fields:**
- `patient` (ObjectId) - Reference to Patient
- `therapist` (ObjectId) - Reference to Therapist
- `appointmentDate` (Date) - Date of appointment
- `startTime` (String) - Start time (e.g., "14:00")
- `endTime` (String) - End time (e.g., "14:45")
- `status` (String) - `Scheduled`, `InProgress`, `Completed`, `Cancelled`, or `NoShow`
- `type` (String) - `Initial Assessment`, `Follow-up`, `Progress Review`, or `Treatment Session`
- `notes` (String) - Notes about the appointment
- `reasonForCancellation` (String) - If cancelled, why
- `location` (String) - Location/room of appointment
- `createdAt`, `updatedAt` (DateTime)

**Relationships:**
- References `Patient` (many-to-1)
- References `Therapist` (many-to-1)

---

### 7. **Progress**
Records patient completion and performance data for exercises.

**Fields:**
- `patient` (ObjectId) - Reference to Patient
- `exercise` (ObjectId) - Reference to Exercise
- `exercisePlan` (ObjectId) - Reference to ExercisePlan
- `datePerformed` (Date) - When exercise was performed
- `completionStatus` (String) - `Completed`, `Partial`, `Skipped`, or `Unable`
- `repsCompleted` (Number) - Actual reps completed
- `setsCompleted` (Number) - Actual sets completed
- `painLevel` (Number) - Pain during exercise (0-10 scale)
- `difficulty` (String) - How difficult it was (`Easy`, `Medium`, `Hard`)
- `notes` (String) - Patient notes about the session
- `feedback` (String) - Additional feedback
- `therapistReview` (Object) - Optional therapist review:
  - `reviewed` (Boolean)
  - `feedback` (String)
  - `reviewedAt` (DateTime)
- `createdAt`, `updatedAt` (DateTime)

**Relationships:**
- References `Patient` (many-to-1)
- References `Exercise` (many-to-1)
- References `ExercisePlan` (many-to-1)

**Indexes:**
- Compound index on `(patient, exercise, datePerformed)` for efficient querying

---

### 8. **Notification**
System notifications for users about appointments, reminders, and updates.

**Fields:**
- `recipient` (ObjectId) - Reference to User receiving notification
- `type` (String) - `Appointment`, `ExerciseReminder`, `ProgressUpdate`, `NewExercisePlan`, `SystemAlert`, or `Message`
- `title` (String) - Notification title
- `message` (String) - Notification message content
- `relatedEntity` (Object) - Reference to related document:
  - `entityType` (String) - Type of entity (`Appointment`, `Exercise`, `ExercisePlan`, `Patient`, `Therapist`)
  - `entityId` (ObjectId) - ID of entity
- `isRead` (Boolean) - Whether user has read the notification
- `readAt` (DateTime) - When user read the notification
- `priority` (String) - `Low`, `Normal`, `High`, or `Urgent`
- `expiresAt` (DateTime) - When notification should auto-expire
- `createdAt`, `updatedAt` (DateTime)

**Relationships:**
- References `User` (many-to-1)

**Indexes:**
- TTL index on `expiresAt` - automatically removes expired notifications
- Compound index on `(recipient, isRead, createdAt)` for efficient queries

---

## Relationships Summary

```
User ──────────┬──→ Patient
              │
              └──→ Therapist ──→ (many) Exercise
                      ↓
                      └──→ ExercisePlan ──→ (many) Exercises
                           ↓
                           ├──→ Patient
                           └──→ Progress ──→ Exercise

User ←──────── Appointment ──→ Therapist
               ↓
              Patient

Notification ─→ User
            ├──→ (optional) Appointment
            ├──→ (optional) Exercise
            ├──→ (optional) ExercisePlan
            ├──→ (optional) Patient
            └──→ (optional) Therapist
```

---

## Key Design Decisions

1. **Separate User Model**: Allows authentication and authorization to be centralized while Patient/Therapist have additional specialized fields.

2. **Exercise Templates**: Exercises are created by therapists and reused across multiple plans, reducing data duplication.

3. **ExercisePlan as Container**: Enables flexibility—patients can have multiple plans at different stages, and therapists can modify them without affecting historical data.

4. **Progress Tracking**: Each completion is a separate document, allowing detailed analytics and historical analysis of patient progress.

5. **Notifications with TTL**: Automatic cleanup of old notifications using MongoDB's TTL index keeps database lean.

6. **Validation & Indexes**: Compound indexes on frequently queried fields improve performance; validators ensure data integrity.

---

## Sample Data

The system includes a seed script (`backend/models/seed.js`) that creates:
- 4 sample users (1 therapist, 2 patients, 1 admin)
- 1 therapist with availability schedule
- 2 patients with complete profiles
- 4 reusable exercise templates
- 2 personalized exercise plans
- 2 scheduled appointments
- 2 progress tracking entries
- 3 notifications

To seed the database:
```bash
cd backend
node models/seed.js
```

---

## Database Connection

The backend automatically:
1. Connects to MongoDB using URI from `.env` file or `MONGODB_URI` environment variable
2. Falls back to **MongoDB Memory Server** for development/testing if no external MongoDB is available
3. Shows connection status on server startup

---

## Usage Examples

### Connect models in controllers:
```javascript
import { User, Patient, Therapist, Exercise, ExercisePlan, Appointment, Progress, Notification } from '../models/index.js';

// Query example
const patient = await Patient.findById(id).populate('user').populate('assignedTherapist');
```

### Create new records:
```javascript
const newPatient = await Patient.create({
  user: userId,
  dateOfBirth: new Date('1990-01-01'),
  gender: 'Female',
  medicalCondition: 'Knee injury',
  // ... other fields
});
```

### Update progress:
```javascript
const progress = await Progress.create({
  patient: patientId,
  exercise: exerciseId,
  exercisePlan: planId,
  repsCompleted: 15,
  painLevel: 3,
  notes: 'Felt easier today'
});
```

---

## Validation Rules

| Model | Field | Validation |
|-------|-------|-----------|
| User | email | Valid email format, unique |
| User | password | Min 6 characters, hashed |
| Patient | dateOfBirth | Required |
| Therapist | licenseNumber | Unique, required |
| Therapist | yearsOfExperience | Non-negative number |
| Exercise | duration | Min 1 minute |
| Exercise | sets/reps | Min 1 |
| ExercisePlan | endDate | Must be after startDate |
| Progress | painLevel | 0-10 scale |
| Progress | setsCompleted/repsCompleted | Non-negative |

---

**Last Updated:** 2024
**Framework:** Node.js + Express + Mongoose
**Database:** MongoDB (with in-memory fallback for development)
