import React, { useState, useEffect } from "react";
import { therapistService } from "../../services/therapistService";
import { adminService } from "../../services/adminService";
import { Therapist } from "../../types";
import { UserPlus, Calendar, Clock, Trash2, Shield } from "lucide-react";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Modal } from "../../components/common/Modal";
import { Alert } from "../../components/common/Alert";
import { formatDate } from "../../utils/formatters";

export const TherapistsPage: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Availability & Leaves Modal
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [availData, setAvailData] = useState<{
    workingDays: number[];
    workingHoursStart: string;
    workingHoursEnd: string;
    weeklyOff: number | null;
  }>({
    workingDays: [1, 2, 3, 4, 5, 6],
    workingHoursStart: "08:00",
    workingHoursEnd: "18:00",
    weeklyOff: 0,
  });
  const [leaves, setLeaves] = useState<any[]>([]);
  const [newLeave, setNewLeave] = useState({ startDate: "", endDate: "", reason: "" });
  const [availSuccess, setAvailSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "Therapist@123",
    specialization: "Panchakarma & Basti Specialist",
    phone: "",
    experience: "5 years",
  });

  const loadTherapists = async () => {
    setIsLoading(true);
    try {
      const res = await therapistService.getAll();
      setTherapists(res.therapists);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTherapists();
  }, []);

  const handleOpenAvailModal = async (t: Therapist) => {
    setSelectedTherapist(t);
    setAvailSuccess(null);
    try {
      const [avRes, lvRes] = await Promise.all([
        adminService.getTherapistAvailability(t.id),
        adminService.getTherapistLeaves(t.id),
      ]);
      if (avRes.availability) {
        setAvailData({
          workingDays: avRes.availability.workingDays || [1, 2, 3, 4, 5, 6],
          workingHoursStart: avRes.availability.workingHoursStart || "08:00",
          workingHoursEnd: avRes.availability.workingHoursEnd || "18:00",
          weeklyOff: avRes.availability.weeklyOff !== undefined ? avRes.availability.weeklyOff : 0,
        });
      } else {
        setAvailData({
          workingDays: [0, 1, 2, 3, 4, 5, 6],
          workingHoursStart: "08:00",
          workingHoursEnd: "18:00",
          weeklyOff: null,
        });
      }
      setLeaves(lvRes.leaves || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTherapist) return;
    setIsSubmitting(true);
    try {
      await adminService.updateTherapistAvailability(selectedTherapist.id, availData);
      setAvailSuccess("Availability schedule updated successfully.");
      setTimeout(() => setAvailSuccess(null), 2500);
    } catch (err: any) {
      alert(err.message || "Failed to update availability");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTherapist || !newLeave.startDate || !newLeave.endDate) return;
    try {
      await adminService.createTherapistLeave(selectedTherapist.id, newLeave);
      setNewLeave({ startDate: "", endDate: "", reason: "" });
      const lvRes = await adminService.getTherapistLeaves(selectedTherapist.id);
      setLeaves(lvRes.leaves || []);
      setAvailSuccess("Leave added successfully.");
      setTimeout(() => setAvailSuccess(null), 2500);
    } catch (err: any) {
      alert(err.message || "Failed to add leave");
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    if (!selectedTherapist) return;
    try {
      await adminService.deleteTherapistLeave(leaveId);
      const lvRes = await adminService.getTherapistLeaves(selectedTherapist.id);
      setLeaves(lvRes.leaves || []);
    } catch (err: any) {
      alert(err.message || "Failed to delete leave");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);
    try {
      await therapistService.create(formData);
      setIsAddModalOpen(false);
      setFormData({
        name: "",
        email: "",
        password: "Therapist@123",
        specialization: "Panchakarma & Basti Specialist",
        phone: "",
        experience: "5 years",
      });
      loadTherapists();
    } catch (err: any) {
      setModalError(err.message || "Failed to add therapist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysOfWeek = [
    { label: "Sun", value: 0 },
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">Therapist Directory</h1>
          <p className="text-xs text-stone-500 mt-1">
            Registered Ayurvedic doctors, Vaidyas, working hours, and leave schedules.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-ayur-700 hover:bg-ayur-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" /> Add Practitioner
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading therapists..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {therapists.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-ayur-100 text-ayur-800 flex items-center justify-center font-bold text-base font-serif">
                    {t.name?.charAt(0) || "T"}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-stone-900">{t.name}</h3>
                    <p className="text-xs font-medium text-ayur-700">{t.specialization}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-stone-100 space-y-2 text-xs text-stone-600">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Experience:</span>
                    <span className="font-semibold text-stone-800">{t.experience}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Email:</span>
                    <span className="text-stone-800 truncate max-w-[160px]">{t.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Phone:</span>
                    <span className="text-stone-800">{t.phone}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-stone-400">Upcoming Sessions:</span>
                    <span className="px-2 py-0.5 rounded-full bg-stone-100 font-bold text-stone-800 text-[11px]">
                      {t.upcomingSessionsCount || 0} scheduled
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100">
                <button
                  onClick={() => handleOpenAvailModal(t)}
                  className="w-full px-3 py-2 bg-stone-50 hover:bg-ayur-50 text-stone-700 hover:text-ayur-800 border border-stone-200 rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5 text-ayur-700" /> Availability & Leaves
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Therapist Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Ayurvedic Therapist"
        subtitle="Add a new practitioner to clinic scheduling roster"
      >
        {modalError && <Alert type="error" className="mb-4">{modalError}</Alert>}

        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Doctor / Practitioner Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Harish Sharma"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Specialization</label>
              <input
                type="text"
                required
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Experience</label>
              <input
                type="text"
                required
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="e.g. 10 years"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Phone</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-ayur-700 text-white rounded-xl font-bold hover:bg-ayur-800 shadow-sm"
            >
              {isSubmitting ? "Saving..." : "Save Therapist"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Availability & Leaves Management Modal */}
      <Modal
        isOpen={!!selectedTherapist}
        onClose={() => setSelectedTherapist(null)}
        title={`Practitioner Schedule & Leaves — ${selectedTherapist?.name}`}
        subtitle="Manage working days, daily shift hours, weekly off, and scheduled absences"
      >
        {availSuccess && <Alert type="success" className="mb-4">{availSuccess}</Alert>}

        <div className="space-y-6 text-xs max-h-[72vh] overflow-y-auto pr-1">
          {/* Working Schedule Form */}
          <form onSubmit={handleSaveAvailability} className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <h4 className="font-bold text-stone-800 text-xs font-serif flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-ayur-700" /> Working Shift & Weekly Roster
            </h4>

            <div>
              <label className="block font-semibold text-stone-700 mb-1.5">Working Days</label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((d) => {
                  const isChecked = availData.workingDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => {
                        const nextDays = isChecked
                          ? availData.workingDays.filter((v) => v !== d.value)
                          : [...availData.workingDays, d.value];
                        setAvailData({ ...availData, workingDays: nextDays });
                      }}
                      className={`px-3 py-1.5 rounded-lg border font-semibold text-xs transition-colors ${
                        isChecked
                          ? "bg-ayur-700 text-white border-ayur-800"
                          : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Shift Start Time</label>
                <input
                  type="time"
                  required
                  value={availData.workingHoursStart}
                  onChange={(e) => setAvailData({ ...availData, workingHoursStart: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Shift End Time</label>
                <input
                  type="time"
                  required
                  value={availData.workingHoursEnd}
                  onChange={(e) => setAvailData({ ...availData, workingHoursEnd: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-ayur-700 hover:bg-ayur-800 text-white font-bold rounded-lg text-xs shadow-xs"
              >
                {isSubmitting ? "Saving..." : "Save Shift Hours"}
              </button>
            </div>
          </form>

          {/* Leaves Section */}
          <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-3">
            <h4 className="font-bold text-stone-800 text-xs font-serif flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-rose-600" /> Scheduled Leaves & Absences
            </h4>

            {leaves.length === 0 ? (
              <p className="text-stone-400 italic text-[11px]">No leaves recorded for this therapist.</p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {leaves.map((lv) => (
                  <div key={lv.id} className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-stone-800">{formatDate(lv.startDate)} to {formatDate(lv.endDate)}</strong>
                      {lv.reason && <p className="text-stone-500 text-[11px] mt-0.5">{lv.reason}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteLeave(lv.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete leave"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Leave Form */}
            <form onSubmit={handleAddLeave} className="pt-2 border-t border-stone-100 space-y-2">
              <span className="font-semibold text-stone-700 text-[11px] block">Schedule New Leave</span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  required
                  value={newLeave.startDate}
                  onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                  className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                />
                <input
                  type="date"
                  required
                  value={newLeave.endDate}
                  onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                  className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
                />
              </div>
              <input
                type="text"
                placeholder="Reason (e.g. Annual Panchakarma Conference)"
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
              />
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-xs"
                >
                  Record Leave
                </button>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
};

