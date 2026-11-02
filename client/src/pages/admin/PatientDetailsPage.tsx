import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { patientService } from "../../services/patientService";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { CareJourneyTimeline } from "../../components/journey/CareJourneyTimeline";
import { FilePlus2, ArrowLeft } from "lucide-react";
import { formatDate } from "../../utils/formatters";

export const PatientDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadPatient() {
      if (!id) return;
      try {
        const res = await patientService.getById(id);
        setPatient(res.patient);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPatient();
  }, [id]);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading patient record..." />;
  }

  if (!patient) {
    return (
      <div className="p-8 text-center text-stone-500">
        <p>Patient not found.</p>
        <Link to="/admin/patients" className="text-ayur-700 underline mt-2 block">
          Return to Patients
        </Link>
      </div>
    );
  }

  const activeCourse = patient.therapyCourses?.find((c: any) => c.status === "ACTIVE");

  return (
    <div className="space-y-8">
      <Link
        to="/admin/patients"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Patient Directory
      </Link>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-ayur-100 border border-ayur-200 text-ayur-800 flex items-center justify-center font-serif font-bold text-2xl">
              {patient.user.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold font-serif text-stone-900">{patient.user.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mt-1">
                <span>📧 {patient.user.email}</span>
                <span>📞 {patient.phone}</span>
                <span>🎂 {formatDate(patient.dateOfBirth)} ({patient.gender})</span>
              </div>
            </div>
          </div>

          <Link
            to="/admin/courses/create"
            className="flex items-center gap-1.5 px-4 py-2 bg-ayur-700 hover:bg-ayur-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all shrink-0"
          >
            <FilePlus2 className="w-4 h-4" /> Schedule Course For Patient
          </Link>
        </div>

        {patient.medicalNotes && (
          <div className="mt-6 pt-6 border-t border-stone-100 bg-stone-50 p-4 rounded-xl text-xs text-stone-700">
            <strong className="block text-stone-900 mb-1 font-serif">
              Clinical Medical Notes & Dosha Observations:
            </strong>
            <p className="leading-relaxed">{patient.medicalNotes}</p>
          </div>
        )}
      </div>

      {activeCourse ? (
        <div>
          <h2 className="text-xl font-bold font-serif text-stone-900 mb-4">
            Active Therapy Course
          </h2>
          <CareJourneyTimeline course={activeCourse} />
        </div>
      ) : (
        <div className="bg-stone-50 rounded-2xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-500">
          <p>No active Panchakarma courses are currently running for this patient.</p>
          <Link
            to="/admin/courses/create"
            className="mt-3 inline-block font-semibold text-ayur-700 hover:underline"
          >
            Schedule a new multi-day therapy course →
          </Link>
        </div>
      )}
    </div>
  );
};
