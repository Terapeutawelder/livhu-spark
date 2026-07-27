import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
    >
      {isDark ? <Sun className="h-3.5 w-3.5 text-gold" /> : <Moon className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{isDark ? "Claro" : "Escuro"}</span>
    </button>
  );
}
