import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../services/adminService";
import { requestService } from "../../services/requestService";
import { therapistService } from "../../services/therapistService";
import { roomService } from "../../services/roomService";
import { DashboardStats, TherapySession, Notification, SessionRequest, Therapist, TreatmentRoom } from "../../types";
import {
  Users,
  Layers,
  CalendarClock,
  UserCheck,
  DoorOpen,
  CheckCircle2,
  FilePlus2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Check,
  X,
} from "lucide-react";
import { StatCard } from "../../components/common/StatCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Modal } from "../../components/common/Modal";
import { Alert } from "../../components/common/Alert";
import { formatDate, formatTime } from "../../utils/formatters";

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<{
    stats: DashboardStats;
    todaySessions: TherapySession[];
    activeCourses: any[];
    upcomingSessions: TherapySession[];
    recentActivity: Notification[];
  } | null>(null);
  const [requests, setRequests] = useState<SessionRequest[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [rooms, setRooms] = useState<TreatmentRoom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Review / Approve Request Modal State
  const [approveModalRequest, setApproveModalRequest] = useState<SessionRequest | null>(null);
  const [approveDate, setApproveDate] = useState<string>("");
  const [approveTime, setApproveTime] = useState<string>("10:00");
  const [approveTherapistId, setApproveTherapistId] = useState<string>("");
  const [approveRoomId, setApproveRoomId] = useState<string>("");
  const [approveNotes, setApproveNotes] = useState<string>("");

  // Reject Request Modal State
  const [rejectModalRequest, setRejectModalRequest] = useState<SessionRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");

  // Actions status
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      const [dashRes, reqRes, thpRes, roomRes] = await Promise.all([
        adminService.getDashboard(),
        requestService.getAll(),
        therapistService.getAll(),
        roomService.getAll(),
      ]);
      setData(dashRes);
      setRequests(reqRes.requests);
      setTherapists(thpRes.therapists);
      setRooms(roomRes.rooms);
    } catch (err) {
      console.error("Failed to load admin dashboard", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const openApproveModal = (req: SessionRequest) => {
    setApproveModalRequest(req);
    setApproveDate(req.preferredDate || req.session?.sessionDate || "");
    setApproveTime(req.preferredTime || req.session?.startTime || "10:00");
    setApproveTherapistId(req.session?.therapistId || therapists[0]?.id || "");
    setApproveRoomId(req.session?.roomId || rooms[0]?.id || "");
    setApproveNotes("");
    setActionError(null);
    setActionSuccess(null);
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveModalRequest) return;
    setIsSubmittingAction(true);
    setActionError(null);

    try {
      await requestService.approve(approveModalRequest.id, {
        sessionDate: approveModalRequest.requestType !== "CANCEL" ? approveDate : undefined,
        startTime: approveModalRequest.requestType !== "CANCEL" ? approveTime : undefined,
        therapistId: approveModalRequest.requestType !== "CANCEL" ? approveTherapistId : undefined,
        roomId: approveModalRequest.requestType !== "CANCEL" ? approveRoomId : undefined,
        notes: approveNotes,
      });

      setActionSuccess("Request successfully approved and scheduling applied.");
      setTimeout(() => {
        setApproveModalRequest(null);
        setActionSuccess(null);
        loadDashboard();
      }, 1000);
    } catch (err: any) {
      setActionError(err.message || "Failed to approve request.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const openRejectModal = (req: SessionRequest) => {
    setRejectModalRequest(req);
    setRejectReason("");
    setActionError(null);
    setActionSuccess(null);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalRequest) return;
    setIsSubmittingAction(true);
    setActionError(null);

    try {
      await requestService.reject(rejectModalRequest.id, {
        reason: rejectReason,
      });

      setActionSuccess("Request rejected and requester notified.");
      setTimeout(() => {
        setRejectModalRequest(null);
        setActionSuccess(null);
        loadDashboard();
      }, 1000);
    } catch (err: any) {
      setActionError(err.message || "Failed to reject request.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading clinic operations dashboard..." />;
  }

  const stats = data?.stats;

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">
            Clinic Operations Dashboard
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Real-time multi-day Panchakarma therapy journeys, therapist availability, and suite allocations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/calendar"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors shadow-xs"
          >
            <Calendar className="w-4 h-4 text-stone-500" /> Master Calendar
          </Link>
          <Link
            to="/admin/courses/create"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-ayur-700 hover:bg-ayur-800 text-white transition-colors shadow-md shadow-ayur-900/10"
          >
            <FilePlus2 className="w-4 h-4" /> Schedule New Course
          </Link>
        </div>
      </div>

      {/* 6 Real Database KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Patients"
          value={stats?.totalPatients || 0}
          icon={Users}
          description="Registered patients"
          colorScheme="ayur"
        />
        <StatCard
          title="Active Courses"
          value={stats?.activeCourses || 0}
          icon={Layers}
          description="Running Panchakarma"
          colorScheme="saffron"
        />
        <StatCard
          title="Today's Sessions"
          value={stats?.todaySessionsCount || 0}
          icon={CalendarClock}
          description="Scheduled today"
          colorScheme="clay"
        />
        <StatCard
          title="Therapists"
          value={stats?.availableTherapistsCount || 0}
          icon={UserCheck}
          description="Active practitioners"
          colorScheme="blue"
        />
        <StatCard
          title="Active Suites"
          value={stats?.availableRoomsCount || 0}
          icon={DoorOpen}
          description="Therapy rooms ready"
          colorScheme="ayur"
        />
        <StatCard
          title="Completed"
          value={stats?.totalCompletedSessions || 0}
          icon={CheckCircle2}
          description="All-time sessions"
          colorScheme="saffron"
        />
      </div>

      {/* Main Split Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Panchakarma Courses (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900 font-serif">
                  Active Multi-Day Therapy Courses
                </h3>
                <p className="text-xs text-stone-500">Connected Panchakarma treatment progression</p>
              </div>
              <Link
                to="/admin/courses"
                className="text-xs font-semibold text-ayur-700 hover:text-ayur-900 flex items-center gap-1"
              >
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-stone-100">
              {data?.activeCourses.length === 0 ? (
                <p className="text-xs text-stone-500 py-4 text-center">No active courses running.</p>
              ) : (
                data?.activeCourses.map((c) => (
                  <div key={c.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <Link
                        to={`/admin/courses/${c.id}`}
                        className="font-bold text-xs text-stone-900 hover:text-ayur-700 font-serif"
                      >
                        {c.therapyName}
                      </Link>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Patient: <strong>{c.patientName}</strong> • Started: {formatDate(c.startDate)}
                      </div>
                    </div>

                    <div className="sm:w-48 shrink-0">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600 mb-1">
                        <span>Day {c.completedSessions} of {c.durationDays}</span>
                        <span>{c.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-ayur-600 to-ayur-800 h-full rounded-full"
                          style={{ width: `${c.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Today's Schedule Table */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900 font-serif">
                  Today's Treatment Schedule
                </h3>
                <p className="text-xs text-stone-500">Sessions scheduled across treatment suites</p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-ayur-50 text-ayur-700 border border-ayur-200">
                {data?.todaySessions.length || 0} Today
              </span>
            </div>

            {data?.todaySessions.length === 0 ? (
              <p className="text-xs text-stone-500 py-6 text-center">No sessions scheduled for today.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                    <tr>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Patient</th>
                      <th className="px-3 py-2">Therapy</th>
                      <th className="px-3 py-2">Therapist</th>
                      <th className="px-3 py-2">Room</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {data?.todaySessions.map((s) => (
                      <tr key={s.id} className="hover:bg-stone-50">
                        <td className="px-3 py-2.5 font-bold text-stone-900 whitespace-nowrap">
                          {formatTime(s.startTime)}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-stone-800 whitespace-nowrap">
                          {s.patient?.user.name}
                        </td>
                        <td className="px-3 py-2.5 text-stone-600 whitespace-nowrap">
                          Day {s.dayNumber} ({s.course?.therapyName})
                        </td>
                        <td className="px-3 py-2.5 text-stone-700 whitespace-nowrap">
                          {s.therapist?.user.name}
                        </td>
                        <td className="px-3 py-2.5 text-stone-600 whitespace-nowrap">
                          {s.room?.roomName}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <StatusBadge status={s.status} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Recent Activity & Reminders (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-stone-900 font-serif mb-4 flex items-center gap-2">
              <span>🔔</span> Clinic Activity & Alerts
            </h3>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {data?.recentActivity.length === 0 ? (
                <p className="text-xs text-stone-400">No recent activity.</p>
              ) : (
                data?.recentActivity.map((act) => (
                  <div key={act.id} className="p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs">
                    <div className="font-bold text-stone-900">{act.title}</div>
                    <p className="text-stone-600 text-[11px] mt-1 leading-relaxed">{act.message}</p>
                    <span className="text-[10px] text-stone-400 block mt-1">
                      {formatDate(act.createdAt.substring(0, 10))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Schedule & Replacement Requests Section */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-ayur-700" /> Pending Schedule, Reschedule & Replacement Requests
            </h3>
            <p className="text-xs text-stone-500">
              Review and act on clinical requests submitted by patients and practitioners.
            </p>
          </div>

          <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            {requests.filter((r) => r.status === "PENDING").length} Pending Review
          </span>
        </div>

        {requests.filter((r) => r.status === "PENDING").length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-400 bg-stone-50 rounded-xl">
            No pending schedule requests at this time. All patient journeys are running according to schedule.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="px-3 py-2.5">Request Type</th>
                  <th className="px-3 py-2.5">Requester</th>
                  <th className="px-3 py-2.5">Patient / Therapy</th>
                  <th className="px-3 py-2.5">Preferred Slot</th>
                  <th className="px-3 py-2.5">Reason & Justification</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {requests
                  .filter((r) => r.status === "PENDING")
                  .map((req) => (
                    <tr key={req.id} className="hover:bg-stone-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            req.requestType === "RESCHEDULE"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : req.requestType === "REPLACEMENT"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-rose-50 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {req.requestType}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="font-semibold text-stone-900">{req.requestedByUser?.name}</div>
                        <div className="text-[10px] text-stone-500 uppercase font-bold">{req.requestedByRole}</div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="font-medium text-stone-800">{req.patient?.user?.name || req.patient?.name}</div>
                        <div className="text-[11px] text-stone-500">
                          Day {req.session?.dayNumber || req.course?.durationDays} ({req.course?.therapyName})
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {req.preferredDate ? (
                          <>
                            <div className="font-medium text-stone-900">{formatDate(req.preferredDate)}</div>
                            <div className="text-[11px] text-stone-500">at {req.preferredTime || "10:00"}</div>
                          </>
                        ) : (
                          <span className="text-stone-400">N/A (Cancellation)</span>
                        )}
                      </td>
                      <td className="px-3 py-3 max-w-xs">
                        <div className="text-[11px] text-stone-600 line-clamp-2 italic" title={req.reason}>
                          "{req.reason}"
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openApproveModal(req)}
                            className="px-3 py-1.5 bg-ayur-700 hover:bg-ayur-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Review & Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(req)}
                            className="px-2.5 py-1.5 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-700 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review & Approve Modal */}
      <Modal
        isOpen={!!approveModalRequest}
        onClose={() => setApproveModalRequest(null)}
        title={`Approve ${approveModalRequest?.requestType} Request`}
        subtitle={`Patient: ${approveModalRequest?.patient?.user?.name || approveModalRequest?.patient?.name} — ${approveModalRequest?.course?.therapyName} (Day ${approveModalRequest?.session?.dayNumber})`}
      >
        {actionError && <Alert type="error" className="mb-4">{actionError}</Alert>}
        {actionSuccess && <Alert type="success" className="mb-4">{actionSuccess}</Alert>}

        <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-stone-50 rounded-xl space-y-1">
            <div className="text-stone-700">
              <strong>Requester:</strong> {approveModalRequest?.requestedByUser?.name} ({approveModalRequest?.requestedByRole})
            </div>
            <div className="text-stone-600 italic">
              <strong>Submitted Reason:</strong> "{approveModalRequest?.reason}"
            </div>
          </div>

          {approveModalRequest?.requestType !== "CANCEL" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={approveDate}
                    onChange={(e) => setApproveDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Start Time</label>
                  <select
                    value={approveTime}
                    onChange={(e) => setApproveTime(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
                  >
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Supervising Practitioner</label>
                  <select
                    value={approveTherapistId}
                    onChange={(e) => setApproveTherapistId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
                  >
                    {therapists.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.specialization})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Treatment Suite</label>
                  <select
                    value={approveRoomId}
                    onChange={(e) => setApproveRoomId(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomName} ({r.roomNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Admin Approval Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Schedule verified with clinic calendar; room and practitioner confirmed."
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setApproveModalRequest(null)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAction}
              className="px-5 py-2 bg-ayur-700 text-white rounded-xl font-bold hover:bg-ayur-800 shadow-sm disabled:opacity-50"
            >
              {isSubmittingAction ? "Processing & Validating..." : "Confirm & Apply"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reject Request Modal */}
      <Modal
        isOpen={!!rejectModalRequest}
        onClose={() => setRejectModalRequest(null)}
        title={`Reject ${rejectModalRequest?.requestType} Request`}
        subtitle={`Patient: ${rejectModalRequest?.patient?.user?.name || rejectModalRequest?.patient?.name} — ${rejectModalRequest?.course?.therapyName}`}
      >
        {actionError && <Alert type="error" className="mb-4">{actionError}</Alert>}
        {actionSuccess && <Alert type="success" className="mb-4">{actionSuccess}</Alert>}

        <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Rejection Reason (Mandatory)</label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Requested time slot exceeds maximum daily room capacity; please select another time."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
            />
          </div>

          <div className="p-3 bg-stone-50 rounded-xl text-[11px] text-stone-600">
            The requester will receive an immediate notification with this exact explanation, and the original session schedule will remain unchanged.
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectModalRequest(null)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingAction || !rejectReason.trim()}
              className="px-5 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-sm disabled:opacity-50"
            >
              {isSubmittingAction ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
