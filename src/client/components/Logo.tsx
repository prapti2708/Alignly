/** Alignly mark: job requirements (apricot) linked to resume evidence (sage); the last one has no evidence yet (dashed). */
export const ICON_URI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCI+PGRlZnM+PGxpbmVhckdyYWRpZW50IGlkPSJhbHQiIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiM0YjNkMzkiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMyYzIzMjAiLz48L2xpbmVhckdyYWRpZW50PjxyYWRpYWxHcmFkaWVudCBpZD0iYWxoIiBjeD0iLjIiIGN5PSIuMSIgcj0iLjciPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZiIgc3RvcC1vcGFjaXR5PSIuMTIiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNmZmYiIHN0b3Atb3BhY2l0eT0iMCIvPjwvcmFkaWFsR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgcng9IjE2IiBmaWxsPSJ1cmwoI2FsdCkiLz48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJ4PSIxNiIgZmlsbD0idXJsKCNhbGgpIi8+PHJlY3QgeD0iOSIgeT0iMTQiIHdpZHRoPSIxOCIgaGVpZ2h0PSI4LjUiIHJ4PSI0LjI1IiBmaWxsPSIjZjZjYWEwIi8+PHJlY3QgeD0iMTMiIHk9IjI3Ljc1IiB3aWR0aD0iMTQiIGhlaWdodD0iOC41IiByeD0iNC4yNSIgZmlsbD0iI2Y2Y2FhMCIvPjxyZWN0IHg9IjExIiB5PSI0MS41IiB3aWR0aD0iMTYiIGhlaWdodD0iOC41IiByeD0iNC4yNSIgZmlsbD0iI2Y1YzdiZCIvPjxyZWN0IHg9IjM3IiB5PSIxNCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjguNSIgcng9IjQuMjUiIGZpbGw9IiNkYWUyZGMiLz48cmVjdCB4PSIzNyIgeT0iMjcuNzUiIHdpZHRoPSIxMyIgaGVpZ2h0PSI4LjUiIHJ4PSI0LjI1IiBmaWxsPSIjZGFlMmRjIi8+PHJlY3QgeD0iMzcuOCIgeT0iNDIuMyIgd2lkdGg9IjE1LjQiIGhlaWdodD0iNi45IiByeD0iMy40NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZjVjN2JkIiBzdHJva2Utd2lkdGg9IjEuNiIgc3Ryb2tlLWRhc2hhcnJheT0iMi40IDIuNCIvPjxwYXRoIGQ9Ik0yNyAxOC4yNWgxME0yNyAzMmgxMCIgc3Ryb2tlPSIjOWZiZmFlIiBzdHJva2Utd2lkdGg9IjIuNiIvPjxjaXJjbGUgY3g9IjMyIiBjeT0iMTguMjUiIHI9IjMiIGZpbGw9IiM5ZmJmYWUiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzIiBmaWxsPSIjOWZiZmFlIi8+PC9zdmc+";

export function LogoMark({ className = 'w-9 h-9' }: { className?: string }) {
  return <img src={ICON_URI} alt="" className={`${className} rounded-[28%] shadow-[0_4px_12px_-6px_rgba(58,46,43,0.45)]`} draggable={false} />;
}

export function Logo({ sub = true, onClick }: { sub?: boolean; onClick?: () => void }) {
  const inner = (
    <>
      <LogoMark className="w-9 h-9 transition-transform group-hover:rotate-[-6deg]" />
      <span className="leading-tight text-left">
        <span className="block wordmark text-[1.75rem] -mt-1">alignly</span>
        {sub && <span className="hidden sm:block text-[0.7rem] text-ink-3 mt-1">Align your resume to the role</span>}
      </span>
    </>
  );
  return onClick
    ? <button className="flex items-center gap-2.5 group" onClick={onClick} aria-label="Alignly home">{inner}</button>
    : <span className="flex items-center gap-2.5 group">{inner}</span>;
}

export const FAVICON = ICON_URI;
