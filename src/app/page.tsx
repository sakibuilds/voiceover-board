"use client";

import { useMemo, useState } from "react";

type Mode = "explainer" | "workshop" | "update";
type Tone = "clear" | "warm" | "crisp";

type Slide = {
  title: string;
  bullets: string[];
};

type StoryCard = {
  slideNumber: number;
  title: string;
  narration: string;
  transition: string;
  emphasis: string;
  durationSeconds: number;
  cue: string;
};

const sampleOutline = `Opening: why this session matters
- Set the context in one sentence
- Tell listeners what they will be able to do

Step 1: frame the problem
- Show the recurring friction
- Name the cost of leaving it messy

Step 2: show the method
- Walk through the smallest useful workflow
- Pause after the example

Step 3: make it reusable
- Explain what can be copied or repeated
- Give one simple next action

Closing: what to do now
- Repeat the promise
- Invite the listener to try it once`;

const transitions: Record<Mode, string[]> = {
  explainer: [
    "Now that the context is clear, move to the practical problem.",
    "With the problem named, shift from diagnosis to method.",
    "After the method, show how it can be reused instead of rebuilt.",
    "Close by turning the idea into one immediate action.",
  ],
  workshop: [
    "Give the room a moment, then move into the first working step.",
    "Ask participants to compare this with their own workflow before continuing.",
    "Bridge from demonstration into hands-on application.",
    "End by making the next five minutes unambiguous.",
  ],
  update: [
    "Move from the summary into what changed.",
    "Shift from what changed to what needs attention.",
    "Connect the recommendation to the next decision.",
    "Finish with the owner, timing, and expected outcome.",
  ],
};

const toneWords: Record<Tone, { opener: string; closer: string; cue: string }> = {
  clear: {
    opener: "Here is the simplest way to read this slide:",
    closer: "Keep the sentence clean, then pause.",
    cue: "neutral pace, clean emphasis",
  },
  warm: {
    opener: "Start conversationally, as if explaining this to one person:",
    closer: "Let the last phrase land before moving on.",
    cue: "warmer tone, softer landing",
  },
  crisp: {
    opener: "Make the point directly:",
    closer: "Cut filler and move on quickly.",
    cue: "tight pace, firm ending",
  },
};

function parseSlides(outline: string): Slide[] {
  const groups = outline
    .split(/\n\s*\n/g)
    .map((group) => group.trim())
    .filter(Boolean);

  const parsed = groups.map((group, index) => {
    const lines = group
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const rawTitle = lines[0] ?? `Slide ${index + 1}`;
    const title = rawTitle.replace(/^#+\s*/, "").replace(/:$/, "");
    const bullets = lines
      .slice(1)
      .map((line) => line.replace(/^[-*•]\s*/, ""))
      .filter(Boolean);
    return { title, bullets: bullets.length ? bullets : ["State the useful point", "Give one concrete example"] };
  });

  return parsed.length ? parsed.slice(0, 12) : [{ title: "Opening", bullets: ["State the useful point", "Give one concrete example"] }];
}

function sentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).replace(/[.!?]$/, "");
}

function estimateSeconds(text: string, wordsPerMinute: number): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(18, Math.round((words / wordsPerMinute) * 60) + 6);
}

function buildNarration(slide: Slide, index: number, mode: Mode, tone: Tone): string {
  const words = toneWords[tone];
  const first = sentenceCase(slide.bullets[0] ?? slide.title);
  const second = sentenceCase(slide.bullets[1] ?? "Keep the message practical");
  const third = sentenceCase(slide.bullets[2] ?? "Make the next step easy to remember");

  const modeLine = mode === "workshop"
    ? "Listen for the part you can use immediately, not the part that sounds impressive."
    : mode === "update"
      ? "The useful question is what changes after this, and who needs to act."
      : "The goal is to make the idea simple enough to repeat without the slide.";

  return `${words.opener} ${sentenceCase(slide.title)}. ${first}. ${second}. ${third}. ${modeLine} ${words.closer}`;
}

