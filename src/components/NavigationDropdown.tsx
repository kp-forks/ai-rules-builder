import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { NavigationItem } from '../hooks/useNavigationItems';

interface NavigationDropdownProps {
  items: NavigationItem[];
  currentPath: string;
}

export default function NavigationDropdown({ items, currentPath }: NavigationDropdownProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Get current page info for button display
  const currentPage = items.find((item) => item.matchPath(currentPath)) || items[0];
  const CurrentIcon = currentPage.icon;

  return (
    <div className="relative" data-dropdown>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
      >
        <CurrentIcon className="size-4" />
        <span className="hidden md:inline">{currentPage.label}</span>
        <Menu className="size-3 opacity-70" />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-20">
          {items.map((item) => {
            const ItemIcon = item.icon;
            const isActive = item.matchPath(currentPath);

            // Map activeColor to actual Tailwind classes
            const activeClasses: Record<typeof item.activeColor, string> = {
              blue: 'bg-blue-900/30 text-blue-300',
              teal: 'bg-teal-900/30 text-teal-300',
              purple: 'bg-purple-900/30 text-purple-300',
            };

            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? activeClasses[item.activeColor]
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <ItemIcon className="size-4" />
                {item.label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
