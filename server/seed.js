/**
 * Production-Level University Database Seeder
 * Run: node seed.js
 * Creates:
 *  - 1 Admin
 *  - 2 Professors (with assigned subjects)
 *  - 4 Semester 5 CSE Subjects with Assessment Configs
 *  - 10 Students in Semester 5 (PRN2023001 - PRN2023010)
 *  - Realistic Academic Results with CA1 (/10), MSE (/20), CA2 (/10), EndSem (/60)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.model.js';
import Subject from './models/Subject.model.js';
import Result from './models/Result.model.js';

dotenv.config();

const SEED_USERS = [
  // Admin
  {
    name: 'Dr. Ramesh Deshmukh',
    email: 'admin@cse.edu',
    password: 'admin123',
    role: 'Admin',
    identifier: 'ADM001',
    department: 'CSE',
  },
  // Professors
  {
    name: 'Prof. Rajesh Kumar',
    email: 'prof@cse.edu',
    password: 'prof123',
    role: 'Professor',
    identifier: 'EMP101',
    department: 'CSE',
  },
  {
    name: 'Prof. Anita Joshi',
    email: 'anita@cse.edu',
    password: 'prof123',
    role: 'Professor',
    identifier: 'EMP102',
    department: 'CSE',
  },
  // Students (Semester 5)
  {
    name: 'Aarav Patel',
    email: 'aarav@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2023001',
    department: 'CSE',
    currentSemester: 5,
  },
  {
    name: 'Priya Sharma',
    email: 'student@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2023002',
    department: 'CSE',
    currentSemester: 5,
  },
  {
    name: 'Sneha Desai',
    email: 'sneha@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2023003',
    department: 'CSE',
    currentSemester: 5,
  },
  {
    name: 'Rohan Kulkarni',
    email: 'rohan@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2023004',
    department: 'CSE',
    currentSemester: 5,
  },
  {
    name: 'Ananya Verma',
    email: 'ananya@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2023005',
    department: 'CSE',
    currentSemester: 5,
  },
  {
    name: 'Vikram Singh',
    email: 'vikram@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2023006',
    department: 'CSE',
    currentSemester: 5,
  },
  {
    name: 'Tanvi Shinde',
    email: 'tanvi@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2023007',
    department: 'CSE',
    currentSemester: 5,
  },
  {
    name: 'Aditya Rao',
    email: 'aditya@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2023008',
    department: 'CSE',
    currentSemester: 5,
  },
  {
    name: 'Neha Gupta',
    email: 'neha@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2023009',
    department: 'CSE',
    currentSemester: 5,
  },
  {
    name: 'Karan Mehta',
    email: 'karan@cse.edu',
    password: 'student123',
    role: 'Student',
    identifier: 'PRN2023010',
    department: 'CSE',
    currentSemester: 5,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // 1. Clear existing collections
    await User.deleteMany({});
    await Subject.deleteMany({});
    await Result.deleteMany({});
    console.log('🗑️  Cleared existing database records');

    // 2. Create Users
    const createdUsers = {};
    for (const u of SEED_USERS) {
      const userDoc = new User(u);
      await userDoc.save();
      createdUsers[u.email] = userDoc;
      console.log(`👤 Created ${u.role}: ${u.name} (${u.email})`);
    }

    const profRajesh = createdUsers['prof@cse.edu'];
    const profAnita = createdUsers['anita@cse.edu'];

    // 3. Create Subjects
    const subjectsData = [
      {
        subjectName: 'Database Management Systems',
        subjectCode: 'CS501',
        credits: 4,
        semester: 5,
        department: 'CSE',
        assignedProfessor: profRajesh._id,
        assessmentConfig: { ca1Max: 20, mseMax: 20, ca2Max: 20, endSemMax: 60 },
      },
      {
        subjectName: 'Design & Analysis of Algorithms',
        subjectCode: 'CS502',
        credits: 4,
        semester: 5,
        department: 'CSE',
        assignedProfessor: profRajesh._id,
        assessmentConfig: { ca1Max: 20, mseMax: 20, ca2Max: 20, endSemMax: 60 },
      },
      {
        subjectName: 'Operating Systems',
        subjectCode: 'CS503',
        credits: 3,
        semester: 5,
        department: 'CSE',
        assignedProfessor: profAnita._id,
        assessmentConfig: { ca1Max: 20, mseMax: 20, ca2Max: 20, endSemMax: 60 },
      },
      {
        subjectName: 'Web Technologies',
        subjectCode: 'CS504',
        credits: 3,
        semester: 5,
        department: 'CSE',
        assignedProfessor: profAnita._id,
        assessmentConfig: { ca1Max: 20, mseMax: 20, ca2Max: 20, endSemMax: 60 },
      },
    ];

    const createdSubjects = [];
    for (const sub of subjectsData) {
      const subjectDoc = await Subject.create(sub);
      createdSubjects.push(subjectDoc);
      // Link subject to professor
      await User.findByIdAndUpdate(sub.assignedProfessor, {
        $addToSet: { assignedSubjects: subjectDoc._id },
      });
      console.log(`📚 Created Subject: ${sub.subjectName} (${sub.subjectCode}) -> Assigned to ${sub.assignedProfessor === profRajesh._id ? 'Prof. Rajesh' : 'Prof. Anita'}`);
    }

    // 4. Seed Initial Results for CS501 (DBMS) with Prof. Rajesh
    const dbmsSubject = createdSubjects[0];
    const students = Object.values(createdUsers).filter((u) => u.role === 'Student');

    // Realistic marks scenarios:
    // Student 1 (Aarav): High Achiever -> CA1: 19/20, MSE: 19/20, CA2: 18/20, EndSem: 54/60 -> O Grade
    // Student 2 (Priya): Solid A+ -> CA1: 18/20, MSE: 17/20, CA2: 17/20, EndSem: 48/60 -> A+ Grade
    // Student 3 (Sneha): Good B+ -> CA1: 14/20, MSE: 15/20, CA2: 15/20, EndSem: 38/60 -> B+ Grade
    // Student 4 (Rohan): Passable -> CA1: 12/20, MSE: 12/20, CA2: 11/20, EndSem: 28/60 -> C Grade
    // Student 5 (Ananya): At-Risk Internal (16/40) but Passed via strong EndSem (36/60) -> Total 52 (Passed)
    // Student 6 (Vikram): Failed EndSem (<20) -> CA1: 14/20, MSE: 14/20, CA2: 12/20, EndSem: 15/60 -> Failed!
    // Student 7 (Tanvi): In-Progress (Only Internals entered, EndSem pending)
    // Student 8 (Aditya): In-Progress (CA1 and MSE entered, CA2 pending)
    // Student 9 & 10: Blank so teachers can test entering fresh marks!

    const sampleMarks = [
      { ca1Raw: 19, mseRaw: 19, ca2Raw: 18, endSemRaw: 54 },
      { ca1Raw: 18, mseRaw: 17, ca2Raw: 17, endSemRaw: 48 },
      { ca1Raw: 14, mseRaw: 15, ca2Raw: 15, endSemRaw: 38 },
      { ca1Raw: 12, mseRaw: 12, ca2Raw: 11, endSemRaw: 28 },
      { ca1Raw: 8,  mseRaw: 10, ca2Raw: 8,  endSemRaw: 36 },
      { ca1Raw: 14, mseRaw: 14, ca2Raw: 12, endSemRaw: 15 },
      { ca1Raw: 16, mseRaw: 15, ca2Raw: 16, endSemRaw: null },
      { ca1Raw: 15, mseRaw: 14, ca2Raw: null, endSemRaw: null },
    ];

    for (let i = 0; i < sampleMarks.length && i < students.length; i++) {
      const student = students[i];
      const m = sampleMarks[i];

      const resultDoc = new Result({
        studentId: student._id,
        subjectId: dbmsSubject._id,
        professorId: profRajesh._id,
        academicYear: '2025-26',
        semester: 5,
        ca1Raw: m.ca1Raw,
        ca1Max: 20,
        mseRaw: m.mseRaw,
        mseMax: 20,
        ca2Raw: m.ca2Raw,
        ca2Max: 20,
        endSemRaw: m.endSemRaw,
        endSemMax: 60,
      });

      await resultDoc.save();
    }
    console.log(`📊 Seeded realistic academic results for ${dbmsSubject.subjectName}`);

    console.log('\n🎉 Production-ready Database seeded successfully!');
    console.log('----------------------------------------------------');
    console.log('👨‍💼 Admin    : admin@cse.edu / admin123');
    console.log('👨‍🏫 Professor: prof@cse.edu / prof123 (Prof. Rajesh Kumar)');
    console.log('👩‍🏫 Professor: anita@cse.edu / prof123 (Prof. Anita Joshi)');
    console.log('🎓 Student  : student@cse.edu / student123 (Priya Sharma, PRN2023002)');
    console.log('🎓 Student  : aarav@cse.edu / student123 (Aarav Patel, PRN2023001)');
    console.log('----------------------------------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
