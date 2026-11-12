import React, { useEffect, useRef } from 'react';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';
import { COLORS, MONO } from '../theme';

/**
 * Aggregates raw {time, price} ticks into OHLC candles.
 * bucketSeconds = candle width in seconds (default 60 = 1-minute candles).
 */
const buildCandles = (data, bucketSeconds = 60) => {
  if (!data || data.length === 0) return [];

  const buckets = {};
  for (const point of data) {
    const key = Math.floor(point.time / bucketSeconds) * bucketSeconds;
    if (!buckets[key]) {
      buckets[key] = { time: key, open: point.price, high: point.price, low: point.price, close: point.price };
    } else {
      const b = buckets[key];
      b.high = Math.max(b.high, point.price);
      b.low = Math.min(b.low, point.price);
      b.close = point.price;
    }
  }

  return Object.values(buckets).sort((a, b) => a.time - b.time);
};

const pickBucket = (data) => {
  const span = data[data.length - 1].time - data[0].time;
  if (span > 86400) return 900;
  if (span > 14400) return 300;
  if (span > 3600) return 120;
  if (span < 120) return 10;
  if (span < 600) return 30;
  return 60;
};

const TradingChart = ({ data, height = 420 }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);
  const fittedRef = useRef(false);

  // Create the chart once
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { color: COLORS.surface },
        textColor: COLORS.textDim,
        // Axis labels are all figures, so they take the monospace face for the same
        // reason tables do: digits keep a fixed width and the scale stops twitching.
        fontFamily: MONO,
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.7)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.7)' },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: 'rgba(148, 163, 184, 0.4)', style: 0 },
        horzLine: { color: 'rgba(148, 163, 184, 0.4)', style: 0 },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: COLORS.border,
        rightOffset: 5,
        barSpacing: 8,
      },
      rightPriceScale: {
        borderColor: COLORS.border,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
    });

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
        lineSeriesRef.current = null;
        fittedRef.current = false;
      }
    };
  }, [height]);

  // Update series data without recreating the chart — preserves zoom/pan
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !data || data.length === 0) return;

    // Detect real OHLCV format {time, open, high, low, close} vs tick format {time, price}
    const isOhlcv = data[0] && data[0].open !== undefined;

    if (isOhlcv) {
      // Real candles from yfinance — use directly
      if (!candleSeriesRef.current) {
        candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
          upColor: COLORS.up,
          downColor: COLORS.down,
          borderDownColor: COLORS.down,
          borderUpColor: COLORS.up,
          wickDownColor: COLORS.down,
          wickUpColor: COLORS.up,
        });
      }
      const deduped = [];
      const seen = new Set();
      for (const c of data) {
        if (!seen.has(c.time)) { seen.add(c.time); deduped.push(c); }
      }
      candleSeriesRef.current.setData(deduped);
    } else {
      // Legacy tick format — aggregate into candles
      const bucket = pickBucket(data);
      const candles = buildCandles(data, bucket);
      if (candles.length >= 1) {
        if (!candleSeriesRef.current) {
          candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
            upColor: COLORS.up,
            downColor: COLORS.down,
            borderDownColor: COLORS.down,
            borderUpColor: COLORS.up,
            wickDownColor: COLORS.down,
            wickUpColor: COLORS.up,
          });
        }
        candleSeriesRef.current.setData(candles);
      } else {
        if (!lineSeriesRef.current) {
          lineSeriesRef.current = chart.addSeries(LineSeries, {
            color: COLORS.up,
            lineWidth: 2,
          });
        }
        const seen = new Set();
        const uniqueData = [];
        for (const point of data) {
          if (!seen.has(point.time)) {
            seen.add(point.time);
            uniqueData.push({ time: point.time, value: point.price });
          }
        }
        lineSeriesRef.current.setData(uniqueData);
      }
    }

    if (!fittedRef.current) {
      chart.timeScale().fitContent();
      fittedRef.current = true;
    }
  }, [data]);

  return (
    <div
      ref={chartContainerRef}
      style={{
        width: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
};

export default TradingChart;
