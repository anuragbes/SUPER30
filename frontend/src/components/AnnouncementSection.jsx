import { useEffect, useState } from "react";
import axios from "axios";
import AnnouncementCard from "./AnnouncementCard";
import { Bell } from "lucide-react";

const API_URL = import.meta.env.VITE_BACKEND_URL;
const STEP = 3;

const AnnouncementSection = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(STEP);

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

  const handleReadMore = () => {
    setVisibleCount((prev) => prev + STEP);
  };

  const handleViewLess = () => {
    setVisibleCount(STEP);
  };

  return (
    <section>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[hsl(var(--section-title))]">
          Announcements
        </h2>
        <div className="flex-1 h-px bg-border ml-4" />
      </div>

      {/* Announcements */}
      <div className="grid grid-cols-1 gap-3">
        {announcements.slice(0, visibleCount).map((a) => (
          <AnnouncementCard
            key={a._id}
            title={a.title}
            description={a.message}
            date={new Date(a.createdAt).toLocaleDateString()}
            isPinned={a.isPinned}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-center gap-4">
        {visibleCount < announcements.length && (
          <button
            onClick={handleReadMore}
            className="text-sm font-semibold p-4 text-primary hover:underline"
          >
            View more ↓
          </button>
        )}

        {visibleCount > STEP && (
          <button
            onClick={handleViewLess}
            className="text-sm font-semibold p-4 text-muted-foreground hover:underline"
          >
            View less ↑
          </button>
        )}
      </div>
    </section>
  );
};

export default AnnouncementSection;
