import { Button } from "@/components/ui/button"

export default function ActionCard({
  title,
  description,
  icon,
  children,
  buttonLabel = "Submit",
  onClick = () => {},
  disabled = false,
  variant = "default",
}) {
  const borderColorMap = {
    default: "border-border hover:border-primary/50",
    warning: "border-border hover:border-yellow-500/50",
    destructive: "border-border hover:border-destructive/50",
  }

  const headerBgMap = {
    default: "bg-muted/50",
    warning: "bg-yellow-500/10",
    destructive: "bg-destructive/10",
  }

  const iconColorMap = {
    default: "text-primary",
    warning: "text-yellow-600",
    destructive: "text-destructive",
  }

  const buttonVariantMap = {
    default: "default",
    warning: "default",
    destructive: "destructive",
  }

  const buttonClassMap = {
    default: "",
    warning: "bg-yellow-600 hover:bg-yellow-700 text-white",
    destructive: "",
  }

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden transition-colors flex flex-col ${borderColorMap[variant]}`}
    >
      {/* Header */}
      <div className={`${headerBgMap[variant]} px-6 py-4 flex items-center gap-3`}>
        {icon && <div className={iconColorMap[variant]}>{icon}</div>}

        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">{children}</div>

      {/* Footer Button */}
      <div className="px-6 pb-4">
        <Button
          onClick={onClick}
          disabled={disabled}
          className={`w-full ${buttonClassMap[variant]}`}
          variant={buttonVariantMap[variant]}
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  )
}
