import Image from 'next/image';
import Link from 'next/link';

const footerGroups = [
  {
    title: 'Product',
    links: [
      { label: 'Browse jobs', href: '/#open-roles' },
      { label: 'Platform features', href: '/#features' },
      { label: 'Pricing plans', href: '/#pricing' },
    ],
  },
  {
    title: 'For job seekers',
    links: [
      { label: 'Create an account', href: '/signup' },
      { label: 'Sign in', href: '/signin' },
      { label: 'Job seeker dashboard', href: '/dashboard/seeker' },
    ],
  },
  {
    title: 'For employers',
    links: [
      { label: 'Create a recruiter account', href: '/signup' },
      { label: 'Recruiter dashboard', href: '/dashboard/recruiter' },
      { label: 'Contact HireLoop', href: '/contact' },
    ],
  },
];

export default function HomeFooter() {
  return (
    <footer
      id="footer"
      className="border-t border-white/6 bg-black px-4 pb-6 pt-10 sm:px-6 sm:pt-12 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[2.4fr_repeat(3,0.8fr)] lg:gap-12">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" aria-label="Hireloop home" className="inline-flex">
              <Image
                src="/images/logo.png"
                alt="Hireloop"
                width={100}
                height={30}
                className="h-7.5 w-25"
              />
            </Link>
            <p className="mt-4 max-w-80 text-[11px] leading-5 text-[#66666e]">
              The AI-native career platform. Built for
              <br className="hidden sm:block" /> people who take their work seriously.
            </p>
          </div>

          {footerGroups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-[11px] font-medium text-[#777bff]">{group.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <Link
                        href={link.href}
                        className="text-[10px] text-[#66666e] transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span className="text-[10px] text-[#66666e]">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/6 pt-5 text-[10px] text-[#66666e] sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 — HireLoop</p>
          <Link href="/contact" className="transition hover:text-white">
            Contact support
          </Link>
        </div>
      </div>
    </footer>
  );
}
