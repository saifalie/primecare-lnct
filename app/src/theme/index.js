export const colors = {
  // Backgrounds
  background: '#070710',
  surface: '#0F0F1A',
  card: '#13131F',
  cardBorder: '#1E1E30',
  cardBorderLight: '#2A2A40',

  // Primary
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',

  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Risk levels
  green: '#22C55E',
  yellow: '#F59E0B',
  red: '#EF4444',

  // Text
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#3D3D5C',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  divider: '#1A1A2E',
};

export const gradients = {
  primary: ['#6366F1', '#4F46E5'],
  success: ['#22C55E', '#16A34A'],
  warning: ['#F59E0B', '#D97706'],
  danger: ['#EF4444', '#DC2626'],
  card: ['#16162A', '#0F0F1A'],
  dark: ['#13131F', '#070710'],
  indigo: ['#312E81', '#1E1B4B'],
};

export const fonts = {
  thin: 'Inter_100Thin',
  extraLight: 'Inter_200ExtraLight',
  light: 'Inter_300Light',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
  full: 999,
};

export const shadow = {
  small: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  medium: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  glow: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
};

export const getRiskColor = (riskLevel) => {
  switch (riskLevel?.toUpperCase()) {
    case 'GREEN':
    case 'GOOD':
      return colors.green;
    case 'YELLOW':
    case 'ATTENTION':
      return colors.yellow;
    case 'RED':
    case 'URGENT':
      return colors.red;
    default:
      return colors.textSecondary;
  }
};

export const getRiskLabel = (riskLevel) => {
  switch (riskLevel?.toUpperCase()) {
    case 'GREEN': return 'Good';
    case 'YELLOW': return 'Attention';
    case 'RED': return 'Urgent';
    default: return 'Unknown';
  }
};

export const getRiskGradient = (riskLevel) => {
  switch (riskLevel?.toUpperCase()) {
    case 'GREEN':
    case 'GOOD':
      return ['#22C55E', '#16A34A'];
    case 'YELLOW':
    case 'ATTENTION':
      return ['#F59E0B', '#D97706'];
    case 'RED':
    case 'URGENT':
      return ['#EF4444', '#DC2626'];
    default:
      return ['#6366F1', '#4F46E5'];
  }
};
