'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

// Define access to nav items structure
type NavItem = {
    name: string;
    path?: string;
    icon: string;
    children?: { name: string; path: string; icon: string }[];
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // State for open dropdowns. Defaulting 'Tresoreria' and 'Actuacions' to open or closed? 
    // Let's keep them closed by default, or open if interaction is needed. 
    // Usually simpler to have them track state.
    const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
        'Tresoreria': false,
        'Actuacions': false
    });

    const toggleMenu = (name: string) => {
        setExpandedMenus(prev => ({
            ...prev,
            [name]: !prev[name]
        }));
    };

    const navItems: NavItem[] = [
        { name: 'Resum', path: '/', icon: 'home' },
        { name: 'Calendari', path: '/calendar', icon: 'calendar_month' },
        {
            name: 'Actuacions',
            icon: 'theater_comedy',
            children: [
                { name: 'Sol·licituds web', path: '/solicituds', icon: 'app_registration' },
                { name: 'Gestió bolos', path: '/bolos', icon: 'festival' },
                { name: 'Previsió músics', path: '/bolos/resum-30-dies', icon: 'list_alt' },
                { name: 'Gestió de Roba', path: '/gestio-roba', icon: 'checkroom' },
                { name: 'Músics', path: '/musics', icon: 'groups' },
                { name: 'Clients', path: '/clients', icon: 'business' },
            ]
        },
        {
            name: 'Tresoreria',
            icon: 'account_balance_wallet',
            children: [
                { name: 'Pressupost i fact.', path: '/pressupostos', icon: 'receipt_long' },
                { name: 'Registre factures', path: '/factures', icon: 'history_edu' },
                { name: 'Economia', path: '/economia', icon: 'account_balance' },
                { name: 'Previsió econòmica', path: '/previsio-economica', icon: 'trending_up' },
                { name: 'Gestió Pot', path: '/pot', icon: 'savings' },
            ]
        },
        { name: 'Tasques i Notes', path: '/tasques', icon: 'check_circle' },
        { name: 'Integracions', path: '/integracions', icon: 'settings_applications' },
    ];

    const renderNavItem = (item: NavItem) => {
        // If it has children, render a dropdown toggle
        if (item.children) {
            const isExpanded = expandedMenus[item.name];
            // Check if any child is active to maybe auto-expand or highlight parent?
            const hasActiveChild = item.children.some(child => pathname === child.path);

            return (
                <li key={item.name}>
                    <button
                        onClick={() => !isCollapsed ? toggleMenu(item.name) : setIsCollapsed(false)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 text-white/80 hover:bg-white/5 hover:text-white ${hasActiveChild ? 'bg-white/5 text-white' : ''}`}
                        title={isCollapsed ? item.name : undefined}
                    >
                        <div className="flex items-center space-x-3">
                            <span className="material-icons-outlined">{item.icon}</span>
                            {!isCollapsed && <span className="font-medium">{item.name}</span>}
                        </div>
                        {!isCollapsed && (
                            <span className={`material-icons-outlined transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                expand_more
                            </span>
                        )}
                    </button>

                    {/* Submenu */}
                    <div className={`overflow-hidden transition-all duration-300 ${isExpanded && !isCollapsed ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                        <ul className="pl-4 space-y-1">
                            {item.children.map(child => {
                                const isActive = pathname === child.path;
                                return (
                                    <li key={child.path}>
                                        <Link
                                            href={child.path}
                                            className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200 text-sm ${isActive
                                                ? 'bg-white/10 text-white font-bold shadow-sm backdrop-blur-sm'
                                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                                                }`}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <span className="material-icons-outlined text-lg">{child.icon}</span>
                                            <span className="font-medium">{child.name}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </li>
            );
        }

        // Regular item
        const isActive = pathname === item.path;
        return (
            <li key={item.path}>
                <Link
                    href={item.path!} // path is defined for items without children
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                        ? 'bg-white/10 text-white font-bold shadow-sm backdrop-blur-sm'
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                        }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    title={isCollapsed ? item.name : undefined}
                >
                    <span className="material-icons-outlined">{item.icon}</span>
                    {!isCollapsed && <span className="font-medium">{item.name}</span>}
                </Link>
            </li>
        );
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
            {/* Sidebar */}
            <aside className={`${isCollapsed ? 'md:w-20' : 'md:w-64'} w-full bg-primary text-white flex-shrink-0 shadow-lg z-20 transition-all duration-300 sticky top-0 md:h-screen overflow-y-auto`}>
                <div className="p-4 flex items-center justify-between md:flex-col md:items-start">
                    {/* Logo / Title */}
                    <div className={`flex items-center space-x-3 mb-0 md:mb-8 transition-all duration-300 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                        {/* Logo de la xaranga Buidant la Bota al costat del nom de l'aplicació */}
                        <img
                            alt="Logo de Buidant la Bota"
                            className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
                            src="/blb-logo.jpg"
                        />
                        {!isCollapsed && (
                            <div className="transition-opacity duration-300">
                                <span className="text-xl font-bold block leading-none">GestioBLB</span>
                                <span className="text-xs text-white/70">Buidant la Bota</span>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden text-white hover:bg-white/10 p-2 rounded"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <span className="material-icons-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                    </button>
                </div>

                {/* Navigation */}
                <nav className={`px-2 pb-4 md:block ${isMobileMenuOpen ? 'block' : 'hidden'}`}>
                    <ul className="space-y-1">
                        {navItems.map(renderNavItem)}
                    </ul>
                </nav>
                {/* Desktop Collapse Toggle */}
                <div className={`hidden md:flex justify-center w-full mt-auto p-4 border-t border-white/10`}>
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
                    >
                        <span className="material-icons-outlined">{isCollapsed ? 'chevron_right' : 'chevron_left'}</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}

