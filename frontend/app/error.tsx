"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="shell"><h1>Something went wrong</h1><p role="alert">Please try again. If this continues, contact your program owner.</p><button className="primary" onClick={reset}>Try again</button></main>;
}
