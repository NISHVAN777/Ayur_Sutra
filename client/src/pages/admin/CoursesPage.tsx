import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { courseService } from "../../services/courseService";
import { TherapyCourse } from "../../types";
import { FilePlus2, Eye, XCircle, PauseCircle, PlayCircle } from "lucide-react";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { StatusBadge } from "../../components/common/StatusBadge";
import { formatDate, formatTime } from "../../utils/formatters";

export const CoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<TherapyCourse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const res = await courseService.getAll({
        status: statusFilter || undefined,
      });
      setCourses(res.courses);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [statusFilter]);

  const handlePauseCourse = async (id: string, name: string) => {
    const reason = window.prompt(`Enter reason for pausing "${name}":`, "Temporary clinical pause");
    if (!reason) return;
    try {
      await courseService.pause(id, reason);
      loadCourses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResumeCourse = async (id: string) => {
    if (!window.confirm("Resume this therapy course?")) return;
    try {
      await courseService.resume(id, "Course resumed by admin");
      loadCourses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelCourse = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to cancel the therapy course "${name}"?`)) return;
    try {
      await courseService.cancel(id);
      loadCourses();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">Panchakarma Therapy Courses</h1>
          <p className="text-xs text-stone-500 mt-1">
            Contiguous multi-day patient treatment journeys, progress tracking, and lifecycle controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-ayur-600"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Courses</option>
            <option value="PAUSED">Paused Courses</option>
            <option value="COMPLETED">Completed Courses</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <Link
            to="/admin/courses/create"
            className="flex items-center gap-1.5 px-4 py-2 bg-ayur-700 hover:bg-ayur-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0"
          >
            <FilePlus2 className="w-4 h-4" /> Schedule New Course
          </Link>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading courses..." />
      ) : (
        <div className="space-y-4">
          {courses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-xs text-stone-500">
              No therapy courses found.
            </div>
          ) : (
            courses.map((course) => (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-base font-serif text-stone-900">
                        {course.therapyName}
                      </h3>
                      <StatusBadge status={course.status} size="sm" />
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                        {course.durationDays} Days
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mt-2">
                      <span>
                        Patient: <strong className="text-stone-800">{course.patientName}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Therapist: <strong className="text-stone-800">{course.primaryTherapist}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Suite: <strong className="text-stone-800">{course.primaryRoom}</strong>
                      </span>
                      <span>•</span>
                      <span>Start: {formatDate(course.startDate)}</span>
                    </div>
                  </div>

                  <div className="md:w-56 shrink-0 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1">
                      <span>Day {course.stats?.completedSessions || 0} of {course.durationDays}</span>
                      <span>{course.stats?.progressPercentage || 0}%</span>
                    </div>
                    <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-ayur-600 to-ayur-800 h-full rounded-full"
                        style={{ width: `${course.stats?.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-stone-500 text-[11px]">
                    {course.nextSession ? (
                      <span>
                        Next session: <strong>Day {course.nextSession.dayNumber}</strong> on {formatDate(course.nextSession.sessionDate)} at {formatTime(course.nextSession.startTime)}
                      </span>
                    ) : course.status === "COMPLETED" ? (
                      <span className="text-emerald-700 font-semibold">✓ All therapy sessions completed</span>
                    ) : (
                      <span>No pending scheduled sessions</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {course.status === "ACTIVE" && (
                      <button
                        onClick={() => handlePauseCourse(course.id, course.therapyName)}
                        className="px-3 py-1 text-[11px] text-amber-700 hover:bg-amber-50 rounded-lg font-semibold transition-colors flex items-center gap-1"
                      >
                        <PauseCircle className="w-3.5 h-3.5" /> Pause Course
                      </button>
                    )}

                    {course.status === "PAUSED" && (
                      <button
                        onClick={() => handleResumeCourse(course.id)}
                        className="px-3 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50 rounded-lg font-semibold transition-colors flex items-center gap-1"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Resume Course
                      </button>
                    )}

                    {(course.status === "ACTIVE" || course.status === "PAUSED") && (
                      <button
                        onClick={() => handleCancelCourse(course.id, course.therapyName)}
                        className="px-3 py-1 text-[11px] text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel Course
                      </button>
                    )}

                    <Link
                      to={`/admin/courses/${course.id}`}
                      className="px-3 py-1 bg-stone-100 hover:bg-ayur-50 hover:text-ayur-800 text-stone-800 rounded-lg font-semibold text-[11px] transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Day-by-Day Journey
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
