"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Dialog } from "@radix-ui/themes";
import { ArrowRightIcon, Cross2Icon } from "@radix-ui/react-icons";
import { LanguageToggle, useI18n } from "../i18n";
import { newStudentCopy } from "./newStudentCopy";
import styles from "./NewStudentWelcome.module.css";

export default function NewStudentWelcome() {
  const { locale } = useI18n();
  const copy = newStudentCopy[locale];
  const [open, setOpen] = useState(false);
  const [housing, setHousing] = useState<"dorm" | "apartment">("dorm");

  useEffect(() => {
    setOpen(true);
  }, []);

  const items = housing === "dorm" ? copy.dormItems : copy.apartmentItems;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <button type="button" className={styles.reopen}>
          {copy.reopen} <ArrowRightIcon />
        </button>
      </Dialog.Trigger>
      <Dialog.Content className={styles.dialog} maxWidth="900px">
        <Dialog.Close>
          <button type="button" className={styles.close} aria-label={copy.close}>
            <Cross2Icon width={20} height={20} />
          </button>
        </Dialog.Close>
        <div className={styles.layout}>
          <aside className={styles.art} aria-hidden="true">
            <Image
              src="/images/new-student-welcome.webp"
              alt=""
              fill
              priority
              unoptimized
              className={styles.image}
            />
            <div className={styles.artLabel}>
              OSUTrade<span>CORVALLIS, OREGON</span>
            </div>
            <p className={styles.artTip}>{copy.tip}</p>
          </aside>
          <div className={styles.content}>
            <div className={styles.languages}>
              <LanguageToggle />
            </div>
            <p className={styles.eyebrow}>{copy.badge}</p>
            <Dialog.Title className={styles.title}>
              <span>{copy.title}</span>
              <br />
              <em>Corvallis.</em>
            </Dialog.Title>
            <Dialog.Description className={styles.description}>
              {copy.description}
            </Dialog.Description>
            <div className={styles.switcher} role="group" aria-label={copy.reopen}>
              <button type="button" aria-pressed={housing === "dorm"} onClick={() => setHousing("dorm")}>
                {copy.dorm}
              </button>
              <button type="button" aria-pressed={housing === "apartment"} onClick={() => setHousing("apartment")}>
                {copy.apartment}
              </button>
            </div>
            <ul className={styles.list}>
              {items.map((item, index) => (
                <li key={`${housing}-${index}`}>
                  <span className={styles.number} aria-hidden="true">0{index + 1}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                    {item.link && (
                      <Link href={item.link} onClick={() => setOpen(false)} className={styles.productLink}>
                        {item.linkLabel}<ArrowRightIcon />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <section className={styles.recommendations} aria-label={copy.recommended}>
              <h3>{copy.recommended}</h3>
              <div>
                {copy.recommendations.map((item) => (
                  <Link key={item.link} href={item.link} onClick={() => setOpen(false)}>
                    {item.label}<ArrowRightIcon aria-hidden="true" />
                  </Link>
                ))}
              </div>
              <p>{copy.recommendationNote}</p>
            </section>
            <p className={styles.note}>
              {housing === "dorm" ? copy.dormNote : copy.apartmentNote}{" "}
              {housing === "dorm" && (
                <a href="https://uhds.oregonstate.edu/rates-guides/what-bring-leave-behind" target="_blank" rel="noopener noreferrer">
                  {copy.source} ↗
                </a>
              )}
            </p>
            <Link href="/overview" className={styles.browse} onClick={() => setOpen(false)}>
              {copy.browse}<ArrowRightIcon width={19} height={19} />
            </Link>
            <p className={styles.footer}>{copy.footer}</p>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
