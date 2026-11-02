import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Calendar,
  Clock,
  UserCheck,
  DoorOpen,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Search,
} from "lucide-react";
import { patientService } from "../../services/patientService";
import { therapistService } from "../../services/therapistService";
import { roomService } from "../../services/roomService";
import { courseService } from "../../services/courseService";
import { Patient, Therapist, TreatmentRoom, AvailabilityResult } from "../../types";
import { format, addDays } from "date-fns";
import { formatTime, formatDate } from "../../utils/formatters";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { Alert } from "../common/Alert";

const THERAPY_OPTIONS = [
  {
    name: "Basti Therapy",
    defaultDuration: 7,
    description: "Therapeutic herbal oil and decoction infusions for back nourishment and digestive balance.",
    idealTime: "10:00",
  },
  {
    name: "Abhyanga Therapy",
    defaultDuration: 5,
    description: "Full-body warm herbal oil therapy followed by therapeutic medicinal steam for joint flexibility.",
    idealTime: "14:00",
  },
  {
    name: "Shirodhara Therapy",
    defaultDuration: 7,
    description: "Continuous stream of medicated warm herbal oil on the forehead for deep mental relaxation and stress relief.",
    idealTime: "11:00",
  },
  {
    name: "Nasya Therapy",
    defaultDuration: 5,
    description: "Facial steam and nasal administration of therapeutic herbal oils for sinus and respiratory clarity.",
    idealTime: "08:30",
  },
  {
    name: "Panchakarma Therapy",
    defaultDuration: 14,
    description: "Comprehensive multi-modality detoxification sequence combining oil therapy, herbal steam, and targeted cleansing procedures.",
    idealTime: "09:30",
  },
];

