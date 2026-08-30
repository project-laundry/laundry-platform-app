"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Wordmark } from '@/components/layout/AppHeader';
import { Menu, X } from "lucide-react";
import { EnvironmentBadge } from "@/components/ui/EnvironmentBadge";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setIsAuthenticated(true);

        // Fetch user role
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (userData) {
          setUserRole(userData.role);
        }
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };

    checkAuth();
  }, []);

  const navLinks = [
    { href: "/#slik-virker-det", label: "Slik virker det" },
    { href: "/pris-kalkulator", label: "Priser" },
    { href: "/#områder", label: "Områder" },
  ];

  const getDashboardUrl = () => {
    if (userRole === 'admin') return '/admin';
    if (userRole === 'cleaner') return '/dashboard/cleaner';
    return '/dashboard';
  };

  const primaryPill =
    "inline-flex items-center justify-center rounded-full bg-nordic-blue px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]";
  const outlinePill =
    "inline-flex items-center justify-center rounded-full border border-cream-dark bg-white px-5 py-2.5 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-cream-dark/70 bg-warm-white/70 backdrop-blur py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Wordmark />
            <EnvironmentBadge />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              link.href.startsWith('#') ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <Link href={getDashboardUrl()} className={primaryPill}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className={outlinePill}>
                  Logg inn
                </Link>
                <Link href="/auth/signup" className={primaryPill}>
                  Kom i gang
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="p-2 text-dark-gray transition-colors hover:text-nordic-blue md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="size-6" />
            ) : (
              <Menu className="size-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-cream-dark/70 bg-warm-white/95 backdrop-blur md:hidden animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="mx-auto max-w-6xl space-y-4 px-5 py-6">
            {navLinks.map((link) => (
              link.href.startsWith('#') ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )
            ))}
            <div className="space-y-3 pt-4">
              {isAuthenticated ? (
                <Link
                  href={getDashboardUrl()}
                  className={`${primaryPill} w-full`}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/auth/login" className={`${outlinePill} w-full`}>
                    Logg inn
                  </Link>
                  <Link href="/auth/signup" className={`${primaryPill} w-full`}>
                    Kom i gang
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
