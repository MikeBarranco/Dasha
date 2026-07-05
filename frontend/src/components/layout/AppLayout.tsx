import { useEffect, useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { ReportChooser } from './ReportChooser';
import { Onboarding } from '../onboarding/Onboarding';
import { appSteps, volunteerSteps } from '../onboarding/onboardingSteps';
import { useAuth } from '../../lib/useAuth';
import {
  hasSeenOnboarding,
  markOnboardingSeen,
  ONBOARDING_OPEN_EVENT,
} from '../../lib/onboarding';

export function AppLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const { user } = useAuth();
  const [chooserOpen, setChooserOpen] = useState(false);
  // Onboarding general: primera vez en este dispositivo; se reabre desde el perfil.
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding('app'));
  // Onboarding de voluntario: al ser voluntario y no haberlo visto aún.
  const [showVolunteer, setShowVolunteer] = useState(
    () => user?.role === 'volunteer' && !hasSeenOnboarding('volunteer'),
  );

  useEffect(() => {
    const open = (event: Event) => {
      const kind = (event as CustomEvent).detail;
      if (kind === 'volunteer') setShowVolunteer(true);
      else if (kind === 'app' || kind === undefined) setShowOnboarding(true);
    };
    window.addEventListener(ONBOARDING_OPEN_EVENT, open);
    return () => window.removeEventListener(ONBOARDING_OPEN_EVENT, open);
  }, []);

  const closeOnboarding = () => {
    markOnboardingSeen('app');
    setShowOnboarding(false);
  };

  const closeVolunteer = () => {
    markOnboardingSeen('volunteer');
    setShowVolunteer(false);
  };

  const openChooser = () => setChooserOpen(true);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-lino">
      <TopBar onReportClick={openChooser} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-28 md:px-8 md:pb-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav onReportClick={openChooser} />
      <ReportChooser open={chooserOpen} onClose={() => setChooserOpen(false)} />
      <AnimatePresence>
        {showOnboarding && <Onboarding steps={appSteps} onClose={closeOnboarding} />}
      </AnimatePresence>
      <AnimatePresence>
        {!showOnboarding && showVolunteer && (
          <Onboarding steps={volunteerSteps} onClose={closeVolunteer} />
        )}
      </AnimatePresence>
    </div>
  );
}
