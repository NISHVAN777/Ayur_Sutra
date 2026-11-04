import bcrypt from "bcryptjs";
import { db, sqlite, ensureHackathonTables } from "./index.js";
import { 
  users, patients, therapists, treatmentRooms, 
  therapyCourses, therapySessions, notifications, chatMessages, auditLogs,
  therapistAvailability, therapistLeaves, procedureRoomCompatibility, reminderLogs
} from "./schema.js";
import { format, addDays, subDays } from "date-fns";

export async function seedDatabase() {
  console.log("Seeding database with standardized Ayurvedic clinic data...");

  // Clear existing records
  ensureHackathonTables();
  sqlite.exec(`
    DELETE FROM wellness_logs;
    DELETE FROM therapist_qualifications;
    DELETE FROM reminder_logs;
    DELETE FROM procedure_room_compatibility;
    DELETE FROM therapist_leaves;
    DELETE FROM therapist_availability;
    DELETE FROM session_requests;
    DELETE FROM audit_logs;
    DELETE FROM chat_messages;
    DELETE FROM notifications;
    DELETE FROM therapy_sessions;
    DELETE FROM therapy_courses;
    DELETE FROM treatment_rooms;
    DELETE FROM therapists;
    DELETE FROM patients;
    DELETE FROM users;
  `);

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const therapistPassword = await bcrypt.hash("Therapist@123", 10);
  const patientPassword = await bcrypt.hash("Patient@123", 10);

  // 1. Create Users
  const adminUser = {
    id: "usr_admin_001",
    name: "Dr. Shankaran",
    email: "admin@ayursutra.com",
    passwordHash: adminPassword,
    role: "ADMIN" as const,
  };

  const therapistUser1 = {
    id: "usr_therapist_001",
    name: "Dr. Rajesh Kumar",
    email: "therapist@ayursutra.com",
    passwordHash: therapistPassword,
    role: "THERAPIST" as const,
  };

  const therapistUser2 = {
    id: "usr_therapist_002",
    name: "Dr. Ananya Nair",
    email: "ananya.nair@ayursutra.com",
    passwordHash: therapistPassword,
    role: "THERAPIST" as const,
  };

  const therapistUser3 = {
    id: "usr_therapist_003",
    name: "Dr. Vikram Joshi",
    email: "vikram.joshi@ayursutra.com",
    passwordHash: therapistPassword,
    role: "THERAPIST" as const,
  };

  const patientUser1 = {
    id: "usr_patient_001",
    name: "Arun Sharma",
    email: "patient@ayursutra.com",
    passwordHash: patientPassword,
    role: "PATIENT" as const,
  };

  const patientUser2 = {
    id: "usr_patient_002",
    name: "Meera Patel",
    email: "meera.patel@ayursutra.com",
    passwordHash: patientPassword,
    role: "PATIENT" as const,
  };

  const patientUser3 = {
    id: "usr_patient_003",
    name: "Suresh Iyer",
    email: "suresh.iyer@ayursutra.com",
    passwordHash: patientPassword,
    role: "PATIENT" as const,
  };

  const patientUser4 = {
    id: "usr_patient_004",
    name: "Priya Menon",
    email: "priya.menon@ayursutra.com",
    passwordHash: patientPassword,
    role: "PATIENT" as const,
  };

  await db.insert(users).values([
    adminUser,
    therapistUser1,
    therapistUser2,
    therapistUser3,
    patientUser1,
    patientUser2,
    patientUser3,
    patientUser4,
  ]);

  // 2. Create Therapists Profile (with English bio and avatar details)
  const therapist1 = {
    id: "thp_001",
    userId: therapistUser1.id,
    specialization: "Panchakarma & Basti Specialist",
    phone: "+91 98450 11223",
    experience: "12 years",
    avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&auto=format&fit=crop&q=80",
    bio: "Senior Ayurvedic practitioner specializing in classical Panchakarma therapy, musculoskeletal rehabilitation, and personalized wellness regimens.",
  };

  const therapist2 = {
    id: "thp_002",
    userId: therapistUser2.id,
    specialization: "Shirodhara & Stress Management Specialist",
    phone: "+91 98450 22334",
    experience: "8 years",
    avatarUrl: "https://images.unsplash.com/photo-1594824813572-870020138382?w=200&auto=format&fit=crop&q=80",
    bio: "Expert in neuro-restorative therapies, Shirodhara protocols, and holistic lifestyle coaching for stress relief and sleep restoration.",
  };

  const therapist3 = {
    id: "thp_003",
    userId: therapistUser3.id,
    specialization: "Detoxification & Rejuvenation Specialist",
    phone: "+91 98450 33445",
    experience: "15 years",
    avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&auto=format&fit=crop&q=80",
    bio: "Specialist in metabolic cleansing, therapeutic herbal oil procedures, and preventive wellness programs.",
  };

  await db.insert(therapists).values([therapist1, therapist2, therapist3]);

  // Seed Therapist Availability (ONLY for Dr. Ananya Nair & Dr. Vikram Joshi; Dr. Rajesh Kumar is UNRESTRICTED)
  await db.insert(therapistAvailability).values([
    {
      id: "av_thp_002",
      therapistId: therapist2.id,
      workingDays: JSON.stringify([0, 1, 2, 3, 4, 5, 6]), // 7-day coverage 08:00-18:00
      workingHoursStart: "08:00",
      workingHoursEnd: "18:00",
      weeklyOff: null,
    },
    {
      id: "av_thp_003",
      therapistId: therapist3.id,
      workingDays: JSON.stringify([1, 2, 3, 4, 5]), // Mon-Fri 09:00-17:00
      workingHoursStart: "09:00",
      workingHoursEnd: "17:00",
      weeklyOff: 0, // Sunday
    },
  ]);

  // 3. Create Patients Profile
  const patient1 = {
    id: "pat_001",
    userId: patientUser1.id,
    phone: "+91 91234 56780",
    dateOfBirth: "1988-06-14",
    gender: "Male" as const,
    address: "Flat 402, Lotus Greens, Indiranagar, Bengaluru",
    emergencyContact: "Sunita Sharma (+91 91234 56789)",
    medicalNotes: "Chronic lower back stiffness and slow digestive metabolism. Prescribed 7-Day Basti Therapy.",
  };

  const patient2 = {
    id: "pat_002",
    userId: patientUser2.id,
    phone: "+91 92345 67891",
    dateOfBirth: "1992-11-20",
    gender: "Female" as const,
    address: "74 Palm Grove, Koramangala, Bengaluru",
    emergencyContact: "Karan Patel (+91 92345 67890)",
    medicalNotes: "High stress levels, sleep irregularities. Prescribed 14-Day Panchakarma Therapy with Shirodhara.",
  };

  const patient3 = {
    id: "pat_003",
    userId: patientUser3.id,
    phone: "+91 93456 78902",
    dateOfBirth: "1974-03-08",
    gender: "Male" as const,
    address: "12 Temple Street, Malleshwaram, Bengaluru",
    emergencyContact: "Lakshmi Iyer (+91 93456 78901)",
    medicalNotes: "Joint stiffness and mild fatigue. Recommended 5-Day Abhyanga Therapy.",
  };

  const patient4 = {
    id: "pat_004",
    userId: patientUser4.id,
    phone: "+91 94567 89013",
    dateOfBirth: "1996-09-25",
    gender: "Female" as const,
    address: "305 Green View, Jayanagar, Bengaluru",
    emergencyContact: "Ramesh Menon (+91 94567 89012)",
    medicalNotes: "Seasonal sinus congestion. Scheduled for 5-Day Nasya Therapy.",
  };

  await db.insert(patients).values([patient1, patient2, patient3, patient4]);

  // 4. Create Standardized Treatment Rooms (EVERY ROOM NAME ENDS WITH 'Suite')
  const room1 = {
    id: "room_101",
    roomName: "Basti Suite",
    roomNumber: "101",
    description: "Dedicated clinical suite equipped for gentle herbal infusion and therapeutic retention procedures.",
    status: "ACTIVE" as const,
  };

  const room2 = {
    id: "room_102",
    roomName: "Abhyanga Suite",
    roomNumber: "102",
    description: "Equipped with traditional wooden therapy table, herbal steam chamber, and private restorative area.",
    status: "ACTIVE" as const,
  };

  const room3 = {
    id: "room_103",
    roomName: "Shirodhara Suite",
    roomNumber: "103",
    description: "Acoustically quiet therapeutic environment specialized for warm herbal oil pouring and relaxation.",
    status: "ACTIVE" as const,
  };

  const room4 = {
    id: "room_104",
    roomName: "Panchakarma Suite",
    roomNumber: "104",
    description: "Comprehensive multi-modality therapeutic suite with modern steam generator and private attached bath.",
    status: "ACTIVE" as const,
  };

  await db.insert(treatmentRooms).values([room1, room2, room3, room4]);

  // Seed Procedure ↔ Room Compatibility Mappings
  await db.insert(procedureRoomCompatibility).values([
    { id: "comp_001", procedureName: "Basti", roomId: room1.id },
    { id: "comp_002", procedureName: "Basti", roomId: room4.id },
    { id: "comp_003", procedureName: "Shirodhara", roomId: room3.id },
    { id: "comp_004", procedureName: "Shirodhara", roomId: room4.id },
    { id: "comp_005", procedureName: "Abhyanga", roomId: room2.id },
    { id: "comp_006", procedureName: "Abhyanga", roomId: room4.id },
    { id: "comp_007", procedureName: "Abhyanga & Swedana", roomId: room1.id },
    { id: "comp_008", procedureName: "Abhyanga & Swedana", roomId: room2.id },
    { id: "comp_009", procedureName: "Abhyanga & Swedana", roomId: room3.id },
    { id: "comp_010", procedureName: "Abhyanga & Swedana", roomId: room4.id },
    { id: "comp_011", procedureName: "Snehana & Swedana", roomId: room1.id },
    { id: "comp_012", procedureName: "Snehana & Swedana", roomId: room2.id },
    { id: "comp_013", procedureName: "Snehana & Swedana", roomId: room3.id },
    { id: "comp_014", procedureName: "Snehana & Swedana", roomId: room4.id },
    { id: "comp_015", procedureName: "Deepana & Pachana", roomId: room1.id },
    { id: "comp_016", procedureName: "Deepana & Pachana", roomId: room2.id },
    { id: "comp_017", procedureName: "Deepana & Pachana", roomId: room3.id },
    { id: "comp_018", procedureName: "Deepana & Pachana", roomId: room4.id },
    { id: "comp_019", procedureName: "Samsarjana Krama", roomId: room1.id },
    { id: "comp_020", procedureName: "Samsarjana Krama", roomId: room2.id },
    { id: "comp_021", procedureName: "Samsarjana Krama", roomId: room3.id },
    { id: "comp_022", procedureName: "Samsarjana Krama", roomId: room4.id },
    { id: "comp_023", procedureName: "Rasayana", roomId: room1.id },
    { id: "comp_024", procedureName: "Rasayana", roomId: room2.id },
    { id: "comp_025", procedureName: "Rasayana", roomId: room3.id },
    { id: "comp_026", procedureName: "Rasayana", roomId: room4.id },
    { id: "comp_027", procedureName: "Swedana & Rest", roomId: room1.id },
    { id: "comp_028", procedureName: "Swedana & Rest", roomId: room2.id },
    { id: "comp_029", procedureName: "Swedana & Rest", roomId: room3.id },
    { id: "comp_030", procedureName: "Swedana & Rest", roomId: room4.id },
  ]);

  // 5. Create Standardized Therapy Courses
  const today = new Date();
  const arunStartDate = format(subDays(today, 3), "yyyy-MM-dd"); // Started 3 days ago: Day 1,2,3 completed, Day 4 is today
  const meeraStartDate = format(subDays(today, 5), "yyyy-MM-dd");
  const sureshStartDate = format(addDays(today, 1), "yyyy-MM-dd");

  const course1 = {
    id: "crs_basti_001",
    patientId: patient1.id,
    therapyName: "Basti Therapy",
    description: "Classical course of therapeutic herbal oil and decoction infusions for back nourishment and digestive balance.",
    durationDays: 7,
    startDate: arunStartDate,
    defaultSessionTime: "10:00",
    status: "ACTIVE" as const,
  };

  const course2 = {
    id: "crs_pancha_002",
    patientId: patient2.id,
    therapyName: "Panchakarma Therapy",
    description: "Comprehensive detoxification regimen including whole-body oil massage, herbal steam, and Shirodhara.",
    durationDays: 14,
    startDate: meeraStartDate,
    defaultSessionTime: "11:30",
    status: "ACTIVE" as const,
  };

  const course3 = {
    id: "crs_abhyanga_003",
    patientId: patient3.id,
    therapyName: "Abhyanga Therapy",
    description: "Full-body warm herbal oil therapy followed by therapeutic herbal steam for joint flexibility.",
    durationDays: 5,
    startDate: sureshStartDate,
    defaultSessionTime: "14:00",
    status: "ACTIVE" as const,
  };

  await db.insert(therapyCourses).values([course1, course2, course3]);

  // 6. Generate Sessions for Course 1 (Arun Sharma - 7 Days)
  const course1Sessions = [];
  const baseDate1 = subDays(today, 3);
  for (let i = 1; i <= 7; i++) {
    const sessionDate = format(addDays(baseDate1, i - 1), "yyyy-MM-dd");
    let status: "COMPLETED" | "SCHEDULED" = "SCHEDULED";
    let notes: string | null = null;
    let completedAt: string | null = null;
    let phase: "PURVAKARMA" | "PRADHANA_KARMA" | "PASCHAT_KARMA" = "PRADHANA_KARMA";
    let procedure = "Basti";
    let bp: string | null = null;
    let pulse: number | null = null;
    let temp: number | null = null;
    let weight: number | null = null;
    let symp: number | null = null;
    let pathya: string | null = null;
    let apathya: string | null = null;
    let lifestyle: string | null = null;

    if (i <= 2) {
      phase = "PURVAKARMA";
      procedure = i === 1 ? "Deepana & Pachana" : "Abhyanga & Swedana";
    } else if (i <= 5) {
      phase = "PRADHANA_KARMA";
      procedure = "Basti";
    } else {
      phase = "PASCHAT_KARMA";
      procedure = i === 6 ? "Samsarjana Krama" : "Rasayana";
    }

    if (i === 1) {
      status = "COMPLETED";
      notes = "Day 1 Initial therapy and herbal oil administration. Patient tolerated procedure smoothly. Advised warm water intake.";
      completedAt = `${sessionDate} 11:15:00`;
      bp = "122/80"; pulse = 74; temp = 98.4; weight = 71.0; symp = 6;
      pathya = "Warm rice gruel with rock salt, ginger water";
      apathya = "Cold food, yogurt, heavy pulses, fried items";
      lifestyle = "Avoid direct breeze/AC, maintain light warm rest";
    } else if (i === 2) {
      status = "COMPLETED";
      notes = "Day 2 Therapy completed smoothly. Retention time of 3.5 hours achieved. Patient reported noticeable ease in lower back.";
      completedAt = `${sessionDate} 11:10:00`;
      bp = "120/80"; pulse = 72; temp = 98.6; weight = 70.8; symp = 5;
      pathya = "Mung bean soup with ghee and roasted cumin";
      apathya = "Cold water, refrigerated items, oily foods";
      lifestyle = "Gentle walking after meals, early bedtime";
    } else if (i === 3) {
      status = "COMPLETED";
      notes = "Day 3 Herbal decoction therapy administered. Smooth response observed with zero abdominal discomfort.";
      completedAt = `${sessionDate} 11:20:00`;
      bp = "118/78"; pulse = 70; temp = 98.6; weight = 70.5; symp = 4;
      pathya = "Warm barley soup, steamed vegetables";
      apathya = "Raw salads, nightshades, bakery products";
      lifestyle = "Complete restful relaxation post-therapy";
    } else {
      status = "SCHEDULED";
      notes = null;
      completedAt = null;
      pathya = "Light warm satvik diet recommended";
      apathya = "Cold, heavy, spicy foods";
      lifestyle = "Avoid daytime sleep and physical strain";
    }

    course1Sessions.push({
      id: `ses_arun_day_${i}`,
      courseId: course1.id,
      patientId: patient1.id,
      therapistId: therapist1.id,
      roomId: room1.id, // Basti Suite
      dayNumber: i,
      sessionDate: sessionDate,
      startTime: "10:00",
      endTime: "11:00",
      status: status,
      phase,
      procedure,
      bloodPressure: bp,
      pulseRate: pulse,
      temperature: temp,
      weight,
      symptomScore: symp,
      pathya,
      apathya,
      lifestyleInstructions: lifestyle,
      treatmentNotes: notes,
      completedAt: completedAt,
    });
  }

  // 7. Generate Sessions for Course 2 (Meera Patel - 14 Days)
  const course2Sessions = [];
  const baseDate2 = subDays(today, 5);
  for (let i = 1; i <= 14; i++) {
    const sessionDate = format(addDays(baseDate2, i - 1), "yyyy-MM-dd");
    const isCompleted = i <= 5;
    let phase: "PURVAKARMA" | "PRADHANA_KARMA" | "PASCHAT_KARMA" = "PRADHANA_KARMA";
    let procedure = "Shirodhara";

    if (i <= 3) {
      phase = "PURVAKARMA";
      procedure = "Snehana & Swedana";
    } else if (i <= 10) {
      phase = "PRADHANA_KARMA";
      procedure = "Shirodhara";
    } else {
      phase = "PASCHAT_KARMA";
      procedure = "Rasayana";
    }

    course2Sessions.push({
      id: `ses_meera_day_${i}`,
      courseId: course2.id,
      patientId: patient2.id,
      therapistId: therapist2.id,
      roomId: room3.id, // Shirodhara Suite
      dayNumber: i,
      sessionDate: sessionDate,
      startTime: "11:30",
      endTime: "12:30",
      status: isCompleted ? ("COMPLETED" as const) : ("SCHEDULED" as const),
      phase,
      procedure,
      bloodPressure: isCompleted ? "116/76" : null,
      pulseRate: isCompleted ? 70 : null,
      temperature: isCompleted ? 98.6 : null,
      weight: isCompleted ? 58.2 : null,
      symptomScore: isCompleted ? Math.max(1, 6 - i) : null,
      pathya: "Warm milk with a pinch of nutmeg before sleep, light rice broth",
      apathya: "Caffeine, screen time after 8 PM, cold drinks",
      lifestyleInstructions: "Maintain head covering after Shirodhara, avoid cold breeze",
      treatmentNotes: isCompleted ? `Day ${i} Shirodhara completed. Patient reported deep relaxation and improved sleep.` : null,
      completedAt: isCompleted ? `${sessionDate} 12:40:00` : null,
    });
  }

  // 8. Generate Sessions for Course 3 (Suresh Iyer - 5 Days)
  const course3Sessions = [];
  const baseDate3 = addDays(today, 1);
  for (let i = 1; i <= 5; i++) {
    const sessionDate = format(addDays(baseDate3, i - 1), "yyyy-MM-dd");
    let phase: "PURVAKARMA" | "PRADHANA_KARMA" | "PASCHAT_KARMA" = "PRADHANA_KARMA";
    let procedure = "Abhyanga";

    if (i === 1) {
      phase = "PURVAKARMA";
      procedure = "Deepana & Pachana";
    } else if (i <= 4) {
      phase = "PRADHANA_KARMA";
      procedure = "Abhyanga";
    } else {
      phase = "PASCHAT_KARMA";
      procedure = "Swedana & Rest";
    }

    course3Sessions.push({
      id: `ses_suresh_day_${i}`,
      courseId: course3.id,
      patientId: patient3.id,
      therapistId: therapist1.id,
      roomId: room2.id, // Abhyanga Suite
      dayNumber: i,
      sessionDate: sessionDate,
      startTime: "14:00",
      endTime: "15:00",
      status: "SCHEDULED" as const,
      phase,
      procedure,
      bloodPressure: null,
      pulseRate: null,
      temperature: null,
      weight: null,
      symptomScore: null,
      pathya: "Warm cooked vegetables, hot water",
      apathya: "Heavy fried meals, ice water",
      lifestyleInstructions: "Rest after warm oil application",
      treatmentNotes: null,
      completedAt: null,
    });
  }

  await db.insert(therapySessions).values([...course1Sessions, ...course2Sessions, ...course3Sessions]);

  // 9. Initial Audit Logs
  await db.insert(auditLogs).values([
    {
      id: "aud_001",
      entityType: "COURSE",
      entityId: course1.id,
      action: "SESSION_CREATED",
      performedByUserId: adminUser.id,
      originalValue: null,
      newValue: JSON.stringify({ therapyName: "Basti Therapy", durationDays: 7, startDate: arunStartDate }),
      reason: "Initial course creation and schedule generation",
    },
    {
      id: "aud_002",
      entityType: "COURSE",
      entityId: course2.id,
      action: "SESSION_CREATED",
      performedByUserId: adminUser.id,
      originalValue: null,
      newValue: JSON.stringify({ therapyName: "Panchakarma Therapy", durationDays: 14, startDate: meeraStartDate }),
      reason: "Initial course creation and schedule generation",
    }
  ]);

  // 10. Create Standardized English Notifications
  await db.insert(notifications).values([
    {
      id: "notif_001",
      userId: patientUser1.id,
      sessionId: "ses_arun_day_4",
      title: "Today's Basti Therapy Reminder",
      message: "Reminder: Your Basti Therapy (Day 4) is scheduled for today at 10:00 AM in Basti Suite (Room 101). Please arrive 10 minutes prior.",
      type: "REMINDER" as const,
      isRead: false,
      scheduledFor: `${format(today, "yyyy-MM-dd")} 10:00`,
    },
    {
      id: "notif_002",
      userId: patientUser1.id,
      sessionId: "ses_arun_day_3",
      title: "Day 3 Session Completed",
      message: "Your Day 3 session notes have been recorded by Dr. Rajesh Kumar. Remember to maintain light, warm meals today.",
      type: "STATUS" as const,
      isRead: true,
      scheduledFor: `${format(subDays(today, 1), "yyyy-MM-dd")} 11:20`,
    },
    {
      id: "notif_003",
      userId: patientUser2.id,
      sessionId: "ses_meera_day_6",
      title: "Upcoming Shirodhara Therapy",
      message: "Reminder: Your Day 6 session is scheduled for today at 11:30 AM in Shirodhara Suite (Room 103).",
      type: "REMINDER" as const,
      isRead: false,
      scheduledFor: `${format(today, "yyyy-MM-dd")} 11:30`,
    },
    {
      id: "notif_004",
      userId: therapistUser1.id,
      sessionId: "ses_arun_day_4",
      title: "Today's Clinical Schedule",
      message: "You have therapy sessions assigned today: Arun Sharma (10:00 AM) in Basti Suite.",
      type: "ALERT" as const,
      isRead: false,
      scheduledFor: `${format(today, "yyyy-MM-dd")} 09:00`,
    },
    {
      id: "notif_005",
      userId: adminUser.id,
      sessionId: null,
      title: "Clinic Operations Summary",
      message: "System initialized. 3 active Panchakarma courses running smoothly across 3 treatment suites.",
      type: "SYSTEM" as const,
      isRead: false,
      scheduledFor: `${format(today, "yyyy-MM-dd")} 08:00`,
    }
  ]);

  // 11. Create Standardized English Chat Messages
  await db.insert(chatMessages).values([
    {
      id: "chat_001",
      userId: patientUser1.id,
      role: "USER" as const,
      message: "Hello! What diet guidelines should I follow during my 7-day Basti therapy course?",
    },
    {
      id: "chat_002",
      userId: patientUser1.id,
      role: "ASSISTANT" as const,
      message: "Hello Arun. During your Basti therapy, your digestive system is undergoing active cleansing. Follow these dietary recommendations:\n- Eat light, warm, freshly cooked meals such as warm rice soup, vegetable broths, or boiled grains with a teaspoon of ghee.\n- Drink warm water throughout the day; avoid cold or iced drinks.\n- Avoid heavy, oily, fried, or processed foods, cold salads, and late-night snacking.\n- Rest well after each session and avoid strenuous physical exertion.\n\nIf you experience any specific discomfort, always consult Dr. Rajesh Kumar directly.",
    }
  ]);

  // Hackathon: therapist qualifications (which procedures each therapist is trained to perform)
  const QUALIFICATIONS: Record<string, string[]> = {
    thp_001: ["Basti", "Abhyanga", "Abhyanga & Swedana", "Snehana & Swedana", "Deepana & Pachana", "Samsarjana Krama", "Rasayana", "Swedana & Rest"],
    thp_002: ["Shirodhara", "Snehana & Swedana", "Abhyanga & Swedana", "Samsarjana Krama", "Rasayana"],
    thp_003: ["Basti", "Abhyanga", "Abhyanga & Swedana", "Snehana & Swedana", "Deepana & Pachana", "Samsarjana Krama", "Rasayana", "Swedana & Rest", "Nasya"],
  };
  const insertQual = sqlite.prepare(`INSERT INTO therapist_qualifications (id, therapist_id, procedure_name) VALUES (?, ?, ?)`);
  for (const [thpId, procs] of Object.entries(QUALIFICATIONS)) {
    procs.forEach((proc, i) => insertQual.run(`qual_${thpId}_${i + 1}`, thpId, proc));
  }

  // Hackathon: sample daily wellness logs for Arun Sharma (Days 1-3 of the Basti course)
  const insertLog = sqlite.prepare(`
    INSERT INTO wellness_logs (id, patient_id, course_id, day_number, log_date, breakfast, lunch, dinner,
      agni_status, bowel_status, reactions, energy_level, discomfort_level, notes, ai_guidance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const sampleLogs = [
    { day: 1, breakfast: "Rice kanji with a little ghee", lunch: "Moong dal khichdi", dinner: "Vegetable soup", agni: "MANDA", bowel: "CONSTIPATED", reactions: ["Heaviness", "Mild bloating"], energy: 2, discomfort: 4, notes: "Felt heavy after lunch." },
    { day: 2, breakfast: "Warm poha", lunch: "Khichdi with buttermilk", dinner: "Rice soup", agni: "VISHAMA", bowel: "NORMAL", reactions: ["Mild fatigue"], energy: 3, discomfort: 3, notes: "Appetite was irregular in the evening." },
    { day: 3, breakfast: "Rice kanji", lunch: "Khichdi with ghee", dinner: "Moong soup", agni: "SAMA", bowel: "NORMAL", reactions: ["Light and relaxed"], energy: 4, discomfort: 1, notes: "Felt much lighter after the session." },
  ];
  for (const l of sampleLogs) {
    const guidance = {
      source: "rule-based",
      summary: `Day ${l.day} entry reviewed.`,
      preTreatment: ["Have a light, warm breakfast at least two hours before your session.", "Sip warm water through the morning."],
      postTreatment: ["Rest for at least 30 minutes after the session.", "Avoid cold drinks and heavy, fried food for the rest of the day."],
      alerts: [] as string[],
    };
    insertLog.run(`wl_seed_${l.day}`, patient1.id, course1.id, l.day, format(addDays(baseDate1, l.day - 1), "yyyy-MM-dd"),
      l.breakfast, l.lunch, l.dinner, l.agni, l.bowel, JSON.stringify(l.reactions), l.energy, l.discomfort, l.notes, JSON.stringify(guidance));
  }

  console.log("Database seeded successfully with standardized treatments and suites!");
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seedDatabase()
    .then(() => {
      sqlite.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      sqlite.close();
      process.exit(1);
    });
}
