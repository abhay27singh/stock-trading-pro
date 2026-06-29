import React from 'react';
import { motion } from 'framer-motion';

/**
 * Wraps a route's content so it fades + slides in/out on navigation.
 * Used together with <AnimatePresence> keyed on the route location.
 */
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -14 }}
    transition={{ duration: 0.32, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
);

export default PageTransition;
