import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-lino">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-28 md:px-8 md:pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}
