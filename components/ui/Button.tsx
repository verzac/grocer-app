import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type Props = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  textStyle?: TextStyle;
};

export function Button({
  title,
  variant = 'primary',
  loading,
  disabled,
  textStyle,
  style,
  ...rest
}: Props) {
  const palette = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        palette.container,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style as ViewStyle,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={palette.indicator} />
      ) : (
        <Text style={[styles.label, palette.label, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const variants = {
  primary: {
    container: { backgroundColor: '#16a34a' },
    label: { color: '#f8fafc' },
    indicator: '#f8fafc',
  },
  secondary: {
    container: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
    label: { color: '#e2e8f0' },
    indicator: '#e2e8f0',
  },
  danger: {
    container: { backgroundColor: '#b91c1c' },
    label: { color: '#fef2f2' },
    indicator: '#fef2f2',
  },
} as const;

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.88,
  },
});
