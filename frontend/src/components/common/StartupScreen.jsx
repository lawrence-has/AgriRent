import { Wheat } from 'lucide-react';

const StartupScreen = () => (
  <div className="startup-screen fixed inset-0 z-[100] grid min-h-[100dvh] place-items-center overflow-hidden bg-[#f5f4ee] px-6 text-center" role="status" aria-live="polite" aria-label="Loading AgriRent">
    <div className="startup-orbit startup-orbit--one" aria-hidden="true" />
    <div className="startup-orbit startup-orbit--two" aria-hidden="true" />
    <div className="relative z-10 flex flex-col items-center">
      <div className="startup-logo grid h-[4.5rem] w-[4.5rem] place-items-center rounded-[1.6rem] bg-[#294331] text-[#f0d98a] shadow-[0_16px_38px_rgba(35,62,42,0.24)]">
        <Wheat size={32} strokeWidth={1.7} aria-hidden="true" />
      </div>
      <p className="mt-5 text-2xl font-extrabold tracking-tight text-[#294331]">AgriRent</p>
      <p className="mt-1 text-sm text-[#7c8375]">Growing connections in agriculture</p>
      <div className="startup-progress mt-8 h-1 w-40 overflow-hidden rounded-full bg-[#e2e5d9]" aria-hidden="true">
        <span className="block h-full w-full origin-left rounded-full bg-[#6c8959]" />
      </div>
      <span className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8a927f]">Preparing your workspace</span>
    </div>
  </div>
);

export default StartupScreen;
