import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-lino">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-28 md:px-8 md:pb-12">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
