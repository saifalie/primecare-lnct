import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, colors, radius, spacing } from '../theme';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - spacing.md * 2;

export default function TrendChart({ data, color = colors.primary, label = 'Trend', unit = '', baseline, index = 0 }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 800,
        delay: index * 150,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        delay: index * 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const latest = data[data.length - 1]?.y;
  const previous = data[data.length - 2]?.y;
  const trend = latest > previous ? '↑' : latest < previous ? '↓' : '→';
  const trendColor = label === 'HEART RATE' || label === 'BLOOD PRESSURE'
    ? latest > previous ? colors.danger : colors.success
    : latest < previous ? colors.danger : colors.success;

  const chartData = {
    labels: data.map((_, i) => i === 0 ? '7d' : i === data.length - 1 ? 'Now' : ''),
    datasets: [{ data: data.map(d => d.y), color: () => color, strokeWidth: 2.5 }],
  };

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      <LinearGradient colors={['#1C1C3A', '#0F0F22']} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.valueRow}>
              <Text style={[styles.currentValue, { color }]}>{latest}</Text>
              <Text style={[styles.unit, { color: color + 'AA' }]}> {unit}</Text>
              <Text style={[styles.trend, { color: trendColor }]}> {trend}</Text>
            </View>
          </View>
          {baseline && (
            <View style={styles.baselineTag}>
              <Text style={styles.baselineText}>Base: {baseline}{unit}</Text>
            </View>
          )}
        </View>

        <LineChart
          data={chartData}
          width={CHART_WIDTH}
          height={120}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: 'transparent',
            backgroundGradientTo: 'transparent',
            backgroundGradientFromOpacity: 0,
            backgroundGradientToOpacity: 0,
            decimalPlaces: 0,
            color: () => color,
            labelColor: () => colors.textMuted,
            style: { borderRadius: radius.lg },
            propsForDots: { r: '4', strokeWidth: '2', stroke: colors.background },
            propsForBackgroundLines: { stroke: colors.cardBorder, strokeDasharray: '4,4' },
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
          withShadow={false}
          fromZero={false}
        />

        <View style={styles.timeLabels}>
          <Text style={styles.timeLabel}>7 days ago</Text>
          <Text style={styles.timeLabel}>Today</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.sm },
  card: {
    borderRadius: radius.xl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentValue: {
    fontFamily: fonts.black,
    fontSize: 28,
    letterSpacing: -1,
  },
  unit: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  trend: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  baselineTag: {
    backgroundColor: colors.primary + '18',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  baselineText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.primary,
  },
  chart: {
    marginLeft: -spacing.md,
    marginRight: -spacing.md,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  timeLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
});
