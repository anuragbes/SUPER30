
import { Bell, Pin } from "lucide-react";

const formatText = (text) => {
  if (!text) return text;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urlTestRegex = /^https?:\/\/[^\s]+$/;

  return text.split(urlRegex).map((part, index) =>
    urlTestRegex.test(part) ? (
      <a
        key={index}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary break-all"
      >
        {part}
      </a>
    ) : (
      part
    )
  );
};
const AnnouncementCard = ({ title, description, isPinned }) => {
  return (
    <div className={`announcement-card-hover cursor-pointer shadow-md hover:shadow-lg transition p-5 rounded-xl border border-[hsl(var(--announcement-border))] bg-card group ${isPinned ? "border-yellow-400 bg-yellow-50/30" : ""}`}>
      <div className="flex items-start gap-3">
        <Bell className="w-3 h-3 sm:w-4 sm:h-4 mt-1 text-primary shrink-0" />

        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">

            {/* Title */}
            <h3 className="flex items-center gap-2 text-sm sm:text-base font-semibold text-card-foreground group-hover:text-primary transition-colors break-words sm:truncate">
              {title}
              {isPinned && <Pin size={16} className="text-yellow-500" />}
            </h3>

          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2 wrap-break-word sm:line-clamp-2 whitespace-pre-wrap">
            {formatText(description)}
          </p>

        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;