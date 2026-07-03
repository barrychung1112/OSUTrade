"use client";

import { useI18n } from "../i18n";
import type { AiDraftLocale } from "../lib/aiProductDrafts";

type EditableBulkDraft = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  locale: AiDraftLocale;
};

type BulkDraftPatch = Partial<Omit<EditableBulkDraft, "id">>;

type BulkDraftFieldsProps = {
  draft: EditableBulkDraft;
  categories: readonly string[];
  disabled: boolean;
  onChange: (patch: BulkDraftPatch) => void;
};

const labelClassName = "mb-1.5 block text-sm font-semibold text-gray-700";

export default function BulkDraftFields({
  draft,
  categories,
  disabled,
  onChange,
}: BulkDraftFieldsProps) {
  const { t } = useI18n();
  const fieldId = draft.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const languageLabel =
    draft.locale === "zh"
      ? t("common.zhTw")
      : draft.locale === "zhCn"
        ? t("common.zhCn")
        : t("common.english");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800">
        {t("sell.aiBulkDraftLanguage", { language: languageLabel })}
      </div>
      <div>
        <label className={labelClassName} htmlFor={`${fieldId}-name`}>
          {t("sell.itemName")}
        </label>
        <input
          id={`${fieldId}-name`}
          className="app-input"
          value={draft.name}
          disabled={disabled}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </div>

      <div>
        <label className={labelClassName} htmlFor={`${fieldId}-description`}>
          {t("sell.description")}
        </label>
        <textarea
          id={`${fieldId}-description`}
          className="app-input min-h-24"
          value={draft.description}
          disabled={disabled}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder={t("sell.descriptionPlaceholder")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClassName} htmlFor={`${fieldId}-price`}>
            {t("sell.price")}
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-semibold text-gray-500"
            >
              $
            </span>
            <input
              id={`${fieldId}-price`}
              className="app-input pl-8"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={draft.price}
              disabled={disabled}
              onChange={(event) => onChange({ price: Number(event.target.value) })}
            />
          </div>
        </div>

        <div>
          <label className={labelClassName} htmlFor={`${fieldId}-quantity`}>
            {t("sell.quantity")}
          </label>
          <input
            id={`${fieldId}-quantity`}
            className="app-input"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={draft.quantity}
            disabled={disabled}
            onChange={(event) => onChange({ quantity: Number(event.target.value) })}
          />
        </div>

        <div>
          <label className={labelClassName} htmlFor={`${fieldId}-category`}>
            {t("marketplace.category")}
          </label>
          <select
            id={`${fieldId}-category`}
            className="app-input"
            value={draft.category}
            disabled={disabled}
            onChange={(event) => onChange({ category: event.target.value })}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {t(`common.category.${category}` as any)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
