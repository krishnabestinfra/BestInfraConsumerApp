import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { 
  Line, 
  Circle, 
  Text as SvgText, 
  G, 
  Path,
  Polygon 
} from 'react-native-svg';
import { COLORS } from '../constants/colors';

const { width: screenWidth } = Dimensions.get('window');
const DIAGRAM_SIZE = screenWidth * 0.65; // Increased to 75% for bigger size
const CENTER = DIAGRAM_SIZE / 2;
const MAX_VOLTAGE_SCALE = 250; // Maximum voltage for scaling (250V)
const MAX_CURRENT_SCALE = 50; // Maximum current for scaling (50A)
const VECTOR_LENGTH_FACTOR = 0.8; // Use 80% of radius for vectors

const VectorDiagram = ({
  voltage = { r: 0, y: 0, b: 0 },
  current = { r: 0, y: 0, b: 0 },
  powerFactor = { r: 0, y: 0, b: 0 },
  totalKW = null,
  loading = false
}) => {
  // Convert degrees to radians
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  // Default angles with 30° rotation offset (matching web version)
  const defaultAnglesDeg = {
    VR: -120,  // R phase
    VY: 0,     // Y phase
    VB: 120,   // B phase
  };

  const colors = { 
    VR: '#dc2626',  // Red line
    VY: '#eab308',  // Yellow lines
    VB: '#2563eb'   // Blue lines
  };

  // Convert voltage from centivolts to volts for calculations
  const getVoltageInVolts = (phase) => {
    const voltageInCentivolts = voltage[phase] || 0;
    return voltageInCentivolts / 100; // Convert centivolts to volts
  };

  // Get actual voltage and current values
  const actualVrValue = getVoltageInVolts('r');
  const actualVyValue = getVoltageInVolts('y');
  const actualVbValue = getVoltageInVolts('b');
  const actualIrValue = current.r || 0;
  const actualIyValue = current.y || 0;
  const actualIbValue = current.b || 0;

  const width = DIAGRAM_SIZE;
  const height = DIAGRAM_SIZE;
  const center = { x: width / 2, y: height / 2 + 35 }; // Move diagram down by 35px
  const axisLen = Math.min(width, height) / 3;

  // Convert angle to point with 30° rotation offset (like web version)
  const toPoint = (deg, magnitude = 1) => {
    const rotatedDeg = deg + 30;
    const rad = (rotatedDeg * Math.PI) / 180;
    const baseLength = axisLen * magnitude;
    const extendedLength = baseLength + 20; // Add 20px to each vector line
    return {
      x: center.x + extendedLength * Math.cos(rad),
      y: center.y + extendedLength * Math.sin(rad),
    };
  };

  // Calculate dashed line angle based on current value and power factor
  const getDashedLineAngle = (value, baseAngle, vectorName) => {
    // If using power factor, calculate angle from power factor
    const phase = vectorName === 'VR' ? 'r' : vectorName === 'VY' ? 'y' : 'b';
    const pf = powerFactor[phase] || 0;
    if (pf !== 0) {
      const clampedPf = Math.max(-1, Math.min(1, pf));
      const phaseAngle = Math.acos(clampedPf) * (180 / Math.PI);
      return baseAngle - phaseAngle;
    }
    
    // Dynamic angle calculation based on current value
    const voltageMagnitude = Math.abs(value);
    const normalizedVoltage = voltageMagnitude / 100;
    const minAngle = 15;
    const maxAngle = 45;
    const dynamicOffset = minAngle + normalizedVoltage * (maxAngle - minAngle);
    const offset = value < 0 ? -dynamicOffset : dynamicOffset;
    return baseAngle + offset;
  };

  // Calculate vector magnitudes
  const vectorMagnitudes = useMemo(() => {
    const maxValue = Math.max(actualVrValue, actualVyValue, actualVbValue);
    const scaleFactor = Math.min(100 / maxValue, 1);

    return {
      VR: Math.max((actualVrValue * scaleFactor) / 100, 0.4),
      VY: Math.max((actualVyValue * scaleFactor) / 100, 0.4),
      VB: Math.max((actualVbValue * scaleFactor) / 100, 0.4),
    };
  }, [actualVrValue, actualVyValue, actualVbValue]);

  // Dynamic label offset calculation
  const getDynamicLabelOffset = (angle, isVoltage = true) => {
    const rotatedAngle = (((angle + 30) % 360) + 360) % 360;

    if (rotatedAngle >= 330 || rotatedAngle < 30) {
      return isVoltage
        ? { x: 15, y: -30, align: 'start', valueY: -15 }
        : { x: 15, y: 10, align: 'start' };
    } else if (rotatedAngle >= 30 && rotatedAngle < 60) {
      return isVoltage
        ? { x: 10, y: -40, align: 'start', valueY: -25 }
        : { x: -70, y: 0, align: 'end' };
    } else if (rotatedAngle >= 60 && rotatedAngle < 120) {
      return isVoltage
        ? { x: -10, y: -75, align: 'middle', valueY: -58 }
        : { x: 90, y: 10, align: 'start' };
    } else if (rotatedAngle >= 120 && rotatedAngle < 150) {
      return isVoltage
        ? { x: -70, y: -30, align: 'end', valueY: -15 }
        : { x: 15, y: 0, align: 'start' };
    } else if (rotatedAngle >= 150 && rotatedAngle < 210) {
      return isVoltage
        ? { x: -75, y: -10, align: 'end', valueY: 5 }
        : { x: -75, y: 15, align: 'end' };
    } else if (rotatedAngle >= 210 && rotatedAngle < 240) {
      return isVoltage
        ? { x: -70, y: 10, align: 'end', valueY: 25 }
        : { x: 15, y: 15, align: 'start' };
    } else if (rotatedAngle >= 240 && rotatedAngle < 300) {
      return isVoltage
        ? { x: 0, y: 35, align: 'middle', valueY: 50 }
        : { x: 70, y: 0, align: 'start' };
    } else {
      return isVoltage
        ? { x: 15, y: 10, align: 'start', valueY: 25 }
        : { x: -70, y: 10, align: 'end' };
    }
  };

  // Render arrow head
  const renderArrowHead = (endPoint, angle, color) => {
    const arrowSize = 12;
    const rotatedAngle = angle + 30;
    const rad = (rotatedAngle * Math.PI) / 180;
    
    // Arrow points
    const arrowAngle1 = rad - (30 * Math.PI) / 180;
    const arrowAngle2 = rad + (30 * Math.PI) / 180;
    
    const p1 = {
      x: endPoint.x - arrowSize * Math.cos(arrowAngle1),
      y: endPoint.y - arrowSize * Math.sin(arrowAngle1),
    };
    const p2 = {
      x: endPoint.x - arrowSize * Math.cos(arrowAngle2),
      y: endPoint.y - arrowSize * Math.sin(arrowAngle2),
    };

    return (
      <Polygon
        points={`${endPoint.x},${endPoint.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`}
        fill={color}
        stroke={color}
        strokeWidth={4}
      />
    );
  };

  // Calculate per-phase power: Power (W) = Voltage (V) × Current (A)
  const calculatePower = (phase) => {
    const voltageInVolts = getVoltageInVolts(phase);
    const currentInAmps = current[phase] || 0;
    return voltageInVolts * currentInAmps; // Apparent power per phase in VA (displayed as W)
  };

  // Render voltage vector
  const renderVoltageVector = (key) => {
    const magnitude = Math.max(vectorMagnitudes[key], 0.5);
    const baseAngle = defaultAnglesDeg[key];
    const p = toPoint(baseAngle, magnitude);
    const color = colors[key];
    const voltageOffset = getDynamicLabelOffset(baseAngle, true);
    const value = key === 'VR' ? actualVrValue : key === 'VY' ? actualVyValue : actualVbValue;

    // Position labels correctly:
    // VR (red) at top, VB (green) at left bottom, VY (blue) at right bottom
    let labelX = p.x + voltageOffset.x;
    let labelY = p.y + voltageOffset.y;
    let valueX = p.x + voltageOffset.x;
    let valueY = p.y + (voltageOffset.valueY || voltageOffset.y + 15);
    let textAnchor = voltageOffset.align;

    if (key === 'VR') {
      // Red (VR) at the top center
      labelX = center.x;
      labelY = 20;
      valueX = center.x;
      valueY = 35;
      textAnchor = 'middle';
    } else if (key === 'VB') {
      // Green (VB) at left bottom (southwest) - column layout with right margin
      labelX = 5; // Moved left by 15px (from 20) to add right margin spacing
      labelY = height - 50; // VB label
      valueX = 5; // Moved left by 15px (from 20) to add right margin spacing
      valueY = height - 35; // VB value below label
      textAnchor = 'start';
    } else if (key === 'VY') {
      // Blue (VY) at right bottom (southeast) - column layout with left margin
      labelX = width - 5; // Moved right by 15px (from width - 15) to add left margin spacing
      labelY = height - 50; // VY label
      valueX = width - 5; // Moved right by 15px (from width - 15) to add left margin spacing
      valueY = height - 35; // VY value below label
      textAnchor = 'end';
    }

    return (
      <G key={`default_${key}`}>
        {/* Vector line */}
        <Line
          x1={center.x}
          y1={center.y}
          x2={p.x}
          y2={p.y}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
        
        {/* Arrow head */}
        {renderArrowHead(p, baseAngle, color)}

        {/* Labels */}
        <SvgText
          x={labelX}
          y={labelY}
          fontSize={14}
          fill={color}
          fontFamily="Manrope-Bold"
          fontWeight="bold"
          textAnchor={textAnchor}
        >
          {key}
        </SvgText>
        <SvgText
          x={valueX}
          y={valueY}
          fontSize={10}
          fill={color}
          fontFamily="Manrope-SemiBold"
          textAnchor={textAnchor}
          fontWeight="600"
        >
          {`${Math.round(value)} V`}
        </SvgText>
      </G>
    );
  };

  // Render current vector (dashed)
  const renderCurrentVector = (key) => {
    const currentValue = key === 'VR' ? actualIrValue : key === 'VY' ? actualIyValue : actualIbValue;
    const baseAngle = defaultAnglesDeg[key];
    const dashedAngle = getDashedLineAngle(currentValue, baseAngle, key);
    const magnitude = Math.max(vectorMagnitudes[key], 0.4);
    const dashedP = toPoint(dashedAngle, magnitude * 0.7);
    const color = colors[key];
    const currentOffset = getDynamicLabelOffset(dashedAngle, false);

    // Position current labels correctly:
    // IR (red) at top, IB (green) at left bottom, IY (blue) at right bottom
    let labelX = dashedP.x + currentOffset.x;
    let labelY = dashedP.y + currentOffset.y;
    let textAnchor = currentOffset.align;

    if (key === 'VR') {
      // Red (IR) at the top center, below VR
      labelX = center.x;
      labelY = 50;
      textAnchor = 'middle';
    } else if (key === 'VB') {
      // Green (IB) at left bottom (southwest), below VB value - column layout with right margin
      labelX = 5; // Moved left by 15px (from 20) to match VB position
      labelY = height - 20; // IB below VB value
      textAnchor = 'start';
    } else if (key === 'VY') {
      // Blue (IY) at right bottom (southeast), below VY value - column layout with left margin
      labelX = width - 5; // Added left margin spacing (moved left from width - 30)
      labelY = height - 20; // IY below VY value
      textAnchor = 'end';
    }

    return (
      <G key={`dashed_${key}`}>
        {/* Dashed line */}
        <Line
          x1={center.x}
          y1={center.y}
          x2={dashedP.x}
          y2={dashedP.y}
          stroke={color}
          strokeWidth={3}
          strokeDasharray="8,4"
          strokeLinecap="round"
          opacity={0.8}
        />
        
        {/* Arrow head */}
        {renderArrowHead(dashedP, dashedAngle, color)}

        {/* Label */}
        <SvgText
          x={labelX}
          y={labelY}
          fontSize={12}
          fill={color}
          fontFamily="Manrope-Bold"
          fontWeight="700"
          textAnchor={textAnchor}
          opacity={1.0}
        >
          {`I${key.charAt(1)}: ${Math.round(currentValue)} A`}
        </SvgText>
      </G>
    );
  };

  // Render angle arc
  const renderAngleArc = (key) => {
    const baseAngle = defaultAnglesDeg[key];
    const currentValue = key === 'VR' ? actualIrValue : key === 'VY' ? actualIyValue : actualIbValue;
    const dashedAngle = getDashedLineAngle(currentValue, baseAngle, key);
    const arcRadius = Math.min(width, height) / 5; // Increased from /12 to /5 to move arcs outward
    const startAngle = Math.min(baseAngle, dashedAngle);
    const actualAngleSpan = Math.abs(dashedAngle - baseAngle);
    const actualEndAngle = startAngle + actualAngleSpan;
    const color = colors[key];

    // Generate arc path
    const arcPoints = [];
    for (let angle = startAngle; angle <= actualEndAngle; angle += 1) {
      const rotatedAngle = angle + 30;
      const rad = (rotatedAngle * Math.PI) / 180;
      arcPoints.push({
        x: center.x + arcRadius * Math.cos(rad),
        y: center.y + arcRadius * Math.sin(rad),
      });
    }

    // Create path string
    if (arcPoints.length < 2) return null;

    let pathData = `M ${arcPoints[0].x} ${arcPoints[0].y}`;
    for (let i = 1; i < arcPoints.length; i++) {
      pathData += ` L ${arcPoints[i].x} ${arcPoints[i].y}`;
    }

    const midAngle = ((baseAngle + dashedAngle) / 2 + 30) * Math.PI / 180;
    // Position label perfectly centered on the arc at a distance from center
    const labelDistance = arcRadius + 25; // Distance from center for label
    const labelX = center.x + labelDistance * Math.cos(midAngle);
    const labelY = center.y + labelDistance * Math.sin(midAngle);

    return (
      <G key={`arc_${key}`}>
        <Path
          d={pathData}
          stroke={color}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          opacity={1.0}
        />
        <SvgText
          x={labelX}
          y={labelY}
          fontSize={11}
          fill={color}
          fontFamily="Manrope-SemiBold"
          textAnchor="middle"
          fontWeight="600"
        >
          {`${Math.round(actualAngleSpan)}°`}
        </SvgText>
      </G>
    );
  };

  // Render 120° angle labels - positioned at midpoints between voltage vectors
  const renderAngleLabels = () => {
    const labelRadius = axisLen * 0.6; // Position labels at 60% of axis length
    
    // Midpoint between VR (-120°) and VY (0°) = -60° (rotated +30° = -30°)
    const angle1 = -30 * Math.PI / 180;
    const x1 = center.x + labelRadius * Math.cos(angle1);
    const y1 = center.y + labelRadius * Math.sin(angle1);
    
    // Midpoint between VY (0°) and VB (120°) = 60° (rotated +30° = 90°)
    const angle2 = 90 * Math.PI / 180;
    const x2 = center.x + labelRadius * Math.cos(angle2);
    const y2 = center.y + labelRadius * Math.sin(angle2);
    
    // Midpoint between VB (120°) and VR (-120° or 240°) = 180° (rotated +30° = 210°)
    const angle3 = 210 * Math.PI / 180;
    const x3 = center.x + labelRadius * Math.cos(angle3);
    const y3 = center.y + labelRadius * Math.sin(angle3);
    
    return (
      <G>
        <SvgText
          x={x1}
          y={y1}
          fontSize={11}
          fill="#374151"
          fontFamily="Manrope-Regular"
          textAnchor="middle"
        >
          120°
        </SvgText>
        <SvgText
          x={x2}
          y={y2}
          fontSize={11}
          fill="#374151"
          fontFamily="Manrope-Regular"
          textAnchor="middle"
        >
          120°
        </SvgText>
        <SvgText
          x={x3}
          y={y3}
          fontSize={11}
          fill="#374151"
          fontFamily="Manrope-Regular"
          textAnchor="middle"
        >
          120°
        </SvgText>
      </G>
    );
  };

  // Format values for display
  const formatValue = (value, decimals = 2) => {
    if (value === null || value === undefined || value === 0) return '0.00';
    if (typeof value === 'number') {
      return value.toFixed(decimals);
    }
    return value;
  };

  // Get colors for each phase (for table) - VR red, VY yellow, VB blue
  const phaseColors = {
    r: { voltage: '#dc2626', current: '#4CAF50', dot: '#dc2626' },
    y: { voltage: '#eab308', current: '#4CAF50', dot: '#eab308' },
    b: { voltage: '#2563eb', current: '#4CAF50', dot: '#2563eb' },
  };

  // Data table row component - Proper table structure
  const DataTableRow = ({ phase, voltageValue, currentValue, powerValue, color, voltageLabel, currentLabel, powerLabel }) => (
    <View style={styles.dataRow}>
      {/* Voltage Column */}
      <View style={styles.tableColumn}>
        <View style={styles.columnItem}>
          <View style={[styles.phaseDot, { backgroundColor: color }]} />
          <Text style={styles.dataLabel}>{voltageLabel}</Text>
        </View>
        <Text style={styles.dataValue}>
          {loading ? '...' : `${formatValue(voltageValue)} V`}
        </Text>
      </View>
      
      {/* Current Column */}
      <View style={styles.tableColumn}>
        <View style={styles.columnItem}>
          <View style={[styles.phaseDot, { backgroundColor: color }]} />
          <Text style={styles.dataLabel}>{currentLabel}</Text>
        </View>
        <Text style={styles.dataValue}>
          {loading ? '...' : `${formatValue(currentValue)} A`}
        </Text>
      </View>
      
      {/* Power Column */}
      <View style={styles.tableColumn}>
        <View style={styles.columnItem}>
          <View style={[styles.phaseDot, { backgroundColor: color }]} />
          <Text style={styles.dataLabel}>{powerLabel}</Text>
        </View>
        <Text style={styles.dataValue}>
          {loading ? '...' : `${formatValue(powerValue, 2)} W`}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vector Diagram</Text>
      
      {/* Vector Diagram - Enhanced with arrow heads and angle arcs */}
      <View style={styles.diagramContainer}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Voltage vectors */}
          {renderVoltageVector('VR')}
          {renderVoltageVector('VY')}
          {renderVoltageVector('VB')}

          {/* Current vectors (dashed) */}
          {renderCurrentVector('VR')}
          {renderCurrentVector('VY')}
          {renderCurrentVector('VB')}

          {/* Angle arcs */}
          {renderAngleArc('VR')}
          {renderAngleArc('VY')}
          {renderAngleArc('VB')}

          {/* Angle labels */}
          {renderAngleLabels()}

          {/* Center point - prominent */}
          <Circle
            cx={center.x}
            cy={center.y}
            r={6}
            fill="#dc2626"
            stroke="#dc2626"
            strokeWidth={3}
          />
          <Circle
            cx={center.x}
            cy={center.y}
            r={3}
            fill="#ffffff"
            stroke="#dc2626"
            strokeWidth={1}
          />
        </Svg>
      </View>

      {/* Data Table - Bottom Section - Proper Table Structure */}
      <View style={styles.tableWrapper}>
        <View style={styles.tableHeader}>
          <Text style={styles.headerText}>Voltage</Text>
          <Text style={styles.headerText}>Current</Text>
          <Text style={styles.headerText}>Power</Text>
        </View>
        
        <View style={styles.tableContainer}>
          <DataTableRow
            phase="r"
            voltageValue={getVoltageInVolts('r')}
            currentValue={current.r}
            powerValue={calculatePower('r')}
            color={phaseColors.r.dot}
            voltageLabel="VR"
            currentLabel="IR"
            powerLabel="PR"
            loading={loading}
          />
          
          <DataTableRow
            phase="y"
            voltageValue={getVoltageInVolts('y')}
            currentValue={current.y}
            powerValue={calculatePower('y')}
            color={phaseColors.y.dot}
            voltageLabel="VY"
            currentLabel="IY"
            powerLabel="PY"
            loading={loading}
          />
          
          <DataTableRow
            phase="b"
            voltageValue={getVoltageInVolts('b')}
            currentValue={current.b}
            powerValue={calculatePower('b')}
            color={phaseColors.b.dot}
            voltageLabel="VB"
            currentLabel="IB"
            powerLabel="PB"
            loading={loading}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 0,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
    marginBottom: 8,
  },
  diagramContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
    // paddingVertical: 5,
  },
  tableWrapper: {
    width: '100%',
    // marginTop: 5,
  },
  tableContainer: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primaryFontColor,
    opacity: 0.8,
    flex: 1,
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  tableColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  columnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dataLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    color: COLORS.primaryFontColor,
  },
  dataValue: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primaryFontColor,
    textAlign: 'center',
    marginTop: 0,
  },
});

export default VectorDiagram;
