import { Zap } from "lucide-react";
import { motion, useCycle } from "framer-motion";
import { useEffect } from "react";

export default function QuickLogButton() {
  const [flash, cycleFlash] = useCycle(false, true);

  useEffect(() => {
    const timer = setInterval(() => {
      // quick double flash
      cycleFlash(); setTimeout(cycleFlash, 120);
      setTimeout(cycleFlash, 300); setTimeout(cycleFlash, 420);
    }, 5000);
    return () => clearInterval(timer);
  }, [cycleFlash]);

  return (
    <button className="btn btn-primary">
      <motion.span
        animate={flash ? { scale: 1.2, opacity: 1 } : { scale: 1, opacity: 0.9 }}
        transition={{ duration: 0.15 }}
        className="mr-2"
      >
        <Zap className="w-5 h-5 text-yellow-300" />
      </motion.span>
      Quick Log
    </button>
  );
}
