import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export const RootLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-950 text-slate-100 selection:bg-indigo-600 selection:text-white">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
