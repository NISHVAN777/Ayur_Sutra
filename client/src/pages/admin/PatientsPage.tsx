import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { patientService } from "../../services/patientService";
import { Patient } from "../../types";
import { UserPlus, Search, Eye } from "lucide-react";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { Modal } from "../../components/common/Modal";
import { Alert } from "../../components/common/Alert";

export const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "Patient@123",
    phone: "",
    dateOfBirth: "1990-01-01",
    gender: "Male" as const,
    address: "",
    emergencyContact: "",
    medicalNotes: "",
  });

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const res = await patientService.getAll(search);
      setPatients(res.patients);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadPatients();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalError(null);
    try {
      await patientService.create(formData);
      setIsAddModalOpen(false);
      setFormData({
        name: "",
        email: "",
        password: "Patient@123",
        phone: "",
        dateOfBirth: "1990-01-01",
        gender: "Male",
        address: "",
        emergencyContact: "",
        medicalNotes: "",
      });
      loadPatients();
    } catch (err: any) {
      setModalError(err.message || "Failed to create patient.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">Patient Directory</h1>
          <p className="text-xs text-stone-500 mt-1">
            Manage patient records, health notes, and active Panchakarma courses.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-ayur-700 hover:bg-ayur-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" /> Add New Patient
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search by patient name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ayur-500/20 focus:border-ayur-600"
        />
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingSpinner text="Loading patients..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Patient Name</th>
                  <th className="px-4 py-3">Contact & Age</th>
                  <th className="px-4 py-3">Active Course</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Chief Concern</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                      No patients found matching your search.
                    </td>
                  </tr>
                ) : (
                  patients.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-stone-900">{p.name}</div>
                        <div className="text-[11px] text-stone-400">{p.email}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-stone-800">{p.phone}</div>
                        <div className="text-[11px] text-stone-400">
                          {p.gender} • DoB: {p.dateOfBirth}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {p.activeCourse ? (
                          <span className="font-semibold text-ayur-800 font-serif">
                            {p.activeCourse.therapyName}
                          </span>
                        ) : (
                          <span className="text-stone-400 italic">No active course</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {p.activeCourse ? (
                          <div className="w-28">
                            <div className="text-[10px] text-stone-500 mb-0.5">
                              {p.activeCourse.completedSessions}/{p.activeCourse.totalSessions} days ({p.activeCourse.progress}%)
                            </div>
                            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-ayur-700 h-full rounded-full"
                                style={{ width: `${p.activeCourse.progress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs truncate text-[11px] text-stone-600">
                        {p.medicalNotes || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/patients/${p.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-ayur-50 hover:text-ayur-800 text-stone-700 font-semibold text-[11px] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Patient Profile"
        subtitle="Register patient in AyurSutra database"
      >
        {modalError && <Alert type="error" className="mb-4">{modalError}</Alert>}

        <form onSubmit={handleCreatePatient} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <label className="block font-semibold text-stone-700 mb-1">Temporary Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Date of Birth</label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-1 focus:ring-ayur-600"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1">Medical Diagnosis / Ayurvedic Notes</label>
            <textarea
              rows={3}
              value={formData.medicalNotes}
              onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
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
              {isSubmitting ? "Creating..." : "Save Patient"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
