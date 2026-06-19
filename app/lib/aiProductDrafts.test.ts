import { describe, expect, test } from "vitest";
import {
  createFallbackDrafts,
  extractAiDraftResponseText,
  parseAiDraftResponse,
  prepareDraftsForClient,
} from "./aiProductDrafts";

describe("parseAiDraftResponse", () => {
  test("normalizes AI drafts and keeps only valid image indexes", () => {
    const result = parseAiDraftResponse(
      JSON.stringify({
        drafts: [
          {
            name: "Dorm Mini Fridge",
            description: "Compact fridge with visible wear.",
            category: "Appliances",
            price: 30,
            quantity: 2,
            confidence: 0.86,
            warnings: ["Detected handwritten price $30."],
            imageIndexes: [0, 9, 1, 1],
          },
        ],
      }),
      3
    );

    expect(result).toEqual([
      {
        id: "draft-1",
        name: "Dorm Mini Fridge",
        description: "Compact fridge with visible wear.",
        category: "home",
        price: 30,
        quantity: 2,
        confidence: 0.86,
        warnings: ["Detected handwritten price $30."],
        imageIndexes: [0, 1],
      },
    ]);
  });

  test("returns an empty list when JSON is invalid", () => {
    expect(parseAiDraftResponse("not json", 2)).toEqual([]);
  });
});

describe("createFallbackDrafts", () => {
  test("creates one conservative draft per image", () => {
    expect(createFallbackDrafts(2)).toEqual([
      {
        id: "draft-1",
        name: "Item 1",
        description: "AI could not confidently identify this item. Please review the photo and fill in the details.",
        category: "general",
        price: 1,
        quantity: 1,
        confidence: 0.2,
        warnings: ["Please review and complete this draft before publishing."],
        imageIndexes: [0],
      },
      {
        id: "draft-2",
        name: "Item 2",
        description: "AI could not confidently identify this item. Please review the photo and fill in the details.",
        category: "general",
        price: 1,
        quantity: 1,
        confidence: 0.2,
        warnings: ["Please review and complete this draft before publishing."],
        imageIndexes: [1],
      },
    ]);
  });
});

describe("prepareDraftsForClient", () => {
  test("caps draft photos to three image urls", () => {
    const [draft] = prepareDraftsForClient(
      [
        {
          id: "draft-1",
          name: "Desk",
          description: "",
          category: "home",
          price: 15,
          quantity: 1,
          confidence: 0.8,
          warnings: [],
          imageIndexes: [0, 1, 2, 3],
        },
      ],
      ["a.jpg", "b.jpg", "c.jpg", "d.jpg"]
    );

    expect(draft.imageUrls).toEqual(["a.jpg", "b.jpg", "c.jpg"]);
  });
});

describe("extractAiDraftResponseText", () => {
  test("reads output_text from the Responses API payload", () => {
    expect(extractAiDraftResponseText({ output_text: "{\"drafts\":[]}" })).toBe(
      "{\"drafts\":[]}"
    );
  });

  test("reads nested text content from the Responses API payload", () => {
    expect(
      extractAiDraftResponseText({
        output: [{ content: [{ text: "{\"drafts\":[{\"name\":\"Desk\"}]}" }] }],
      })
    ).toBe("{\"drafts\":[{\"name\":\"Desk\"}]}");
  });
});
