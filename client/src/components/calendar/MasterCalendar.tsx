import React, { useState, useEffect } from "react";
import { sessionService } from "../../services/sessionService";
import { therapistService } from "../../services/therapistService";
import { roomService } from "../../services/roomService";
import { patientService } from "../../services/patientService";
import { TherapySession, Therapist, TreatmentRoom, Patient, AuditLog } from "../../types";
import { formatDate, formatTime, formatDateTime } from "../../utils/formatters";
import { StatusBadge } from "../common/StatusBadge";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { EmptyState } from "../common/EmptyState";
import { Modal } from "../common/Modal";
import { Alert } from "../common/Alert";
import { 
  Filter, Calendar as CalendarIcon, Clock, UserCheck, 
  DoorOpen, History, CalendarClock, XCircle, MoreVertical, Edit3 
} from "lucide-react";

export const MasterCalendar: React.FC = () => {
  const [sessions, setSessions] = useState<TherapySession[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [rooms, setRooms] = useState<TreatmentRoom[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterTherapist, setFilterTherapist] = useState<string>("");
  const [filterRoom, setFilterRoom] = useState<string>("");
  const [filterPatient, setFilterPatient] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Modals state
  const [selectedSession, setSelectedSession] = useState<TherapySession | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState<boolean>(false);
  const [isCancelOpen, setIsCancelOpen] = useState<boolean>(false);
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  // Reschedule Form State
  const [rescheduleData, setRescheduleData] = useState({
    sessionDate: "",
    startTime: "10:00",
    therapistId: "",
    roomId: "",
    reason: "",
  });

  // Cancel Form State
  const [cancelReason, setCancelReason] = useState<string>("");

  // Modal Error & Submitting
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const data = await sessionService.getAll({
        date: filterDate || undefined,
        therapistId: filterTherapist || undefined,
        roomId: filterRoom || undefined,
        patientId: filterPatient || undefined,
        status: filterStatus || undefined,
      });
      setSessions(data.sessions);
    } catch (err) {
      console.error("Failed to fetch calendar sessions", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const [thpData, roomData, patData] = await Promise.all([
          therapistService.getAll(),
          roomService.getAll(),
          patientService.getAll(),
        ]);
        setTherapists(thpData.therapists);
        setRooms(roomData.rooms);
        setPatients(patData.patients);
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    }
    loadFilterOptions();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [filterDate, filterTherapist, filterRoom, filterPatient, filterStatus]);

  const clearFilters = () => {
    setFilterDate("");
    setFilterTherapist("");
    setFilterRoom("");
    setFilterPatient("");
    setFilterStatus("");
  };

  // Open Reschedule Modal
  const openRescheduleModal = (session: TherapySession) => {
    setSelectedSession(session);
    setRescheduleData({
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      therapistId: session.therapistId,
      roomId: session.roomId,
      reason: "",
    });
    setModalError(null);
    setIsRescheduleOpen(true);
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      await sessionService.reschedule(selectedSession.id, {
        sessionDate: rescheduleData.sessionDate,
        startTime: rescheduleData.startTime,
        therapistId: rescheduleData.therapistId || undefined,
        roomId: rescheduleData.roomId || undefined,
        reason: rescheduleData.reason,
      });
      setIsRescheduleOpen(false);
      fetchSessions();
    } catch (err: any) {
      setModalError(err.message || "Failed to reschedule session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Cancel Modal
  const openCancelModal = (session: TherapySession) => {
    setSelectedSession(session);
    setCancelReason("");
    setModalError(null);
    setIsCancelOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    setIsSubmitting(true);
    setModalError(null);

    try {
      await sessionService.cancel(selectedSession.id, cancelReason);
      setIsCancelOpen(false);
      fetchSessions();
    } catch (err: any) {
      setModalError(err.message || "Failed to cancel session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Audit Log Modal
  const openAuditModal = async (session: TherapySession) => {
    setSelectedSession(session);
    setIsAuditOpen(true);
    setIsLoadingAudit(true);
    try {
      const data = await sessionService.getAuditLogs(session.id);
      setAuditLogs(data.auditLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-stone-700 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-ayur-700" />
          <span>Calendar Multi-Filter</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-ayur-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Therapist</label>
            <select
              value={filterTherapist}
              onChange={(e) => setFilterTherapist(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-ayur-600"
            >
              <option value="">All Therapists</option>
              {therapists.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Treatment Suite</label>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-ayur-600"
            >
              <option value="">All Suites</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomName} ({r.roomNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Patient</label>
            <select
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-ayur-600"
            >
              <option value="">All Patients</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-ayur-600"
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="MISSED">Missed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {(filterDate || filterTherapist || filterRoom || filterPatient || filterStatus) && (
          <div className="mt-3 text-right">
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-ayur-700 hover:text-ayur-900 underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Calendar List View */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-ayur-700" /> Master Schedule
          </h3>
          <span className="text-xs font-semibold text-stone-500">
            {sessions.length} sessions found
          </span>
        </div>

        {isLoading ? (
          <LoadingSpinner text="Loading master schedule..." />
        ) : sessions.length === 0 ? (
          <EmptyState
            title="No Scheduled Sessions Found"
            description="No Panchakarma sessions matched your filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Therapy</th>
                  <th className="px-4 py-3">Therapist</th>
                  <th className="px-4 py-3">Treatment Suite</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sessions.map((s) => {
                  const isScheduled = s.status === "SCHEDULED";

                  return (
                    <tr key={s.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-stone-900">{formatDate(s.sessionDate)}</div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-stone-400" />
                          {formatTime(s.startTime)} - {formatTime(s.endTime)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-bold text-ayur-800 font-serif">
                        Day {s.dayNumber} of {s.course?.durationDays || 7}
                        {s.replacementForSessionId && (
                          <span className="block text-[10px] font-normal text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 w-fit">
                            Replacement
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-stone-900">{s.patient?.user?.name}</div>
                        <div className="text-[10px] text-stone-400">{s.patient?.phone}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-stone-800">
                        {s.course?.therapyName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-stone-700">
                        {s.therapist?.user?.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                        {s.room?.roomName} ({s.room?.roomNumber})
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={s.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isScheduled && (
                            <>
                              <button
                                onClick={() => openRescheduleModal(s)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 hover:bg-ayur-50 hover:text-ayur-800 text-stone-700 rounded-lg transition-colors flex items-center gap-1"
                                title="Reschedule Session"
                              >
                                <CalendarClock className="w-3.5 h-3.5" /> Reschedule
                              </button>
                              <button
                                onClick={() => openCancelModal(s)}
                                className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                                title="Cancel Session"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Cancel
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => openAuditModal(s)}
                            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                            title="View Audit History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reschedule Session Modal */}
      <Modal
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        title="Reschedule Therapy Session"
        subtitle={`Day ${selectedSession?.dayNumber} — ${selectedSession?.patient?.user?.name} (${selectedSession?.course?.therapyName})`}
      >
        {modalError && <Alert type="error" className="mb-4">{modalError}</Alert>}

        <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">New Session Date</label>
              <input
                type="date"
                required
                value={rescheduleData.sessionDate}
                onChange={(e) => setRescheduleData({ ...rescheduleData, sessionDate: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Start Time</label>
              <input
                type="time"
                required
                value={rescheduleData.startTime}
                onChange={(e) => setRescheduleData({ ...rescheduleData, startTime: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Supervising Practitioner</label>
              <select
                value={rescheduleData.therapistId}
                onChange={(e) => setRescheduleData({ ...rescheduleData, therapistId: e.target.value })}
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
                value={rescheduleData.roomId}
                onChange={(e) => setRescheduleData({ ...rescheduleData, roomId: e.target.value })}
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

          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Reason for Rescheduling (Mandatory for audit and patient notification)
            </label>
            <textarea
              rows={2}
              required
              placeholder="e.g. Patient requested morning slot change due to personal scheduling conflict..."
              value={rescheduleData.reason}
              onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRescheduleOpen(false)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !rescheduleData.reason.trim()}
              className="px-5 py-2 bg-ayur-700 text-white rounded-xl font-bold hover:bg-ayur-800 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Validating Availability..." : "Confirm Reschedule"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Session Modal */}
      <Modal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Cancel Therapy Session"
        subtitle={`Day ${selectedSession?.dayNumber} — ${selectedSession?.patient?.user?.name} (${selectedSession?.course?.therapyName})`}
      >
        {modalError && <Alert type="error" className="mb-4">{modalError}</Alert>}

        <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">
              Cancellation Reason (Required)
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Patient medical contraindication reported by physician..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600 text-xs"
            />
          </div>

          <p className="text-[11px] text-stone-500">
            Cancelling this session will update the session status to CANCELLED, preserve the record in patient history, notify the patient, and record an audit log.
          </p>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCancelOpen(false)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
            >
              Keep Session
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !cancelReason.trim()}
              className="px-5 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Audit History Modal */}
      <Modal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        title="Session Audit History"
        subtitle={`Day ${selectedSession?.dayNumber} — ${selectedSession?.patient?.user?.name}`}
      >
        {isLoadingAudit ? (
          <LoadingSpinner text="Loading audit log records..." />
        ) : auditLogs.length === 0 ? (
          <p className="text-xs text-stone-500 py-6 text-center">
            No audit log entries recorded for this session yet.
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/70 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-ayur-800 bg-ayur-100/80 px-2 py-0.5 rounded text-[10px] uppercase">
                    {log.action.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>

                <div className="text-stone-700">
                  Performed by: <strong>{log.performedByUser?.name || "System"}</strong> ({log.performedByUser?.role})
                </div>

                {log.reason && (
                  <div className="text-stone-600 italic bg-white p-2 rounded-lg border border-stone-100 text-[11px]">
                    "{log.reason}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
