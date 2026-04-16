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
    ),
  );
};
const AnnouncementCard = ({
  title,
  description,
  isPinned,
  compact = false,
}) => {
  return (
    <div
      className={`announcement-card-hover cursor-pointer shadow-md hover:shadow-lg transition border border-[hsl(var(--announcement-border))] bg-card group rounded-xl ${compact ? "p-3" : "p-5"} ${isPinned ? "border-yellow-400 bg-yellow-50/30" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Bell
          className={`${compact ? "w-3 h-3" : "w-4 h-4"} mt-1 text-primary shrink-0`}
        />

        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            {/* Title */}
            <h3
              className={`flex items-center gap-2 font-semibold text-card-foreground group-hover:text-primary transition-colors break-words ${compact ? "text-xs" : "text-sm sm:text-base"} ${compact ? "" : "sm:truncate"}`}
            >
              {title}
              {isPinned && (
                <Pin size={compact ? 12 : 16} className="text-yellow-500" />
              )}
            </h3>
          </div>

          {/* Description */}
          <p
            className={`text-muted-foreground leading-relaxed mt-2 wrap-break-word whitespace-pre-wrap ${compact ? "text-xs" : "text-xs sm:text-sm"}`}
          >
            {formatText(description)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;
