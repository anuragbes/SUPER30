import { useEffect, useState } from "react";
import axios from "axios";
import AnnouncementCard from "./AnnouncementCard";
import { Bell } from "lucide-react";

const API_URL = import.meta.env.VITE_BACKEND_URL;

const AnnouncementSection = ({ compact = false }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/admin/announcements`);
        setAnnouncements(res.data.data);
      } catch (error) {
        console.error("Failed to fetch announcements", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  if (loading || announcements.length === 0) return null;

  return (
    <section className={`${compact ? "w-full text-left" : ""}`}>
      {/* Header */}
      <div
        className={`flex items-center gap-3 ${compact ? "mb-3 justify-start" : "mb-6"}`}
      >
        {!compact && (
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="w-5 h-5 text-primary" />
          </div>
        )}
        <h2
          className={`${compact ? "text-sm sm:text-base font-semibold" : "text-2xl sm:text-3xl font-bold"} text-[hsl(var(--section-title))]`}
        >
          {compact ? "Latest Updates" : "Announcements"}
        </h2>
        {!compact && <div className="flex-1 h-px bg-border ml-4" />}
      </div>

      {/* Announcements */}
      <div
        className={`grid grid-cols-1 gap-3 ${compact ? "max-h-96 overflow-y-auto pr-2" : ""}`}
      >
        {announcements.map((a) => (
          <AnnouncementCard
            key={a._id}
            title={a.title}
            description={a.message}
            date={new Date(a.createdAt).toLocaleDateString()}
            isPinned={a.isPinned}
            compact={compact}
          />
        ))}
      </div>
    </section>
  );
};

export default AnnouncementSection;
