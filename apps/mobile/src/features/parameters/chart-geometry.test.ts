import {
  chartGeometry, niceStep, valueDomain,
} from './chart-geometry';

describe('niceStep', () => {
  it.each([
    [1, 4, 0.5],
    [3, 4, 1],
    [7, 4, 2],
    [18, 4, 5],
    [180, 4, 50],
    [0, 4, 1],
  ])('splits %p in about %p round steps of %p', (span, count, expected) => {
    expect(niceStep(span, count)).toBeCloseTo(expected);
  });
});

describe('valueDomain', () => {
  it('covers the values and both thresholds, on round ticks', () => {
    expect(valueDomain([7.1, 7.3], 6.5, 7.5)).toEqual({
      low: 6.5,
      high: 7.5,
      step: 0.5,
    });
    expect(valueDomain([8.4], 6.5, 7.5)).toMatchObject({
      low: 6.5,
      high: 8.5,
    });
  });

  it('opens a flat series around its value, and has a default when empty', () => {
    expect(valueDomain([25], null, null)).toMatchObject({
      low: 22,
      high: 28,
    });
    expect(valueDomain([], null, null)).toEqual({
      low: 0,
      high: 1,
      step: 1,
    });
  });
});

describe('chartGeometry', () => {
  const base = {
    from: 0,
    to: 100,
    width: 140,
    height: 120,
    padding: {
      left: 40,
      right: 0,
      top: 0,
      bottom: 20,
    },
  };

  it('places points in time order and draws a line through them', () => {
    const geometry = chartGeometry({
      ...base,
      min: 6,
      max: 8,
      points: [
        {
          time: 100,
          value: 8,
          outOfRange: false,
        },
        {
          time: 0,
          value: 6,
          outOfRange: false,
        },
      ],
    });

    expect(geometry.points.map(({ x, y }) => [x, y])).toEqual([[40, 100], [140, 0]]);
    expect(geometry.line).toBe('M40 100 L140 0');
    expect(geometry.band).toEqual({
      y: 0,
      height: 100,
    });
    expect(geometry.ticks.map((tick) => tick.value)).toEqual([6, 6.5, 7, 7.5, 8]);
  });

  it('opens the band to the edge of the plot when a bound is missing, and skips it with none', () => {
    const point = {
      time: 50,
      value: 10,
      outOfRange: true,
    };
    const onlyMax = chartGeometry({
      ...base,
      min: null,
      max: 5,
      points: [point],
    });

    // Domain 4..10 on steps of 2: the band runs from the bottom of the plot up to 5.
    expect(onlyMax.line).toBe('');
    expect(onlyMax.band).toEqual({
      y: 83.3,
      height: 16.7,
    });
    expect(chartGeometry({
      ...base,
      min: null,
      max: null,
      points: [point],
    }).band).toBeNull();
  });
});
