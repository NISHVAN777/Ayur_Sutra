import React from "react";
import { CourseCreationWizard } from "../../components/wizard/CourseCreationWizard";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const CreateCoursePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Link
        to="/admin/courses"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Therapy Courses
      </Link>

      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">
          Panchakarma Multi-Day Course Scheduler
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Atomic multi-day scheduling engine with full therapist & room conflict detection.
        </p>
      </div>

      <CourseCreationWizard />
    </div>
  );
};
