import { Check, Wheat } from 'lucide-react';

const AuthBrandPanel = () => (
  <aside className="relative hidden min-h-[650px] overflow-hidden bg-[#20382a] p-10 text-[#fffdf5] lg:flex lg:flex-col xl:p-12">
    <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border border-white/10 shadow-[0_0_0_36px_rgba(255,255,255,0.025),0_0_0_72px_rgba(255,255,255,0.018)]" aria-hidden="true" />
    <div className="relative z-10 flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#d7b761]/15 text-[#efda9a]"><Wheat size={23} /></span>
      <div>
        <p className="font-extrabold tracking-tight text-xl">AgriRent</p>
        <p className="text-[9px] uppercase tracking-[0.22em] text-white/45">Local farms, connected</p>
      </div>
    </div>

    <div className="relative z-10 mt-16 max-w-md">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#d9c783]">A better way to get growing</p>
      <h2 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight xl:text-[3.25rem]">Good tools.<br />Better seasons.</h2>
      <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">Find local machinery, manage rentals, and keep your farm moving with one simple marketplace.</p>

      <div className="mt-8 space-y-3">
        {['Discover equipment near you', 'Book for the days you need', 'Keep every rental in one place'].map((item) => (
          <div key={item} className="flex items-center gap-3 text-sm text-white/80">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-[#d6c37d]/35 bg-[#d6c37d]/10 text-[#e7d38c]"><Check size={13} /></span>
            {item}
          </div>
        ))}
      </div>
    </div>

    <div className="relative z-10 mt-auto border-t border-white/10 pt-5 text-xs text-white/45">
      <span>Rooted in local agriculture</span>
    </div>

    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 overflow-hidden opacity-60" aria-hidden="true">
      <div className="absolute -bottom-32 left-[16%] h-64 w-[125%] rotate-[-9deg] rounded-[50%] border-t border-[#d2bd72]/40 bg-gradient-to-b from-[#8b9956]/20 to-transparent" />
      <div className="absolute -bottom-40 left-[5%] h-64 w-[130%] rotate-[-9deg] rounded-[50%] border-t border-[#d2bd72]/30" />
      <div className="absolute -bottom-48 -left-[8%] h-64 w-[140%] rotate-[-9deg] rounded-[50%] border-t border-[#d2bd72]/20" />
      <div className="absolute bottom-16 right-20 h-24 w-24 rounded-full bg-[#d3b95f]/15 blur-xl" />
    </div>
  </aside>
);

export default AuthBrandPanel;
