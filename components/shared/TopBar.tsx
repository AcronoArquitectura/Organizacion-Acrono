'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Dashboard', href: '/' },
  { label: 'Clientes', href: '/clientes' },
  { label: 'Presupuestos', href: '/presupuestos' },
  { label: 'Contabilidad', href: '/contabilidad' },
  { label: 'Organización', href: '/organizacion' },
] as const;

export default function TopBar() {
  const pathname = usePathname();

  return (
    <header className="h-[50px] bg-[#333333] flex items-center px-4 sticky top-0 z-[200]">
      <span className="text-[12px] font-bold tracking-[0.14em] uppercase text-white mr-5 whitespace-nowrap">
        Ácrono Arquitectura
      </span>
      {TABS.map((tab) => {
        const isActive =
          tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              'h-[50px] flex items-center px-[15px] text-[12px]',
              'border-b-2 transition-colors duration-150 whitespace-nowrap no-underline',
              isActive
                ? 'text-white border-b-white'
                : 'text-white/50 border-b-transparent hover:text-white/80',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        );
      })}
      <div className="flex-1" />
    </header>
  );
}
