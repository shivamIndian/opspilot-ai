import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>OpsPilot AI &copy; {new Date().getFullYear()} &mdash; Enterprise Agentic AI Platform</p>
        <p className="font-mono text-slate-400">
          Node.js 22 LTS &bull; React 18 &bull; FastAPI Python 3.11
        </p>
      </div>
    </footer>
  );
};
