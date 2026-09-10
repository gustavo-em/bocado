import React from 'react';
import {
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CloudOff,
  ExternalLink,
  FileText,
  Heart,
  Image as ImageIcon,
  Info,
  Minus,
  Plus,
  Search,
  Settings2,
  Share2,
  Trash2,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react-native';

import { iconSize, iconStroke, type IconName } from '../theme/icons';

const ICONS: Record<IconName, LucideIcon> = {
  search: Search,
  plus: Plus,
  check: Check,
  x: X,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  calendar: Calendar,
  'settings-2': Settings2,
  heart: Heart,
  'trash-2': Trash2,
  minus: Minus,
  'undo-2': Undo2,
  info: Info,
  'cloud-off': CloudOff,
  'external-link': ExternalLink,
  'share-2': Share2,
  image: ImageIcon,
  'file-text': FileText,
  'calendar-days': CalendarDays,
};

export interface IconProps {
  name: IconName;
  /** `row` (20) inside a line or chip, `action` (24) for a standalone action. */
  size?: keyof typeof iconSize;
  color: string;
  /**
   * Solid inside. Only the heart uses it, to say "favourite" without adding a
   * second glyph; everything else stays a 1,75 outline.
   */
  fill?: string;
}

/** The only way an icon reaches the screen: Lucide, one stroke weight, two sizes. */
export function Icon({ name, size = 'row', color, fill = 'none' }: IconProps) {
  const Component = ICONS[name];
  return (
    <Component
      size={iconSize[size]}
      color={color}
      fill={fill}
      strokeWidth={iconStroke}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
