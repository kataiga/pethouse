export interface ChartPoint {
  /** Milliseconds since the epoch. */
  time: number;
  value: number;
  outOfRange: boolean;
}

export interface ChartInput {
  points: readonly ChartPoint[];
  from: number;
  to: number;
  min: number | null;
  max: number | null;
  width: number;
  height: number;
  /** Room left for the value labels on the left and the dates underneath. */
  padding: { left: number;
    right: number;
    top: number;
    bottom: number };
}

export interface PlottedPoint extends ChartPoint {
  x: number;
  y: number;
}

export interface ChartGeometry {
  points: PlottedPoint[];
  /** SVG path through the points in time order; empty with fewer than two. */
  line: string;
  /** The acceptable range as a rectangle, clipped to the plot; null when no bound is set. */
  band: { y: number;
    height: number } | null;
  ticks: { value: number;
    y: number }[];
  plot: { left: number;
    right: number;
    top: number;
    bottom: number };
}

/** A round step giving about `count` intervals over `span`: 1, 2 or 5 times a power of ten. */
export function niceStep (span: number, count: number): number {
  if (span <= 0) {
    return 1;
  }

  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const multiple = [1, 2, 5, 10].find((candidate) => candidate * magnitude >= raw) ?? 10;

  return multiple * magnitude;
}

/** The value axis spans every point and both thresholds, widened to round ticks. */
export function valueDomain (values: readonly number[], min: number | null, max: number | null):
{ low: number;
  high: number;
  step: number } {
  const all = [...values, ...(min === null ? [] : [min]), ...(max === null ? [] : [max])];

  if (all.length === 0) {
    return {
      low: 0,
      high: 1,
      step: 1,
    };
  }

  let low = Math.min(...all);
  let high = Math.max(...all);

  if (low === high) {
    const margin = Math.abs(low) * 0.1 || 1;
    low -= margin;
    high += margin;
  }

  const step = niceStep(high - low, 4);

  return {
    low: Math.floor(low / step) * step,
    high: Math.ceil(high / step) * step,
    step,
  };
}

const round = (value: number): number => Math.round(value * 10) / 10;

export function chartGeometry (input: ChartInput): ChartGeometry {
  const plot = {
    left: input.padding.left,
    right: input.width - input.padding.right,
    top: input.padding.top,
    bottom: input.height - input.padding.bottom,
  };
  const domain = valueDomain(input.points.map((point) => point.value), input.min, input.max);
  const timeSpan = Math.max(input.to - input.from, 1);
  const x = (time: number): number => round(plot.left + ((time - input.from) / timeSpan) * (plot.right - plot.left));
  const y = (value: number): number => round(plot.bottom - ((value - domain.low) / (domain.high - domain.low))
    * (plot.bottom - plot.top));
  const points = [...input.points]
    .sort((a, b) => a.time - b.time)
    .map((point) => ({
      ...point,
      x: x(point.time),
      y: y(point.value),
    }));
  const line = points.length < 2
    ? ''
    : points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
  const band = input.min === null && input.max === null ? null : (() => {
    const top = input.max === null ? plot.top : Math.max(y(input.max), plot.top);
    const bottom = input.min === null ? plot.bottom : Math.min(y(input.min), plot.bottom);

    return {
      y: top,
      height: round(bottom - top),
    };
  })();
  const ticks: { value: number;
    y: number }[] = [];

  for (let value = domain.low; value <= domain.high + domain.step / 2; value += domain.step) {
    const clean = Number(value.toPrecision(12));
    ticks.push({
      value: clean,
      y: y(clean),
    });
  }

  return {
    points,
    line,
    band,
    ticks,
    plot,
  };
}
