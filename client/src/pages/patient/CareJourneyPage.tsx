import React, { useState, useEffect } from "react";
import { patientService } from "../../services/patientService";
import { TherapyCourse } from "../../types";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { CareJourneyTimeline } from "../../components/journey/CareJourneyTimeline";

export const CareJourneyPage: React.FC = () => {
  const [course, setCourse] = useState<TherapyCourse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadCourse() {
      try {
        const res = await patientService.getCourse();
        setCourse(res.activeCourse);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCourse();
  }, []);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading your care journey..." />;
  }

  if (!course) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-xs text-stone-500">
        No active therapy course found. Please check back after consultation.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CareJourneyTimeline course={course} />
    </div>
  );
};
