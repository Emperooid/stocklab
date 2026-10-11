import { useMemo } from 'react';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

const NUMERALS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/**
 * A real analog clock face — hands point at `hour`/`minute`, not decorative.
 * Used on the round card so the clock graphic actually shows the round's
 * own hour instead of a generic icon.
 */
export function AnalogClock({
  hour,
  minute = 0,
  size = 84,
  ringColor,
  faceColor = '#FFFFFF',
  handColor = '#1B1540',
}: {
  hour: number;
  minute?: number;
  size?: number;
  ringColor: string;
  faceColor?: string;
  handColor?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const ringWidth = size * 0.07;
  const faceRadius = size / 2 - ringWidth;
  const numeralRadius = faceRadius - size * 0.15;

  const { hourHand, minuteHand } = useMemo(() => {
    const hour12 = hour % 12;
    const hourAngle = ((hour12 + minute / 60) * 30 - 90) * (Math.PI / 180);
    const minuteAngle = (minute * 6 - 90) * (Math.PI / 180);
    const hourLen = faceRadius * 0.48;
    const minuteLen = faceRadius * 0.72;
    return {
      hourHand: { x: cx + hourLen * Math.cos(hourAngle), y: cy + hourLen * Math.sin(hourAngle) },
      minuteHand: { x: cx + minuteLen * Math.cos(minuteAngle), y: cy + minuteLen * Math.sin(minuteAngle) },
    };
  }, [hour, minute, cx, cy, faceRadius]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={cx} cy={cy} r={size / 2 - ringWidth / 2} fill={faceColor} stroke={ringColor} strokeWidth={ringWidth} />
      {NUMERALS.map((n) => {
        const angle = ((n % 12) * 30 - 90) * (Math.PI / 180);
        const x = cx + numeralRadius * Math.cos(angle);
        const y = cy + numeralRadius * Math.sin(angle);
        return (
          <SvgText
            key={n}
            x={x}
            y={y + size * 0.035}
            fontSize={size * 0.13}
            fontWeight="700"
            fill={handColor}
            textAnchor="middle"
          >
            {n}
          </SvgText>
        );
      })}
      <Line x1={cx} y1={cy} x2={hourHand.x} y2={hourHand.y} stroke={handColor} strokeWidth={size * 0.045} strokeLinecap="round" />
      <Line x1={cx} y1={cy} x2={minuteHand.x} y2={minuteHand.y} stroke={handColor} strokeWidth={size * 0.032} strokeLinecap="round" />
      <Circle cx={cx} cy={cy} r={size * 0.045} fill={handColor} />
    </Svg>
  );
}
