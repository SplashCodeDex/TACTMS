import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import { THEME_OPTIONS } from "../../constants";

type ToasterProps = React.ComponentProps<typeof Sonner> & {
  accentColor: (typeof THEME_OPTIONS)[0];
}

const Toaster = ({ accentColor, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--bg-glass)] group-[.toaster]:backdrop-blur-lg group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-[var(--sonner-accent-color)] group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
        style: {
          // Dynamically set background color for action buttons using accentColor
          "--sonner-accent-color": `hsl(${accentColor.values.h}, ${accentColor.values.s}%, ${accentColor.values.l}%)`,
          backgroundColor: `hsl(${accentColor.values.h}, ${accentColor.values.s}%, ${accentColor.values.l}%)`,
        } as React.CSSProperties,
      }}
      {...props}
    />
  )
}

export { Toaster }
