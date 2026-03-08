'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, User, Settings } from 'lucide-react';
import { apiGet } from '@/lib/api-client';

export function Header() {
  const [unreadCount, setUnreadCount] = useState(0);
  // TODO: Get actual admin ID from auth context once implemented
  // For now, skip notification fetching since we don't have admin ID
  const adminId: string | null = null;

  useEffect(() => {
    if (!adminId) {
      console.log('⏭️  Skipping notification fetch - admin ID not available');
      return;
    }
    
    fetchUnreadCount();
    // Poll for unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [adminId]);

  const fetchUnreadCount = async () => {
    if (!adminId) return;
    
    try {
      const { data, error } = await apiGet<{ unread_count: number }>(`/api/notifications/admin/${adminId}/unread-count`);
      if (!error && data) {
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-20">
      <div className="px-6 py-4 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">SMTP Testing Dashboard</h2>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Notification Icon */}
          <Link
            href="/notifications"
            className="relative p-2 hover:bg-secondary rounded-lg transition-colors text-foreground"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-5 w-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-semibold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>

          {/* Settings Icon */}
          <Link
            href="/settings"
            className="p-2 hover:bg-secondary rounded-lg transition-colors text-foreground"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>

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