function buildCards(slides: Slide[], mode: Mode, tone: Tone, wordsPerMinute: number): StoryCard[] {
  return slides.map((slide, index) => {
    const narration = buildNarration(slide, index, mode, tone);
    const transition = transitions[mode][index % transitions[mode].length];
    return {
      slideNumber: index + 1,
      title: slide.title,
      narration,
      transition,
      emphasis: slide.bullets[0] ?? slide.title,
      durationSeconds: estimateSeconds(narration, wordsPerMinute),
      cue: toneWords[tone].cue,
    };
  });
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function copyText(text: string): void {
  void navigator.clipboard?.writeText(text);
}

export default function Home() {
  const [outline, setOutline] = useState(sampleOutline);
  const [mode, setMode] = useState<Mode>("explainer");
  const [tone, setTone] = useState<Tone>("clear");
  const [wpm, setWpm] = useState(135);
  const [speaking, setSpeaking] = useState(false);

  const slides = useMemo(() => parseSlides(outline), [outline]);
  const cards = useMemo(() => buildCards(slides, mode, tone, wpm), [slides, mode, tone, wpm]);
  const totalSeconds = cards.reduce((sum, card) => sum + card.durationSeconds, 0);
  const fullScript = cards
    .map((card) => `Slide ${card.slideNumber}: ${card.title}\n${card.narration}\nTransition: ${card.transition}`)
    .join("\n\n");
  const recordingSlate = `Voiceover Board recording slate\nSlides: ${cards.length}\nEstimated read time: ${formatTime(totalSeconds)}\nTone: ${tone}\nMode: ${mode}\n\nBefore recording:\n1. Read the first and last line once.\n2. Mark any word that needs slower delivery.\n3. Leave two seconds between slides.\n4. Re-record only the slide card that breaks.`;

  function rehearse(): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(fullScript);
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8">
      <header className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-2xl shadow-violet-200/40 backdrop-blur md:p-8">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-violet-700">Voiceover Board</p>
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Slide outline → recording-ready narration.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
              Paste a generic slide outline once. Get a per-slide voiceover storyboard with narration, transitions, timing, emphasis cues, and a recording slate you can copy or print.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-3xl bg-slate-950 p-4 text-white">
            <div>
              <p className="text-3xl font-black">{cards.length}</p>
              <p className="text-xs text-slate-300">slides</p>
            </div>
            <div>
              <p className="text-3xl font-black">{formatTime(totalSeconds)}</p>
              <p className="text-xs text-slate-300">read time</p>
            </div>
            <div>
              <p className="text-3xl font-black">{wpm}</p>
              <p className="text-xs text-slate-300">WPM</p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="no-print rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-200/70 backdrop-blur">
          <h2 className="text-2xl font-black text-slate-950">Input deck outline</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use blank lines between slides. Keep examples generic; the app stores nothing on a server.</p>
          <textarea
            value={outline}
            onChange={(event) => setOutline(event.target.value)}
            className="mt-4 h-80 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
          />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">
              Output mode
              <select value={mode} onChange={(event) => setMode(event.target.value as Mode)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3">
                <option value="explainer">Explainer</option>
                <option value="workshop">Workshop</option>
                <option value="update">Update</option>
              </select>
            </label>
            <label className="text-sm font-bold text-slate-700">
              Delivery tone
              <select value={tone} onChange={(event) => setTone(event.target.value as Tone)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3">
                <option value="clear">Clear</option>
                <option value="warm">Warm</option>
                <option value="crisp">Crisp</option>
              </select>
            </label>
          </div>

          <label className="mt-5 block text-sm font-bold text-slate-700">
            Speaking speed: {wpm} words/min
            <input type="range" min="105" max="170" value={wpm} onChange={(event) => setWpm(Number(event.target.value))} className="mt-3 w-full accent-violet-700" />
          </label>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button onClick={() => copyText(fullScript)} className="rounded-2xl bg-violet-700 px-4 py-3 font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-800">Copy full script</button>
            <button onClick={rehearse} className="rounded-2xl bg-slate-950 px-4 py-3 font-black text-white shadow-lg shadow-slate-300 transition hover:bg-slate-800">{speaking ? "Stop read-aloud" : "Read aloud"}</button>
            <button onClick={() => copyText(recordingSlate)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-900 transition hover:border-violet-300">Copy recording slate</button>
            <button onClick={() => window.print()} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black text-slate-900 transition hover:border-violet-300">Print storyboard</button>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="print-card rounded-[2rem] border border-teal-100 bg-teal-50/90 p-5 shadow-lg shadow-teal-100/60">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">Recording slate</p>
            <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-800">{recordingSlate}</pre>
          </div>

          {cards.map((card) => (
            <article key={`${card.slideNumber}-${card.title}`} className="print-card rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-slate-200/70 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">Slide {card.slideNumber}</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">{card.title}</h3>
                </div>
                <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">{formatTime(card.durationSeconds)}</span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_0.8fr]">
                <div>
                  <p className="text-sm font-black text-slate-500">Narration</p>
                  <p className="mt-2 text-lg leading-8 text-slate-900">{card.narration}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-500">Transition</p>
                  <p className="mt-2 leading-7 text-slate-800">{card.transition}</p>
                  <p className="mt-4 text-sm font-black text-slate-500">Emphasis cue</p>
                  <p className="mt-2 leading-7 text-slate-800">{card.emphasis}</p>
                  <p className="mt-4 rounded-2xl bg-white p-3 text-sm font-bold text-violet-800">{card.cue}</p>
                </div>
              </div>
              <button onClick={() => copyText(card.narration)} className="no-print mt-4 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-800 transition hover:border-violet-300 hover:text-violet-800">Copy this narration</button>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
