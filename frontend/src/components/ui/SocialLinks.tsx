import { Mail } from 'lucide-react';
import { cn } from '../../lib/cn';
import { InstagramIcon, FacebookIcon } from './BrandIcons';

const links = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/dashaapp.mx/',
    icon: InstagramIcon,
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61590460525696',
    icon: FacebookIcon,
  },
  {
    label: 'Correo',
    href: 'mailto:dashaapp.puebla@gmail.com',
    icon: Mail,
  },
];

type SocialLinksProps = {
  className?: string;
};

export function SocialLinks({ className }: SocialLinksProps) {
  return (
    <div className={cn('flex items-center justify-center gap-3', className)}>
      {links.map(({ label, href, icon: Icon }) => {
        const external = href.startsWith('http');
        return (
          <a
            key={label}
            href={href}
            aria-label={label}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition-all hover:scale-110 hover:border-cobalto/30 hover:text-cobalto active:scale-95"
          >
            <Icon className="h-5 w-5" />
          </a>
        );
      })}
    </div>
  );
}
