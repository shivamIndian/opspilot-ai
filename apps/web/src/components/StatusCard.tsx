import React from 'react';
import { LucideIcon, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface StatusCardProps {
  title: string;
  service: string;
  port: number;
  description: string;
  status: 'healthy' | 'pending' | 'error';
  icon: LucideIcon;
  endpoint: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  title,
  service,
  port,
  description,
  status,
  icon: Icon,
  endpoint,
}) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg backdrop-blur-sm">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {status === 'healthy' && (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE :{port}
              </span>
            )}
            {status === 'pending' && (
              <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full font-mono">
                <Clock className="w-3.5 h-3.5" /> STANDBY :{port}
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full font-mono">
                <AlertCircle className="w-3.5 h-3.5" /> OFFLINE :{port}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        <p className="text-xs font-mono text-slate-400 mt-0.5">{service}</p>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">{description}</p>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
        <span className="text-slate-400">Target Endpoint:</span>
        <code className="text-indigo-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
          {endpoint}
        </code>
      </div>
    </div>
  );
};
