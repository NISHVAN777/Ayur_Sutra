import React, { useState, useEffect } from "react";
import { roomService } from "../../services/roomService";
import { adminService } from "../../services/adminService";
import { TreatmentRoom } from "../../types";
import { Plus, Power, Layers, Trash2 } from "lucide-react";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Modal } from "../../components/common/Modal";
import { Alert } from "../../components/common/Alert";
import { StatusBadge } from "../../components/common/StatusBadge";
import { formatTime } from "../../utils/formatters";

export const RoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<TreatmentRoom[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isCompatModalOpen, setIsCompatModalOpen] = useState<boolean>(false);
  const [compatList, setCompatList] = useState<any[]>([]);
  const [newCompat, setNewCompat] = useState({ procedureName: "Basti", roomId: "" });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    roomName: "",
    roomNumber: "",
    description: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const loadRooms = async () => {
    setIsLoading(true);
    try {
      const res = await roomService.getAll();
      setRooms(res.rooms);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompatibilities = async () => {
    try {
      const res = await adminService.getCompatibility();
      setCompatList(res.compatibilities || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadRooms();
    loadCompatibilities();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);
    try {
      await roomService.create(formData);
      setIsAddModalOpen(false);
      setFormData({
        roomName: "",
        roomNumber: "",
        description: "",
        status: "ACTIVE",
      });
      loadRooms();
    } catch (err: any) {
      setModalError(err.message || "Failed to create treatment room.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCompat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompat.procedureName || !newCompat.roomId) return;
    try {
      await adminService.addCompatibility(newCompat);
      loadCompatibilities();
    } catch (err: any) {
      alert(err.message || "Failed to add compatibility");
    }
  };

  const handleDeleteCompat = async (id: string) => {
    try {
      await adminService.deleteCompatibility(id);
      loadCompatibilities();
    } catch (err: any) {
      alert(err.message || "Failed to delete compatibility");
    }
  };

  const toggleStatus = async (room: TreatmentRoom) => {
    const newStatus = room.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await roomService.update(room.id, { status: newStatus });
      loadRooms();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">Treatment Rooms & Suites</h1>
          <p className="text-xs text-stone-500 mt-1">
            Panchakarma treatment suites, specialized Droni tables, and procedure compatibility rules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCompatModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold text-xs rounded-xl shadow-xs transition-colors"
          >
            <Layers className="w-4 h-4 text-ayur-700" /> Procedure Compatibility
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-ayur-700 hover:bg-ayur-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add Treatment Suite
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner text="Loading treatment suites..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rooms.map((r) => (
            <div
              key={r.id}
              className={`bg-white rounded-2xl border p-6 shadow-sm transition-all flex flex-col justify-between ${
                r.status === "INACTIVE"
                  ? "border-stone-200 opacity-60 bg-stone-50/50"
                  : "border-stone-200/90 hover:shadow-md"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-stone-100 font-bold text-xs text-stone-700">
                    Room {r.roomNumber}
                  </span>
                  <StatusBadge status={r.status} size="sm" />
                </div>

                <h3 className="font-bold text-base text-stone-900 font-serif mt-3">
                  {r.roomName}
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  {r.description || "Standard Panchakarma therapy suite."}
                </p>

                <div className="mt-4 pt-3 border-t border-stone-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
                    Today's Bookings ({r.todaySessionsCount || 0})
                  </span>
                  {r.todaySessions && r.todaySessions.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {r.todaySessions.map((s) => (
                        <div
                          key={s.id}
                          className="p-2 rounded-lg bg-stone-50 text-[11px] flex items-center justify-between text-stone-700"
                        >
                          <span className="font-semibold">{formatTime(s.startTime)}</span>
                          <span className="truncate max-w-[120px]">{s.patient?.user.name}</span>
                          <StatusBadge status={s.status} size="sm" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400 italic">No bookings today</span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-end">
                <button
                  onClick={() => toggleStatus(r)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                    r.status === "ACTIVE"
                      ? "text-stone-600 border-stone-200 hover:bg-stone-100"
                      : "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {r.status === "ACTIVE" ? "Deactivate Suite" : "Activate Suite"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Suite Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Treatment Suite"
        subtitle="Register a new room for Panchakarma therapy scheduling"
      >
        {modalError && <Alert type="error" className="mb-4">{modalError}</Alert>}

        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Room Name</label>
              <input
                type="text"
                required
                value={formData.roomName}
                onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                placeholder="e.g. Dhanwanthari Suite"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Room Number</label>
              <input
                type="text"
                required
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                placeholder="e.g. 105"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Suite Description & Equipment</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Droni wooden table, herbal steam chamber..."
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
              {isSubmitting ? "Creating..." : "Save Suite"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Procedure Compatibility Modal */}
      <Modal
        isOpen={isCompatModalOpen}
        onClose={() => setIsCompatModalOpen(false)}
        title="Procedure ↔ Treatment Suite Compatibility"
        subtitle="Manage required suites for specialized Panchakarma procedures"
      >
        <div className="space-y-4 text-xs max-h-[72vh] overflow-y-auto pr-1">
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-600 leading-relaxed text-[11px]">
            Procedures restricted to specific suites will be validated during course creation, reschedule, and assignment. If a procedure has no restrictions, it is compatible with any active suite.
          </div>

          {/* Compatibility List */}
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {compatList.map((c) => (
              <div key={c.id} className="p-2.5 bg-white rounded-lg border border-stone-200 flex items-center justify-between text-xs">
                <div>
                  <strong className="text-stone-900">{c.procedureName}</strong>
                  <span className="text-stone-400 mx-1.5">↔</span>
                  <span className="text-ayur-800 font-semibold">{c.room?.roomName} ({c.room?.roomNumber})</span>
                </div>
                <button
                  onClick={() => handleDeleteCompat(c.id)}
                  className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                  title="Remove mapping"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Mapping Form */}
          <form onSubmit={handleAddCompat} className="pt-3 border-t border-stone-100 space-y-2.5">
            <h4 className="font-bold text-stone-800 font-serif text-xs">Add Compatibility Rule</h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Procedure name (e.g. Basti)"
                value={newCompat.procedureName}
                onChange={(e) => setNewCompat({ ...newCompat, procedureName: e.target.value })}
                className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
              />
              <select
                required
                value={newCompat.roomId}
                onChange={(e) => setNewCompat({ ...newCompat, roomId: e.target.value })}
                className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
              >
                <option value="">Select Suite</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomName} ({r.roomNumber})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newCompat.roomId || !newCompat.procedureName}
                className="px-3.5 py-1.5 bg-ayur-700 hover:bg-ayur-800 text-white font-bold rounded-lg text-xs shadow-xs disabled:opacity-50"
              >
                Add Mapping
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

