import Header from "./Header";
import { trustPages, type TrustPageKey } from "../lib/trustPages";
import styles from "./TrustPage.module.css";

const supportEmail = "barrychung1112@gmail.com";

export default function TrustPage({ pageKey }: { pageKey: TrustPageKey }) {
  const page = trustPages[pageKey];

  return (
    <>
      <Header />
      <main className={`app-page ${styles.page}`}>
        <article className={`app-container ${styles.content}`}>
          <header className={styles.intro}>
            <p className="app-eyebrow">{page.eyebrow}</p>
            <h1 className="app-title">{page.title}</h1>
            <p className="app-subtitle">{page.intro}</p>
            <a className={styles.email} href={`mailto:${supportEmail}`}>
              Email OSUTrade support
            </a>
          </header>

          <div className={styles.sections}>
            {page.sections.map((section) => (
              <section key={section.heading} className={styles.section}>
                <h2>{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </main>
    </>
  );
}
