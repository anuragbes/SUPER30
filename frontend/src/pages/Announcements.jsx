import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { Bell, Trash2 } from "lucide-react";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const Announcements = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const token = localStorage.getItem("adminToken");

  // Fetch All Announcements
  const fetchAnnouncements = async () => {
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
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Create Announcement
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title || !message) return;

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/admin/announcements`,
        { title, message },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setTitle("");
      setMessage("");
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Announcement
  const toggleStatus = async (id) => {
    try {
      setTogglingId(id);
      const response = await axios.patch(
        `${API_URL}/api/admin/announcements/${id}/toggle`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Update local state immediately
      setAnnouncements((prev) =>
        prev.map((a) =>
          a._id === id
            ? { ...a, isActive: !a.isActive }
            : a
        )
      );
      
      toast.success("Announcement status updated!");
    } catch (err) {
      console.error("Failed to toggle status:", err);
      toast.error("Failed to update announcement status");
      // Refetch on error to ensure state consistency
      fetchAnnouncements();
    } finally {
      setTogglingId(null);
    }
  };

  // Delete Announcement
  const deleteAnnouncement = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    
    try {
      setDeletingId(id);
      await axios.delete(`${API_URL}/api/admin/announcements/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Announcement deleted successfully!");
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete announcement");
    } finally {
      setDeletingId(null);
    }
  };

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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Message</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="4"
                  placeholder="Enter announcement message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleCreate} 
                disabled={loading || !title || !message}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {loading ? "Publishing..." : "Publish Announcement"}
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
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2">{a.title}</h3>
                        <p className="text-sm text-slate-600 mb-3 leading-relaxed">{a.message}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-slate-500">Status:</span>
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              a.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {a.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 sm:gap-3">
                        <Button
                          variant="outline"
                          onClick={() => toggleStatus(a._id)}
                          disabled={togglingId === a._id}
                          className="px-3 sm:px-4 py-2 text-sm font-medium"
                        >
                          {togglingId === a._id ? "Updating..." : (a.isActive ? "Disable" : "Enable")}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => deleteAnnouncement(a._id)}
                          disabled={deletingId === a._id}
                          className="px-3 sm:px-4 py-2 text-sm font-medium"
                        >
                          {deletingId === a._id ? "Deleting..." : <Trash2 size={16} />}
                        </Button>
                      </div>
                    </div>
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
