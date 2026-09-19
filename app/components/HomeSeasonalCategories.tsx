"use client";

import Link from "next/link";
import { useI18n } from "../i18n";
import { homeSeasonalCopy } from "../lib/homeSeasonalCopy";
import type { HomeSeason } from "../lib/homeSeason";

export default function HomeSeasonalCategories({
  season,
}: {
  season: HomeSeason;
}) {
  const { locale } = useI18n();
  const copy = homeSeasonalCopy[locale][season];
  const headingId = "home-seasonal-categories-title";

  return (
    <section
      className="home-seasonal-categories"
      aria-labelledby={headingId}
    >
      <div className="home-section-heading home-seasonal-categories-heading">
        <p className="home-seasonal-categories-eyebrow">{copy.eyebrow}</p>
        <h2 id={headingId}>{copy.categorySectionTitle}</h2>
      </div>
      <ul className="home-seasonal-categories-list">
        {copy.categories.map((category) => (
          <li key={category.category} className="home-seasonal-category-item">
            <Link
              href={category.href}
              className="home-seasonal-category-card inline-flex min-h-11 items-center"
            >
              {category.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
