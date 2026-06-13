"use client";

import { useEffect, useState } from "react";

type TypewriterProps = {
  text: string;
  speed?: number;
  className?: string;
};

export function Typewriter({ text, speed = 12, className }: TypewriterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!text) {
      return;
    }

    const interval = window.setInterval(() => {
      setCount((current) => {
        if (current >= text.length) {
          window.clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, speed);

    return () => window.clearInterval(interval);
  }, [speed, text]);

  return <p className={className}>{text.slice(0, count)}</p>;
}
