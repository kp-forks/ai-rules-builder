import { Home, FileText, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { OrganizationMembership } from '../services/prompt-library/organizations';

export interface NavigationItem {
  href: string;
  label: string;
  icon: LucideIcon;
  activeColor: 'blue' | 'teal' | 'purple';
  matchPath: (path: string) => boolean;
}

export function useNavigationItems(organizations: OrganizationMembership[]): NavigationItem[] {
  const isAdmin = organizations.some((org) => org.role === 'admin');

  const allItems: NavigationItem[] = [
    {
      href: '/',
      label: 'Rules Builder',
      icon: Home,
      activeColor: 'blue',
      matchPath: (path) => path === '/',
    },
    {
      href: '/prompts',
      label: 'Prompts Library',
      icon: FileText,
      activeColor: 'teal',
      matchPath: (path) => path === '/prompts',
    },
    {
      href: '/prompts/admin',
      label: 'Prompts Admin',
      icon: Shield,
      activeColor: 'purple',
      matchPath: (path) => path.startsWith('/prompts/admin'),
    },
  ];

  // Filter items based on permissions
  return allItems.filter((item) => {
    // Admin-only items
    if (item.href === '/prompts/admin') {
      return isAdmin;
    }
    return true;
  });
}
