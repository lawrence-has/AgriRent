import { useEffect, useState } from 'react';

const useCountUp = (target, duration = 650) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const end = Number(target);
    if (!Number.isFinite(end)) {
      setValue(0);
      return undefined;
    }

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || end === 0) {
      setValue(end);
      return undefined;
    }

    let frame;
    let startTime;
    const tick = (time) => {
      if (startTime === undefined) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 4;
      setValue(end * eased);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
};

export default useCountUp;
