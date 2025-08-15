import React, { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface AnimatedNumberProps {
  n: number;
  formatter?: (value: number) => string;
  duration?: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  n,
  formatter,
  duration = 1,
}) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest: number) => {
    const formatted = formatter
      ? formatter(latest)
      : Math.round(latest).toString();
    return formatted;
  });

  useEffect(() => {
    const controls = animate(count, n, {
      duration: duration,
      ease: "easeOut",
    });
    return controls.stop;
  }, [n, count, duration]);

  return <motion.span>{rounded}</motion.span>;
};

export default AnimatedNumber;