export const CourseCreationWizard: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Step (1 to 8)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [therapyName, setTherapyName] = useState<string>(THERAPY_OPTIONS[0].name);
  const [therapyDescription, setTherapyDescription] = useState<string>(THERAPY_OPTIONS[0].description);
  const [durationDays, setDurationDays] = useState<number>(7);
  const [startDate, setStartDate] = useState<string>(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<TreatmentRoom | null>(null);
  const [sessionTime, setSessionTime] = useState<string>("10:00");

  // Lookup Options
  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [rooms, setRooms] = useState<TreatmentRoom[]>([]);
  const [patientSearch, setPatientSearch] = useState<string>("");

  // Availability / Preview State
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [availabilityResult, setAvailabilityResult] = useState<AvailabilityResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load initial options
  useEffect(() => {
    async function loadData() {
      try {
        const [patData, thpData, roomData] = await Promise.all([
          patientService.getAll(),
          therapistService.getAll(),
          roomService.getAll("ACTIVE"),
        ]);
        setPatients(patData.patients);
        setTherapists(thpData.therapists);
        setRooms(roomData.rooms);

        if (thpData.therapists.length > 0) setSelectedTherapist(thpData.therapists[0]);
        if (roomData.rooms.length > 0) setSelectedRoom(roomData.rooms[0]);
      } catch (err) {
        console.error("Failed to load options", err);
      }
    }
    loadData();
  }, []);

  // Filtered patients
  const filteredPatients = patients.filter(
    (p) =>
      p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone.includes(patientSearch) ||
      p.email?.toLowerCase().includes(patientSearch.toLowerCase())
  );

  // Check Availability
  const handleCheckAvailability = async () => {
    if (!selectedTherapist || !selectedRoom) return;
    setIsChecking(true);
    setErrorMessage(null);
    try {
      const result = await courseService.checkAvailability({
        durationDays,
        startDate,
        therapistId: selectedTherapist.id,
        roomId: selectedRoom.id,
        sessionTime,
      });
      setAvailabilityResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to check availability.");
    } finally {
      setIsChecking(false);
    }
  };

  // Auto trigger availability check when entering Step 8
  useEffect(() => {
    if (currentStep === 8 && selectedPatient && selectedTherapist && selectedRoom) {
      handleCheckAvailability();
    }
  }, [currentStep]);

  // Submit and Schedule Course
  const handleScheduleCourse = async () => {
    if (!selectedPatient || !selectedTherapist || !selectedRoom) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await courseService.create({
        patientId: selectedPatient.id,
        therapyName,
        description: therapyDescription,
        durationDays,
        startDate,
        therapistId: selectedTherapist.id,
        roomId: selectedRoom.id,
        defaultSessionTime: sessionTime,
      });

      // Redirect to course details or courses list
      navigate(`/admin/courses/${res.course.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Scheduling conflict detected. Course rolled back.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8">
      {/* Wizard Steps Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
          <span>STEP {currentStep} OF 8</span>
          <span className="text-ayur-700 font-bold uppercase">
            {
              [
                "Patient",
                "Therapy Type",
                "Duration",
                "Start Date",
                "Therapist",
                "Treatment Suite",
                "Session Time",
                "Preview & Schedule",
              ][currentStep - 1]
            }
          </span>
        </div>
        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-ayur-600 to-ayur-800 h-2 transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / 8) * 100}%` }}
          />
        </div>
      </div>

      {errorMessage && (
        <Alert type="error" title="Scheduling Notice" className="mb-6">
          {errorMessage}
        </Alert>
      )}

      {/* STEP 1: Select Patient */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-lg font-bold text-stone-900 font-serif">Select Patient</h3>
          <p className="text-xs text-stone-500">
            Choose the patient who will undergo this contiguous multi-day Panchakarma journey.
          </p>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={patientSearch}
              onChange={(e) => setPatientSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ayur-500/20 focus:border-ayur-600"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {filteredPatients.map((p) => {
              const isSelected = selectedPatient?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-ayur-50/80 border-ayur-600 ring-1 ring-ayur-600"
                      : "bg-white border-stone-200 hover:border-ayur-300"
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-stone-900">{p.name}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5">
                      {p.gender}, DoB: {p.dateOfBirth} • 📞 {p.phone}
                    </div>
                    {p.medicalNotes && (
                      <div className="text-[10px] text-stone-400 mt-1 line-clamp-1">
                        Notes: {p.medicalNotes}
                      </div>
                    )}
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-ayur-700 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: Select Therapy */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-lg font-bold text-stone-900 font-serif">Select Therapy Program</h3>
          <p className="text-xs text-stone-500">
            Select the classical Panchakarma regimen or enter custom details.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {THERAPY_OPTIONS.map((t) => {
              const isSelected = therapyName === t.name;
              return (
                <div
                  key={t.name}
                  onClick={() => {
                    setTherapyName(t.name);
                    setTherapyDescription(t.description);
                    setDurationDays(t.defaultDuration);
                    setSessionTime(t.idealTime);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-ayur-50/80 border-ayur-600 ring-1 ring-ayur-600"
                      : "bg-white border-stone-200 hover:border-ayur-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-900 font-serif">{t.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                      {t.defaultDuration} Days
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">{t.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: Select Duration */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-lg font-bold text-stone-900 font-serif">Select Course Duration</h3>
          <p className="text-xs text-stone-500">
            A continuous series of daily sessions will be automatically generated for the selected duration.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[5, 7, 14, 21].map((days) => {
              const isSelected = durationDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationDays(days)}
                  className={`p-5 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? "bg-ayur-700 text-white border-ayur-700 shadow-md shadow-ayur-900/20"
                      : "bg-white text-stone-800 border-stone-200 hover:border-ayur-400"
                  }`}
                >
                  <div className="text-2xl font-bold font-serif">{days}</div>
                  <div className="text-xs uppercase font-semibold mt-1">Days</div>
                  <div
                    className={`text-[10px] mt-2 ${
                      isSelected ? "text-ayur-100" : "text-stone-400"
                    }`}
                  >
                    {days} Connected Sessions
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4: Select Start Date */}
      {currentStep === 4 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-lg font-bold text-stone-900 font-serif">Select Journey Start Date</h3>
          <p className="text-xs text-stone-500">
            Day 1 will commence on this date. Day N will conclude on{" "}
            <strong className="text-stone-900">
              {formatDate(format(addDays(new Date(startDate), durationDays - 1), "yyyy-MM-dd"))}
            </strong>
            .
          </p>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Start Date (Day 1)
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ayur-500/20 focus:border-ayur-600 font-medium"
            />
          </div>
        </div>
      )}

      {/* STEP 5: Select Therapist */}
      {currentStep === 5 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-lg font-bold text-stone-900 font-serif">Assign Ayurvedic Therapist</h3>
          <p className="text-xs text-stone-500">
            The assigned Vaidya/Therapist will oversee all {durationDays} sessions.
          </p>

          <div className="space-y-2">
            {therapists.map((t) => {
              const isSelected = selectedTherapist?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTherapist(t)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? "bg-ayur-50/80 border-ayur-600 ring-1 ring-ayur-600"
                      : "bg-white border-stone-200 hover:border-ayur-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-ayur-100 text-ayur-800 flex items-center justify-center font-bold text-xs">
                      {t.name?.charAt(0) || "T"}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-stone-900">{t.name}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        {t.specialization} • Experience: {t.experience}
                      </div>
                    </div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-ayur-700 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 6: Select Treatment Room */}
      {currentStep === 6 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-lg font-bold text-stone-900 font-serif">Select Treatment Room</h3>
          <p className="text-xs text-stone-500">
            Choose an active room equipped for this therapy modality.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rooms.map((r) => {
              const isSelected = selectedRoom?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoom(r)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-ayur-50/80 border-ayur-600 ring-1 ring-ayur-600"
                      : "bg-white border-stone-200 hover:border-ayur-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-900 font-serif">{r.roomName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                      Room {r.roomNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                    {r.description || "Standard therapy room."}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 7: Select Session Time */}
      {currentStep === 7 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <h3 className="text-lg font-bold text-stone-900 font-serif">Select Daily Session Time</h3>
          <p className="text-xs text-stone-500">
            Each daily session will be scheduled at this time for 60 minutes.
          </p>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Daily Start Time (24h format)
            </label>
            <input
              type="time"
              value={sessionTime}
              onChange={(e) => setSessionTime(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ayur-500/20 focus:border-ayur-600 font-medium"
            />
          </div>
        </div>
      )}

      {/* STEP 8: Preview & Conflict Check */}
      {currentStep === 8 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h3 className="text-lg font-bold text-stone-900 font-serif">
              Generated Multi-Day Journey Preview
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Review all {durationDays} daily sessions and verify conflict-free status before scheduling.
            </p>
          </div>

          {/* Course Summary Pill */}
          <div className="p-4 rounded-xl bg-ayur-50/60 border border-ayur-200/80 flex flex-wrap gap-4 text-xs">
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Patient</span>
              <strong className="text-stone-900">{selectedPatient?.name}</strong>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Therapy</span>
              <strong className="text-stone-900">{therapyName}</strong>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Therapist</span>
              <strong className="text-stone-900">{selectedTherapist?.name}</strong>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-bold">Room</span>
              <strong className="text-stone-900">
                {selectedRoom?.roomName} ({selectedRoom?.roomNumber})
              </strong>
            </div>
          </div>

          {/* Availability Status Badge */}
          {isChecking ? (
            <LoadingSpinner size="sm" text="Checking therapist & room availability across all days..." />
          ) : availabilityResult ? (
            availabilityResult.isAvailable ? (
              <Alert type="success" title="Availability Confirmed">
                All {durationDays} sessions are completely conflict-free. No overlapping therapist or room bookings found.
              </Alert>
            ) : (
              <Alert type="error" title="Scheduling Conflict Detected">
                {availabilityResult.firstConflict?.message ||
                  "One or more sessions have a booking conflict. Please adjust the start date or time."}
              </Alert>
            )
          ) : null}

          {/* Generated Day 1..Day N Table */}
          <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="px-3 py-2.5">Day</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Time</th>
                  <th className="px-3 py-2.5">Therapist</th>
                  <th className="px-3 py-2.5">Room</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {availabilityResult?.sessions.map((s) => (
                  <tr
                    key={s.dayNumber}
                    className={s.hasConflict ? "bg-rose-50/70" : "hover:bg-stone-50"}
                  >
                    <td className="px-3 py-2 font-bold text-ayur-800">Day {s.dayNumber}</td>
                    <td className="px-3 py-2 text-stone-700">{formatDate(s.sessionDate)}</td>
                    <td className="px-3 py-2 text-stone-600">
                      {formatTime(s.startTime)} - {formatTime(s.endTime)}
                    </td>
                    <td className="px-3 py-2 text-stone-800 font-medium">{s.therapistName}</td>
                    <td className="px-3 py-2 text-stone-600">Room {s.roomNumber}</td>
                    <td className="px-3 py-2">
                      {s.hasConflict ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          Conflict
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          Available
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((prev) => prev - 1)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <div />
        )}

        {currentStep < 8 ? (
          <button
            type="button"
            disabled={
              (currentStep === 1 && !selectedPatient) ||
              (currentStep === 5 && !selectedTherapist) ||
              (currentStep === 6 && !selectedRoom)
            }
            onClick={() => setCurrentStep((prev) => prev + 1)}
            className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-ayur-700 hover:bg-ayur-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-ayur-900/10"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCheckAvailability}
              disabled={isChecking}
              className="px-4 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
            >
              Re-check Availability
            </button>
            <button
              type="button"
              onClick={handleScheduleCourse}
              disabled={isSubmitting || isChecking || !availabilityResult?.isAvailable}
              className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-ayur-700 to-ayur-900 hover:from-ayur-800 hover:to-ayur-950 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-ayur-900/20"
            >
              {isSubmitting ? "Scheduling Atomic Course..." : "Schedule Complete Course"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
