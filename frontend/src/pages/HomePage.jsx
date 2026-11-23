import { AudioLines, Mic, Sparkles } from 'lucide-react'

function HomePage() {
  return (
    <section className="relative flex flex-1 items-center justify-center py-16 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-0 size-[min(82vw,680px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_rgba(208,229,216,0.52)_0%,_rgba(247,248,246,0)_68%)]"
      />

      <div className="relative z-10 mx-auto w-full max-w-3xl text-center">
        <div className="mx-auto mb-8 flex size-[76px] items-center justify-center rounded-[26px] border border-white bg-white text-emerald-800 shadow-[0_12px_40px_rgba(27,65,48,0.10)]">
          <AudioLines aria-hidden="true" size={34} strokeWidth={1.7} />
        </div>

        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#dfe8e0] bg-white/80 px-3.5 py-1.5 text-xs font-medium text-[#52655a]">
          <Sparkles aria-hidden="true" className="text-emerald-700" size={14} />
          A thoughtful new beginning
        </div>

        <h1 className="text-balance text-4xl font-semibold tracking-[-0.045em] text-[#17211d] sm:text-6xl sm:leading-[1.08]">
          AI Voice Assistant
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-7 text-[#67736c] sm:mt-6 sm:text-lg sm:leading-8">
          A simple, modern starting point for your business voice assistant.
          Your frontend foundation is ready for what comes next.
        </p>

        <div className="mx-auto mt-10 flex w-fit items-center gap-3 rounded-2xl border border-[#e7ebe6] bg-white/90 px-4 py-3 text-left shadow-[0_8px_28px_rgba(34,53,42,0.04)]">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ee] text-emerald-800">
            <Mic aria-hidden="true" size={19} strokeWidth={1.8} />
          </span>
          <span>
            <span className="block text-sm font-medium text-[#27352e]">
              Frontend is ready
            </span>
            <span className="mt-0.5 block text-xs text-[#7b8580]">
              React · Vite · Tailwind CSS
            </span>
          </span>
          <span aria-hidden="true" className="ml-3 flex items-end gap-0.5">
            <span className="h-2 w-1 rounded-full bg-emerald-300" />
            <span className="h-4 w-1 rounded-full bg-emerald-500" />
            <span className="h-3 w-1 rounded-full bg-emerald-400" />
            <span className="h-5 w-1 rounded-full bg-emerald-600" />
            <span className="h-2 w-1 rounded-full bg-emerald-300" />
          </span>
        </div>
      </div>
    </section>
  )
}

export default HomePage
