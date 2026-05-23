import Link from "next/link";
import { Instagram, Facebook } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-foreground text-white">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <h3 className="text-2xl font-serif font-semibold">NooraCare</h3>
            <p className="text-white/70 leading-relaxed">
              Mer tid til det som betyr noe. Profesjonell vaskservice for
              travle familier i Bergen og Oslo.
            </p>
            {/* TODO: replace with the legal entity name and 9-digit org number before production */}
            <div className="text-sm text-white/60 space-y-1">
              <p>NooraCare AS</p>
              <p>Org.nr: 836 788 842</p>
            </div>
            {/* Social Icons */}
            <div className="flex gap-4 pt-2">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Service Areas Column */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Serviceområder</h4>
            <ul className="space-y-3 text-white/70">
              <li>Bergen</li>
              <li>Oslo</li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Kontakt</h4>
            <ul className="space-y-3 text-white/70">
              <li>
                <a
                  href="mailto:support@nooracare.no"
                  className="hover:text-white transition-colors"
                >
                  support@nooracare.no
                </a>
              </li>
              {/* TODO: replace with real phone number before production */}
              <li>
                <a
                  href="tel:+4700000000"
                  className="hover:text-white transition-colors"
                >
                  +47 976 16 468
                </a>
              </li>
              {/* TODO: replace with real postal address before production */}
              <li className="leading-relaxed">
                Breimyra 232
                <br />
                5134 Flaktveit
              </li>
              <li>
                <Link
                  href="/kontakt"
                  className="hover:text-white transition-colors"
                >
                  Kontakt oss
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Selskap</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/pris-kalkulator"
                  className="text-white/70 hover:text-white transition-colors"
                >
                  Priser
                </Link>
              </li>
              <li>
                <Link
                  href="/personvern"
                  className="text-white/70 hover:text-white transition-colors"
                >
                  Personvern
                </Link>
              </li>
              <li>
                <Link
                  href="/salgsvilkar"
                  className="text-white/70 hover:text-white transition-colors"
                >
                  Vilkår
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/60">
            <p>© 2025 NooraCare. Alle rettigheter reservert.</p>
            <div className="flex gap-6">
              <Link
                href="/personvern"
                className="hover:text-white transition-colors"
              >
                Personvern
              </Link>
              <Link
                href="/salgsvilkar"
                className="hover:text-white transition-colors"
              >
                Vilkår
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
