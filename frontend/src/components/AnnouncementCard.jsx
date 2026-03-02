import { Calendar } from "lucide-react";
import { Bell } from "lucide-react";

const AnnouncementCard = ({ title, description, date }) => {
  return (
    <div className="announcement-card-hover cursor-pointer shadow-md hover:shadow-lg transition p-5 rounded-xl border border-[hsl(var(--announcement-border))] bg-card group">
      <div className="flex items-start gap-3">
      <Bell className="w-3 h-3 sm:w-4 sm:h-4 mt-1 text-primary shrink-0" />

        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            
            {/* Title */}
            <h3 className="text-sm sm:text-base font-semibold text-card-foreground group-hover:text-primary transition-colors break-words sm:truncate">              
              {title}
            </h3>

            {/* Date */}
            {/* <div className="flex items-center gap-1.5 text-[hsl(var(--date-color))] text-xs sm:text-sm shrink-0">
              <Calendar className="w-4 h-4" />
              <span>{date}</span>
            </div> */}

          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2 break-words sm:line-clamp-2 whitespace-pre-wrap">
            {description}
          </p>

        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;