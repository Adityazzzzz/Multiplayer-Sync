export function CanvasObjects() {
  return (
    <section className="pointer-events-none absolute inset-0 z-10 hidden select-none lg:block" aria-hidden="true">
      <div className="absolute left-[18%] top-[22%] w-40 -rotate-6 rounded-2xl bg-[#ffdf75] p-4 shadow-[0_14px_25px_rgba(87,68,21,0.16)]">
        <div className="mb-7 h-1.5 w-8 rounded-full bg-[#5f5123]/20" />
        <p className="text-sm font-extrabold tracking-tight text-[#4e431c]">Start with the messy ideas.</p>
        <p className="mt-2 text-[11px] font-medium leading-4 text-[#6d5c25]">Drop a spark anywhere to share a moment.</p>
      </div>

      <div className="absolute left-1/2 top-1/2 w-[29rem] -translate-x-1/2 -translate-y-1/2 rotate-[-1deg] rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_24px_70px_rgba(42,36,27,0.14)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#7664e6]">Project constellation</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-stone-800">Ideas, in motion.</h2>
          </div>
          <div className="rounded-full bg-[#eeeaff] px-3 py-1.5 text-[10px] font-bold text-[#6655d7]">LIVE BOARD</div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#f0edff] p-3">
            <div className="h-2 w-12 rounded-full bg-[#8b7ef0]/35" />
            <div className="mt-5 h-1.5 w-full rounded-full bg-[#8b7ef0]/20" />
            <div className="mt-2 h-1.5 w-2/3 rounded-full bg-[#8b7ef0]/20" />
          </div>
          <div className="rounded-xl bg-[#dcf6ee] p-3">
            <div className="h-2 w-9 rounded-full bg-[#2eaf91]/35" />
            <div className="mt-5 h-1.5 w-full rounded-full bg-[#2eaf91]/20" />
            <div className="mt-2 h-1.5 w-4/5 rounded-full bg-[#2eaf91]/20" />
          </div>
          <div className="rounded-xl bg-[#fff1e2] p-3">
            <div className="h-2 w-10 rounded-full bg-[#e99a4b]/35" />
            <div className="mt-5 h-1.5 w-full rounded-full bg-[#e99a4b]/20" />
            <div className="mt-2 h-1.5 w-3/5 rounded-full bg-[#e99a4b]/20" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-stone-200 px-3 py-2.5 text-[11px] font-semibold text-stone-400">
          <span className="text-base leading-none">+</span> Move, point, react — everyone sees it live.
        </div>
      </div>

      <div className="absolute bottom-[19%] right-[17%] w-44 rotate-[7deg] rounded-2xl bg-[#cdeffe] p-4 shadow-[0_14px_25px_rgba(27,83,104,0.15)]">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-white/70 text-xs">✦</span>
          <span className="text-[11px] font-bold text-[#236179]">Realtime magic</span>
        </div>
        <div className="mt-4 h-1.5 w-full rounded-full bg-[#3b8da9]/20" />
        <div className="mt-2 h-1.5 w-3/4 rounded-full bg-[#3b8da9]/20" />
      </div>

      <div className="absolute bottom-[25%] left-[27%] h-16 w-16 rounded-full border-[10px] border-[#f6a0b1] bg-[#ffe7ec] shadow-[0_10px_20px_rgba(144,48,70,0.12)]" />
      <div className="absolute right-[27%] top-[24%] h-11 w-11 rotate-12 rounded-xl bg-[#a9e9d7] shadow-[0_10px_20px_rgba(34,118,92,0.13)]" />
    </section>
  );
}
