import Link from "next/link";
import styles from "./SiteFooter.module.css";

const trustLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/contact", label: "Contact" },
  { href: "/safety", label: "Safety" },
];

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          <p className={styles.wordmark}>OSUTrade</p>
          <p>
            An independent local marketplace for discovering listings and arranging
            pickup. OSUTrade does not process payments and is not affiliated with
            Oregon State University.
          </p>
        </div>

        <nav aria-label="Trust and support" className={styles.nav}>
          {trustLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <a className={styles.email} href="mailto:barrychung1112@gmail.com">
          barrychung1112@gmail.com
        </a>
      </div>
    </footer>
  );
}
