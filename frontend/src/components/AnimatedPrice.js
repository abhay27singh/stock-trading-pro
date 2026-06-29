import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

/**
 * Smoothly tweens a number when `value` changes and flashes green/red
 * depending on direction — the classic ticker effect.
 */
const AnimatedPrice = ({ value, prefix = '₹', decimals = 2, style }) => {
  const ref = useRef(null);
  const prev = useRef(value);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    const from = prev.current ?? value;
    const to = Number(value) || 0;

    if (to !== from) {
      setFlash(to > from ? 'flash-up' : 'flash-down');
      const t = setTimeout(() => setFlash(''), 600);

      const controls = animate(from, to, {
        duration: 0.5,
        ease: 'easeOut',
        onUpdate: (v) => {
          if (ref.current) {
            ref.current.textContent =
              prefix + v.toLocaleString('en-IN', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
              });
          }
        },
      });
      prev.current = to;
      return () => { clearTimeout(t); controls.stop(); };
    }
  }, [value, prefix, decimals]);

  return (
    <span
      ref={ref}
      className={flash}
      style={{ borderRadius: 6, padding: '0 4px', transition: 'background-color .2s', ...style }}
    >
      {prefix}
      {(Number(value) || 0).toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
};

export default AnimatedPrice;
