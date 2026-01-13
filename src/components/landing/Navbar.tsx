"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    if (userRole === 'admin') return '/admin/orders';
    if (userRole === 'cleaner') return '/dashboard/cleaner';
    return '/dashboard';
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-card/95 backdrop-blur-md shadow-soft py-4"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-serif font-semibold text-[hsl(var(--nordic-blue))]">
              NooraCare
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.href.startsWith('#') ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-foreground/80 hover:text-[hsl(var(--nordic-blue))] transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-foreground/80 hover:text-[hsl(var(--nordic-blue))] transition-colors"
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <Button variant="hero" size="default" asChild>
                <Link href={getDashboardUrl()}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" size="default" asChild>
                  <Link href="/auth/login">Logg inn</Link>
                </Button>
                <Button variant="hero" size="default" asChild>
                  <Link href="/auth/signup">Kom i gang</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground hover:text-[hsl(var(--nordic-blue))] transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-background border-t border-border shadow-lg">
          <div className="container mx-auto px-4 py-6 space-y-4">
            {navLinks.map((link) => (
              link.href.startsWith('#') ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-sm font-medium text-foreground/80 hover:text-[hsl(var(--nordic-blue))] transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-2 text-sm font-medium text-foreground/80 hover:text-[hsl(var(--nordic-blue))] transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )
            ))}
            <div className="pt-4 space-y-3">
              {isAuthenticated ? (
                <Button
                  variant="hero"
                  size="default"
                  className="w-full"
                  asChild
                >
                  <Link href={getDashboardUrl()}>Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full"
                    asChild
                  >
                    <Link href="/auth/login">Logg inn</Link>
                  </Button>
                  <Button variant="hero" size="default" className="w-full" asChild>
                    <Link href="/auth/signup">Kom i gang</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
