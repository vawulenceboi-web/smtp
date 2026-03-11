'use client';

export function Header() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-20">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">Email Campaign Dashboard</h2>
        </div>

        <div />
      </div>
    </header>
  );
}
