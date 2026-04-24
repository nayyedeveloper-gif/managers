import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  FolderOpen,
  Gem,
  Lightbulb,
  Palette,
  Rocket,
  Settings,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

type SpaceIconProps = {
  icon?: string | null;
  className?: string;
  style?: CSSProperties;
};

const spaceIconMap: Record<string, LucideIcon> = {
  "📁": FolderOpen,
  folder: FolderOpen,
  "⚙️": Settings,
  settings: Settings,
  "🎨": Palette,
  palette: Palette,
  "📈": TrendingUp,
  chart: TrendingUp,
  "🚀": Rocket,
  rocket: Rocket,
  "💡": Lightbulb,
  idea: Lightbulb,
  "🔬": ShieldCheck,
  shield: ShieldCheck,
  "🏆": Gem,
  gem: Gem,
};

export function SpaceIcon({ icon, className, style }: SpaceIconProps) {
  const Icon = (icon && spaceIconMap[icon]) || Briefcase;
  return <Icon className={className} style={style} />;
}
