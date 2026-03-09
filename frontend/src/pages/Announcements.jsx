import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Bell, Trash2, Edit2, X, Pin } from "lucide-react";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const Announcements = () => {
  const [formData, setFormData] = useState({ title: "", message: "" });
  const [announcements, setAnnouncements] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ title: "", message: "" });
  const [loading, setLoading] = useState({ type: null, id: null });

  const token = localStorage.getItem("adminToken");

  // Fetch All Announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data && res.data.data) {
        setAnnouncements(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
      toast.error("Failed to load announcements");
    }
  }, [token]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Create Announcement
  const handleCreate = useCallback(async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) return;

    setLoading({ type: "create", id: null });
    try {
      await axios.post(
        `${API_URL}/api/admin/announcements`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setFormData({ title: "", message: "" });
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create announcement");
    } finally {
      setLoading({ type: null, id: null });
    }
  }, [formData, token, fetchAnnouncements]);

  // Generic field toggle handler
  const handleToggleField = useCallback(async (id, endpointSuffix, fieldKey, successMessage) => {
    try {
      setLoading({ type: endpointSuffix, id });
      await axios.patch(
        `${API_URL}/api/admin/announcements/${id}/${endpointSuffix}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Optimistic update - toggle the field
      setAnnouncements((prev) =>
        prev.map((a) =>
          a._id === id
            ? { ...a, [fieldKey]: !a[fieldKey] }
            : a
        )
      );
      
      toast.success(successMessage);
    } catch (err) {
      console.error(`Failed to toggle ${fieldKey}:`, err);
      toast.error(`Failed to update ${fieldKey}`);
      fetchAnnouncements();
    } finally {
      setLoading({ type: null, id: null });
    }
  }, [token, fetchAnnouncements]);

  // Toggle Announcement Status
  const toggleStatus = useCallback(async (id) => {
    handleToggleField(id, "toggle", "isActive", "Announcement status updated!");
  }, [handleToggleField]);

  // Delete Announcement
  const deleteAnnouncement = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    
    try {
      setLoading({ type: "delete", id });
      await axios.delete(`${API_URL}/api/admin/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Announcement deleted successfully!");
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete announcement");
    } finally {
      setLoading({ type: null, id: null });
    }
  }, [token, fetchAnnouncements]);

  // Toggle Pin Status
  const togglePin = useCallback(async (id) => {
    handleToggleField(id, "pin", "isPinned", "Announcement pin status updated!");
  }, [handleToggleField]);

  // Open Edit Modal
  const openEdit = useCallback((announcement) => {
    setEditingId(announcement._id);
    setEditData({ title: announcement.title, message: announcement.message });
  }, []);

  // Cancel Edit
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditData({ title: "", message: "" });
  }, []);

  // Save Edit
  const handleSaveEdit = useCallback(async () => {
    if (!editData.title || !editData.message) {
      toast.error("Title and message are required");
      return;
    }

    try {
      setLoading({ type: "save", id: editingId });
      await axios.patch(
        `${API_URL}/api/admin/announcements/${editingId}`,
        editData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update local state
      setAnnouncements((prev) =>
        prev.map((a) =>
          a._id === editingId
            ? { ...a, ...editData }
            : a
        )
      );

      toast.success("Announcement updated successfully!");
      cancelEdit();
    } catch (err) {
      console.error("Failed to update announcement:", err);
      toast.error("Failed to update announcement");
    } finally {
      setLoading({ type: null, id: null });
    }
  }, [editingId, editData, token, cancelEdit]);

  return (
    <div>
      <Navbar />
      <div className="w-full min-h-screen bg-gray-50 pt-20 sm:pt-24 px-4 sm:px-6 md:px-8 pb-8 space-y-6 sm:space-y-8">
        <div className="w-full max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl pb-6 sm:pb-8 font-bold text-foreground lg:text-4xl">Announcements</h1>

          {/* Create Announcement Card */}
          <Card className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-100 shadow-md hover:shadow-lg transition-shadow mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-6 h-6 text-blue-600" />
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">Publish New Announcement</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Announcement Title</label>
                <Input
                  placeholder="Enter announcement title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Message</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder="Enter announcement message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              <Button 
                onClick={handleCreate} 
                disabled={loading.type === "create" || !formData.title || !formData.message}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {loading.type === "create" ? "Publishing..." : "Publish Announcement"}
              </Button>
            </div>
          </Card>

          {/* Announcements List */}
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-6">All Announcements</h2>
            
            {announcements && announcements.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {announcements.map((a) => (
                  <Card
                    key={a._id}
                    className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {editingId === a._id ? (
                      // Edit Form
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Edit2 className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-foreground">Edit Announcement</h3>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground block mb-2">Title</label>
                          <Input
                            placeholder="Enter announcement title"
                            value={editData.title}
                            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                            className="w-full rounded-lg border border-slate-200"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground block mb-2">Message</label>
                          <textarea
                            className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows="4"
                            placeholder="Enter announcement message"
                            value={editData.message}
                            onChange={(e) => setEditData({ ...editData, message: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={handleSaveEdit}
                            disabled={loading.type === "save" || !editData.title || !editData.message}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                          >
                            {loading.type === "save" ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button
                            onClick={cancelEdit}
                            variant="outline"
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex flex-col gap-4">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2 break-words">{a.title}</h3>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{a.message}</p>
                        </div>

                        <div className="flex justify-between items-center gap-3">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xs font-medium text-slate-500">Status:</span>
                            <span
                              className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${
                                a.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {a.isActive ? "Active" : "Inactive"}
                            </span>
                            {a.isPinned && (
                              <span className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                                <Pin size={14} />
                                Pinned
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2 sm:gap-3">
                            <Button
                              variant="outline"
                              onClick={() => openEdit(a)}
                              className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium"
                            >
                              <Edit2 size={16} className="mr-1 sm:mr-0" />
                              <span className="sm:hidden">Edit</span>
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => togglePin(a._id)}
                              disabled={loading.id === a._id && loading.type === "pin"}
                              className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium"
                              title={a.isPinned ? "Unpin" : "Pin"}
                            >
                              {loading.id === a._id && loading.type === "pin" ? "..." : <Pin size={16} className={a.isPinned ? "fill-yellow-500 text-yellow-500" : ""} />}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => toggleStatus(a._id)}
                              disabled={loading.id === a._id && loading.type === "toggle"}
                              className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium"
                            >
                              {loading.id === a._id && loading.type === "toggle" ? "..." : (a.isActive ? "Disable" : "Enable")}
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => deleteAnnouncement(a._id)}
                              disabled={loading.id === a._id && loading.type === "delete"}
                              className="px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium"
                            >
                              {loading.id === a._id && loading.type === "delete" ? "..." : <Trash2 size={16} />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
                <p className="text-slate-500 text-sm">No announcements yet. Create one to get started!</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Announcements;
