import { Calendar } from "lucide-react";

const AnnouncementCard = ({ title, description, date }) => {
  return (
    <div className="announcement-card-hover cursor-pointer shadow-md hover:shadow-lg transition p-5 rounded-xl border border-[hsl(var(--announcement-border))] bg-card group">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-2.5 h-2.5 mt-2 rounded-full bg-primary" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold text-card-foreground group-hover:text-primary transition-colors truncate">
              {title}
            </h3>

            <div className="flex items-center gap-1.5 text-[hsl(var(--date-color))] text-sm shrink-0">
              <Calendar className="w-4 h-4" />
              <span>{date}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mt-2 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard;
