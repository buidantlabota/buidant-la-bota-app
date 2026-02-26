'use client';
// Redeploy trigger: Refined economic pages and pot management

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { PrivacyProvider, usePrivacy } from '@/context/PrivacyContext';

// Define access to nav items structure
type NavItem = {
    name: string;
    path?: string;
    icon: string;
    children?: { name: string; path: string; icon: string }[];
};

function InternalDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const supabase = createClient();
    const { isPrivate, togglePrivacy } = usePrivacy();

    // Lògica de control de sessió estricta (Idle Timeout i Max Session Age)
    useEffect(() => {
        const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora d'inactivitat
        const SHORT_SESSION_AGE_MS = 12 * 60 * 60 * 1000; // 12 hores de sessió màxima (si no s'ha marcat Recorda'm)

        const checkSessionConstraints = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                router.push('/login');
                return;
            }

            const now = Date.now();
            const lastActivity = parseInt(localStorage.getItem('blb_last_activity') || now.toString());
            const sessionType = localStorage.getItem('blb_session_type') || 'short';
            const sessionStart = session.user?.last_sign_in_at ? new Date(session.user.last_sign_in_at).getTime() : now;

            // 1. Check Idle Timeout
            if (now - lastActivity > IDLE_TIMEOUT_MS) {
                console.log('Sessió tancada per inactivitat');
                handleLogout();
                return;
            }

            // 2. Check Session Max Age (només si la sessió és 'short')
            if (sessionType === 'short' && (now - sessionStart > SHORT_SESSION_AGE_MS)) {
                console.log('Sessió tancada per antiguitat (short session)');
                handleLogout();
                return;
            }
        };

        const updateActivity = () => {
            localStorage.setItem('blb_last_activity', Date.now().toString());
        };

        // Escolta esdeveniments d'usuari per actualitzar l'activitat
        const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        activityEvents.forEach(event => window.addEventListener(event, updateActivity));

        // Comprovació inicial i interval cada 5 minuts
        checkSessionConstraints();
        const interval = setInterval(checkSessionConstraints, 5 * 60 * 1000);

        // També comprovem quan la pestanya recupera el focus
        window.addEventListener('focus', checkSessionConstraints);

        return () => {
            activityEvents.forEach(event => window.removeEventListener(event, updateActivity));
            window.removeEventListener('focus', checkSessionConstraints);
            clearInterval(interval);
        };
    }, [router, supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    // State for open dropdowns.
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
        { name: 'Estadístiques', path: '/estadistiques', icon: 'query_stats' },
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
                { name: 'Cotxes', path: '/cotxes', icon: 'directions_car' },
                { name: 'Clients', path: '/clients', icon: 'business' },
            ]
        },
        {
            name: 'Tresoreria',
            icon: 'account_balance_wallet',
            children: [
                { name: 'Pressupost i fact.', path: '/pressupostos', icon: 'receipt_long' },
                { name: 'Registre factures', path: '/factures', icon: 'history_edu' },
                { name: 'Liquidació (Pagaments)', path: '/liquidacio', icon: 'payments' },
                { name: 'Economia', path: '/economia', icon: 'account_balance' },
                { name: 'Gestió Pot', path: '/pot', icon: 'savings' },
            ]
        },
        { name: 'Tasques i Notes', path: '/tasques', icon: 'check_circle' },
        { name: 'Integracions', path: '/integracions', icon: 'settings_applications' },
    ];

    const renderNavItem = (item: NavItem) => {
        if (item.children) {
            const isExpanded = expandedMenus[item.name];
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

        const isActive = pathname === item.path;
        return (
            <li key={item.path}>
                <Link
                    href={item.path!}
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
            <aside className={`${isCollapsed ? 'md:w-20' : 'md:w-64'} w-full md:h-screen bg-primary text-white flex-shrink-0 shadow-lg z-20 transition-all duration-300 md:sticky md:top-0 overflow-y-auto`}>
                <div className="p-4 flex items-center justify-between md:flex-col md:items-start">
                    {/* Logo / Title */}
                    <div className={`flex items-center space-x-3 transition-all duration-300 ${isCollapsed ? 'md:justify-center md:w-full' : ''}`}>
                        <img
                            alt="Logo de Buidant la Bota"
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-white/20"
                            src="/blb-logo.jpg"
                        />
                        <div className={`${isCollapsed ? 'md:hidden' : 'block'}`}>
                            <div className="flex items-center gap-2">
                                <span className="text-lg md:text-xl font-bold block leading-none">GestioBLB</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); togglePrivacy(); }}
                                    className="text-white/50 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                                    title={isPrivate ? "Mostrar dades econòmiques" : "Ocultar dades econòmiques"}
                                >
                                    <span className="material-icons-outlined text-sm md:text-md">
                                        {isPrivate ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                            <span className="text-[10px] md:text-xs text-white/70 block mt-0.5">Buidant la Bota</span>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="flex items-center gap-2 md:hidden">
                        <button
                            className="text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            <span className="material-icons-outlined text-3xl">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className={`px-2 pb-4 ${isMobileMenuOpen ? 'block' : 'hidden'} md:block flex-1`}>
                    <ul className="space-y-1">
                        {navItems.map(renderNavItem)}
                    </ul>

                    {/* Logout Button */}
                    <div className="mt-8 pt-4 border-t border-white/10">
                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-white/70 hover:bg-red-500/20 hover:text-red-200`}
                            title={isCollapsed ? 'Sortir' : undefined}
                        >
                            <span className="material-icons-outlined">logout</span>
                            {!isCollapsed && <span className="font-medium">Sortir</span>}
                        </button>
                    </div>
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
            <main className="flex-1 min-w-0 overflow-x-hidden md:overflow-y-auto">
                <div className="h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <PrivacyProvider>
            <InternalDashboardLayout>{children}</InternalDashboardLayout>
        </PrivacyProvider>
    );
}
