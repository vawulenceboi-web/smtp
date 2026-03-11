'use client';

import Link from 'next/link';
import { User } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-20">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">Email Campaign Dashboard</h2>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* User Profile */}
          <Link
            href="/admins"
            className="flex items-center gap-3 px-3 py-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="text-sm font-medium text-foreground hidden sm:block">Admin</div>
          </Link>
        </div>
      </div>
    </header>
  );
}
