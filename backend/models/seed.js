import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import User from './User.js';
import Patient from './Patient.js';
import Therapist from './Therapist.js';
import Exercise from './Exercise.js';
import ExercisePlan from './ExercisePlan.js';
import Appointment from './Appointment.js';
import Progress from './Progress.js';
import Notification from './Notification.js';
import MonitoringSession from './MonitoringSession.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const sanitizeError = (err) => {
  if (!err) return '';
  const message = err.message || String(err);
  return message.replace(/:\/\/([^:]+):([^@]+)@/g, '://<credentials>@');
};

/**
 * Seed database with sample data for development
 * Run with: node backend/models/seed.js
 */
const seedDatabase = async () => {
  let memoryServer;
  try {
    let mongoUri = process.env.MONGODB_URI;
    const seedPassword = process.env.SEED_PASSWORD;

    if (!seedPassword || seedPassword.length < 6) {
      throw new Error('SEED_PASSWORD must be provided and at least 6 characters long');
    }

    // Use MongoDB Memory Server if no URI provided
    if (!mongoUri) {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri();
      console.log('Using MongoDB Memory Server for seeding...');
    }


    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Therapist.deleteMany({}),
      Exercise.deleteMany({}),
      ExercisePlan.deleteMany({}),
      Appointment.deleteMany({}),
      Progress.deleteMany({}),
      Notification.deleteMany({}),
      MonitoringSession.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create sample users
    const userRecords = [
      {
        name: 'Demo Therapist',
        email: 'therapist@example.com',
        password: seedPassword,
        role: 'Therapist',
      },
      {
        name: 'Demo Patient One',
        email: 'patient1@example.com',
        password: seedPassword,
        role: 'Patient',
      },
      {
        name: 'Demo Patient Two',
        email: 'patient2@example.com',
        password: seedPassword,
        role: 'Patient',
      },
      {
        name: 'Demo Administrator',
        email: 'admin@example.com',
        password: seedPassword,
        role: 'Admin',
      },
    ];
    const users = await Promise.all(userRecords.map((user) => User.create(user)));
    console.log('Created sample users');

    // Create sample therapist
    const therapist = await Therapist.create({
      user: users[0]._id,
      licenseNumber: 'PT-2024-12345',
      specialization: 'Physical Therapy',
      yearsOfExperience: 8,
      availability: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
        saturday: { start: '10:00', end: '14:00' },
      },
    });
    console.log('Created sample therapist');

    // Create sample patients
    const patients = await Patient.insertMany([
      {
        user: users[1]._id,
        dateOfBirth: new Date('1985-06-15'),
        gender: 'Male',
        medicalCondition: 'Post-operative knee recovery',
        injuryDescription: 'Synthetic ACL recovery scenario',
        assignedTherapist: therapist._id,
        status: 'Active',
      },
      {
        user: users[2]._id,
        dateOfBirth: new Date('1990-03-20'),
        gender: 'Female',
        medicalCondition: 'Rotator cuff rehabilitation',
        injuryDescription: 'Synthetic shoulder rehabilitation scenario',
        assignedTherapist: therapist._id,
        status: 'Active',
      },
    ]);
    console.log('Created sample patients');

    // Update therapist's assigned patients
    therapist.patientsAssigned = patients.map((p) => p._id);
    await therapist.save();

    // Create sample exercises
    const exercises = await Exercise.insertMany([
      {
        name: 'Quadriceps Set',
        description: 'Isometric exercise to strengthen quadriceps muscle',
        category: 'Strengthening',
        difficulty: 'Easy',
        duration: 5,
        sets: 3,
        reps: 15,
        instructions:
          '1. Lie flat with legs extended. 2. Tighten thigh muscle for 5 seconds. 3. Relax and repeat.',
        targetBodyPart: 'Knee',
        precautions: 'Stop if sharp pain occurs',
        createdBy: therapist._id,
      },
      {
        name: 'Hamstring Curl',
        description: 'Exercise to strengthen hamstring muscles',
        category: 'Strengthening',
        difficulty: 'Medium',
        duration: 10,
        sets: 3,
        reps: 12,
        instructions:
          '1. Stand with support. 2. Bend knee bringing foot towards buttocks. 3. Hold for 2 seconds. 4. Return to start.',
        targetBodyPart: 'Knee',
        precautions: 'Maintain good balance',
        createdBy: therapist._id,
      },
      {
        name: 'Shoulder Mobility Stretch',
        description: 'Gentle stretching for shoulder mobility',
        category: 'Stretching',
        difficulty: 'Easy',
        duration: 5,
        sets: 1,
        reps: 10,
        instructions:
          '1. Stand with arms at sides. 2. Slowly raise arms overhead. 3. Hold for 15-20 seconds. 4. Return to start.',
        targetBodyPart: 'Shoulder',
        precautions: 'Do not force if painful',
        createdBy: therapist._id,
      },
      {
        name: 'Lateral Raise',
        description: 'Strengthening exercise for shoulder muscles',
        category: 'Strengthening',
        difficulty: 'Medium',
        duration: 10,
        sets: 3,
        reps: 10,
        instructions:
          '1. Stand with weights at sides. 2. Raise arms to shoulder height. 3. Hold for 1 second. 4. Lower slowly.',
        targetBodyPart: 'Shoulder',
        precautions: 'Use light weights initially',
        createdBy: therapist._id,
      },
    ]);
    console.log('Created sample exercises');

    // Create sample exercise plans
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const exercisePlans = await ExercisePlan.insertMany([
      {
        patient: patients[0]._id,
        therapist: therapist._id,
        name: 'Post-Op Knee Recovery Week 1-2',
        description: 'Initial phase focusing on quad and hamstring activation',
        exercises: [
          { exercise: exercises[0]._id, frequency: 'Daily', order: 1 },
          { exercise: exercises[1]._id, frequency: 'Every2Days', order: 2 },
        ],
        startDate,
        endDate,
        goals: 'Restore quadriceps strength and knee mobility to 50%',
        notes: 'Patient is 6 weeks post-op. Monitor swelling carefully.',
        status: 'Active',
      },
      {
        patient: patients[1]._id,
        therapist: therapist._id,
        name: 'Shoulder Rehabilitation Program',
        description: 'Progressive shoulder strengthening and mobility work',
        exercises: [
          { exercise: exercises[2]._id, frequency: 'Daily', order: 1 },
          { exercise: exercises[3]._id, frequency: 'Every2Days', order: 2 },
        ],
        startDate,
        endDate,
        goals: 'Restore full shoulder mobility and strength',
        notes: 'Patient has repetitive strain injury. Progress cautiously.',
        status: 'Active',
      },
    ]);
    console.log('Created sample exercise plans');

    // Create sample appointments
    const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
    const appointmentDate = new Date(tomorrow);
    appointmentDate.setHours(14, 0, 0, 0);

    await Appointment.insertMany([
      {
        patient: patients[0]._id,
        therapist: therapist._id,
        appointmentDate,
        startTime: '14:00',
        endTime: '14:45',
        status: 'Scheduled',
        type: 'Follow-up',
        notes: 'Check knee range of motion and swelling',
        location: 'Physical Therapy Clinic - Room A',
      },
      {
        patient: patients[1]._id,
        therapist: therapist._id,
        appointmentDate: new Date(appointmentDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        startTime: '10:00',
        endTime: '10:45',
        status: 'Scheduled',
        type: 'Progress Review',
        notes: 'Evaluate shoulder progress and adjust exercises',
        location: 'Physical Therapy Clinic - Room B',
      },
    ]);
    console.log('Created sample appointments');

    // Create sample progress entries
    await Progress.insertMany([
      {
        patient: patients[0]._id,
        exercise: exercises[0]._id,
        exercisePlan: exercisePlans[0]._id,
        datePerformed: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000),
        completionStatus: 'Completed',
        repsCompleted: 15,
        setsCompleted: 3,
        painLevel: 3,
        difficulty: 'Easy',
        notes: 'Exercise felt easier today',
      },
      {
        patient: patients[1]._id,
        exercise: exercises[2]._id,
        exercisePlan: exercisePlans[1]._id,
        datePerformed: new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000),
        completionStatus: 'Completed',
        repsCompleted: 10,
        setsCompleted: 1,
        painLevel: 2,
        difficulty: 'Easy',
        notes: 'Good mobility improvement',
        feedback: 'Patient showing good progress',
      },
    ]);
    console.log('Created sample progress entries');

    // Create sample notifications
    await Notification.insertMany([
      {
        recipient: users[1]._id,
        type: 'Appointment',
        title: 'Upcoming Appointment',
        message: 'You have an appointment with your demo therapist tomorrow at 2:00 PM',
        relatedEntity: {
          entityType: 'Appointment',
          entityId: new mongoose.Types.ObjectId(),
        },
        priority: 'Normal',
      },
      {
        recipient: users[2]._id,
        type: 'ExerciseReminder',
        title: 'Daily Exercise Reminder',
        message: 'Time to do your shoulder mobility exercises',
        priority: 'Normal',
      },
      {
        recipient: users[0]._id,
        type: 'ProgressUpdate',
        title: 'Patient Progress Update',
        message: 'Demo Patient One has completed their daily exercises',
        relatedEntity: {
          entityType: 'Patient',
          entityId: patients[0]._id,
        },
        priority: 'Normal',
      },
    ]);
    console.log('Created sample notifications');

    console.log('\n✅ Database seeded successfully!');
    console.log('\nSample Data Created:');
    console.log(`  - ${users.length} users`);
    console.log(`  - 1 therapist`);
    console.log(`  - ${patients.length} patients`);
    console.log(`  - ${exercises.length} exercises`);
    console.log(`  - ${exercisePlans.length} exercise plans`);
    console.log(`  - 2 appointments`);
    console.log(`  - 2 progress entries`);
    console.log(`  - 3 notifications`);

    await mongoose.connection.close();
    
    if (memoryServer) {
      await memoryServer.stop();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', sanitizeError(error));
    
    if (memoryServer) {
      await memoryServer.stop();
    }
    
    process.exit(1);
  }
};

// Run seed if this file is executed directly
if (process.argv[1].includes('seed.js')) {
  seedDatabase();
}

export default seedDatabase;
