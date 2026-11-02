import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { courseService } from "../../services/courseService";
import { TherapyCourse } from "../../types";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { CareJourneyTimeline } from "../../components/journey/CareJourneyTimeline";
import { ArrowLeft, User, Phone } from "lucide-react";

export const CourseDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<TherapyCourse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadCourse() {
      if (!id) return;
      try {
        const res = await courseService.getById(id);
        setCourse(res.course);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCourse();
  }, [id]);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading Panchakarma journey timeline..." />;
  }

  if (!course) {
    return (
      <div className="p-8 text-center text-stone-500">
        <p>Therapy course not found.</p>
        <Link to="/admin/courses" className="text-ayur-700 underline mt-2 block">
          Return to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/courses"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Therapy Courses
      </Link>

      <CareJourneyTimeline course={course} />
    </div>
  );
};
