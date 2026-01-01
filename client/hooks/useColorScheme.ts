import { useThemeContext } from "@/context/ThemeContext";

export function useColorScheme(): "light" | "dark" {
  const { effectiveColorScheme } = useThemeContext();
  return effectiveColorScheme;
}
