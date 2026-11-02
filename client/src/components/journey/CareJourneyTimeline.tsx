import React from "react";
import { TherapyCourse, TherapySession } from "../../types";
import { formatDate, formatTime } from "../../utils/formatters";
import { StatusBadge } from "../common/StatusBadge";
import { CheckCircle2, Clock, Calendar, Sparkles, User, DoorOpen, PauseCircle, Activity, Heart, Thermometer, Scale } from "lucide-react";

interface CareJourneyTimelineProps {
  course: TherapyCourse;
}

export const CareJourneyTimeline: React.FC<CareJourneyTimelineProps> = ({ course }) => {
  const sessions = course.sessions || [];
  const total = course.durationDays;
  const completed = sessions.filter((s) => s.status === "COMPLETED").length;
  const progress = total > 0 ? Math.min(100, Number(((completed / total) * 100).toFixed(1))) : 0;
  const nextSession = sessions.find((s) => s.status === "SCHEDULED");
  const isPaused = course.status === "PAUSED";

  return (
    <div className="space-y-6">
      {/* Paused Course Alert */}
      {isPaused && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center gap-3 text-amber-900 text-xs">
          <PauseCircle className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <strong className="text-sm font-bold block">Therapy Course Currently Paused</strong>
            <span>Your treatment journey is temporarily paused. Resuming the course will automatically update and revalidate subsequent session dates with your practitioner.</span>
          </div>
        </div>
      )}

      {/* Header Progress Card */}
      <div className="bg-gradient-to-br from-ayur-800 to-ayur-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-ayur-200 text-xs font-semibold uppercase tracking-wider backdrop-blur-xs mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Classical Panchakarma Care Journey
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif">{course.therapyName}</h2>
            <p className="text-ayur-200 text-xs mt-1.5 max-w-xl leading-relaxed">
              {course.description || "Contiguous multi-day Ayurvedic Panchakarma therapeutic protocol with preparatory, primary, and restorative phases."}
            </p>
          </div>

          {/* Progress Gauge */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-center min-w-[200px] shrink-0">
            <div className="text-3xl font-bold font-serif text-white">{progress}%</div>
            <div className="text-xs uppercase font-semibold text-ayur-200 mt-0.5">
              Day {completed} of {total} Completed
            </div>
            <div className="w-full bg-black/30 h-2 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-saffron-400 to-saffron-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Next Session Highlight */}
        {nextSession && !isPaused && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-saffron-500/20 text-saffron-300 border border-saffron-500/30">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-ayur-300 font-semibold block text-[10px] uppercase tracking-wider">
                  Upcoming Session • Day {nextSession.dayNumber}
                </span>
                <strong className="text-sm font-bold text-white">
                  {nextSession.procedure || course.therapyName} — {formatDate(nextSession.sessionDate)} at {formatTime(nextSession.startTime)}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-4 text-ayur-200">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-saffron-400" /> {nextSession.therapist?.user.name}
              </span>
              <span className="flex items-center gap-1.5">
                <DoorOpen className="w-4 h-4 text-saffron-400" /> {nextSession.room?.roomName}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Day 1..Day N Visual Timeline */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-stone-900 font-serif mb-6 flex items-center gap-2">
          <span>🌿</span> Panchakarma Protocol & Daily Session Timeline
        </h3>

        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
          {sessions.map((session) => {
            const isCompleted = session.status === "COMPLETED";
            const isNext = nextSession?.id === session.id;

            const phaseBadge =
              session.phase === "PURVAKARMA"
                ? { label: "Purvakarma (Preparatory)", color: "bg-amber-100 text-amber-900 border-amber-200" }
                : session.phase === "PRADHANA_KARMA"
                ? { label: "Pradhana Karma (Primary)", color: "bg-ayur-100 text-ayur-900 border-ayur-200" }
                : session.phase === "PASCHAT_KARMA"
                ? { label: "Paschat Karma (Restorative)", color: "bg-purple-100 text-purple-900 border-purple-200" }
                : null;

            return (
              <div key={session.id} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-[27px] sm:-left-[35px] top-1 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isNext
                      ? "bg-saffron-500 text-white animate-bounce"
                      : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : session.dayNumber}
                </div>

                {/* Session Card */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isCompleted
                      ? "bg-emerald-50/40 border-emerald-200/80"
                      : isNext
                      ? "bg-saffron-50/40 border-saffron-300 ring-1 ring-saffron-400"
                      : "bg-stone-50/50 border-stone-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm font-serif text-stone-900">
                          Day {session.dayNumber}
                        </span>
                        {phaseBadge && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${phaseBadge.color}`}>
                            {phaseBadge.label}
                          </span>
                        )}
                        <StatusBadge status={session.status} size="sm" />
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        📅 {formatDate(session.sessionDate)} • ⏰ {formatTime(session.startTime)} - {formatTime(session.endTime)}
                      </p>
                    </div>

                    <div className="text-xs text-stone-600 sm:text-right">
                      <div>👨‍⚕️ {session.therapist?.user.name}</div>
                      <div className="text-stone-400 text-[11px]">
                        {session.room?.roomName} ({session.room?.roomNumber})
                      </div>
                    </div>
                  </div>

                  {/* Procedure Details */}
                  {session.procedure && (
                    <div className="mt-2 text-xs text-ayur-950 font-semibold bg-white p-2.5 rounded-lg border border-stone-200/80 flex items-center justify-between">
                      <span>Procedure: <strong>{session.procedure}</strong></span>
                    </div>
                  )}

                  {/* Clinical Vitals if completed */}
                  {(session.bloodPressure || session.pulseRate || session.temperature || session.weight || session.symptomScore) && (
                    <div className="mt-2 p-2.5 bg-white border border-stone-200 rounded-lg grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] text-stone-700">
                      {session.bloodPressure && <div><strong>BP:</strong> {session.bloodPressure}</div>}
                      {session.pulseRate && <div><strong>Pulse:</strong> {session.pulseRate} bpm</div>}
                      {session.temperature && <div><strong>Temp:</strong> {session.temperature} °F</div>}
                      {session.weight && <div><strong>Weight:</strong> {session.weight} kg</div>}
                      {session.symptomScore && <div><strong>Symptom Score:</strong> {session.symptomScore}/10</div>}
                    </div>
                  )}

                  {/* Pathya / Apathya / Lifestyle */}
                  {(session.pathya || session.apathya || session.lifestyleInstructions) && (
                    <div className="mt-2 p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-lg space-y-1 text-[11px] text-stone-800">
                      {session.pathya && <div>🌿 <strong>Pathya (Diet):</strong> {session.pathya}</div>}
                      {session.apathya && <div>🚫 <strong>Apathya (Avoid):</strong> {session.apathya}</div>}
                      {session.lifestyleInstructions && <div>🧘 <strong>Lifestyle:</strong> {session.lifestyleInstructions}</div>}
                    </div>
                  )}

                  {/* Treatment notes if completed */}
                  {session.treatmentNotes && (
                    <div className="mt-3 pt-3 border-t border-stone-200/60 bg-white/70 p-3 rounded-lg text-xs text-stone-700">
                      <strong className="text-stone-900 block mb-0.5 text-[11px] font-serif">
                        Clinical & Treatment Observations:
                      </strong>
                      <p className="leading-relaxed italic">"{session.treatmentNotes}"</p>
                      {session.completedAt && (
                        <span className="text-[10px] text-stone-400 block mt-1">
                          Recorded on: {formatDate(session.completedAt.substring(0, 10))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

