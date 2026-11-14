export function AgentThinking() {
  return (
    <div
      role="status"
      aria-label="正在思考"
      className="flex min-h-6 items-center gap-2 text-xs text-muted-foreground"
    >
      <span>正在思考</span>
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="size-1.5 rounded-full bg-current motion-safe:animate-bounce"
            style={{ animationDelay: `${index * 150}ms` }}
          />
        ))}
      </span>
    </div>
  )
}
