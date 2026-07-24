import { describe, expect, test, vi } from "vitest";

import {
  reviewWantedMatch,
  type WantedMatchReviewInput,
} from "./wantedMatchReview";

const input: WantedMatchReviewInput = {
  wanted: {
    query: "computer desk",
    description: "A desk suitable for studying",
    maxPrice: 80,
  },
  product: {
    name: "Wood study desk",
    description: "Compact desk with a drawer",
    price: 50,
  },
  scores: {
    semantic: 0.74,
    lexical: 0.5,
    category: 0,
    final: 0.68,
  },
};

function responseOutput(value: unknown) {
  return {
    output: [
      {
        type: "message",
        content: [
          {
            type: "output_text",
            text: JSON.stringify(value),
          },
        ],
      },
    ],
  };
}

function okFetch(value: unknown) {
  return vi.fn<typeof fetch>(async () =>
    new Response(JSON.stringify(responseOutput(value)), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  );
}

describe("reviewWantedMatch", () => {
  test("accepts a relevant match at or above the confidence threshold", async () => {
    const fetchImpl = okFetch({
      relevant: true,
      confidence: 0.87,
      reason: "The listing is the requested type of desk.",
    });

    const result = await reviewWantedMatch(input, {
      apiKey: "test-key",
      fetchImpl,
    });

    expect(result).toEqual({
      status: "accepted",
      relevant: true,
      confidence: 0.87,
      reason: "The listing is the requested type of desk.",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();

    const [, request] = fetchImpl.mock.calls[0];
    const body = JSON.parse(String(request?.body));
    expect(body.model).toBe("gpt-4.1-mini");
    expect(body.text.format).toMatchObject({
      type: "json_schema",
      name: "wanted_match_review",
      strict: true,
    });
    expect(body.text.format.schema.required).toEqual([
      "relevant",
      "confidence",
      "reason",
    ]);
  });

  test("rejects a relevant match below the confidence threshold", async () => {
    const result = await reviewWantedMatch(input, {
      apiKey: "test-key",
      fetchImpl: okFetch({
        relevant: true,
        confidence: 0.74,
        reason: "The match is plausible but uncertain.",
      }),
    });

    expect(result).toEqual({
      status: "rejected",
      relevant: true,
      confidence: 0.74,
      reason: "The match is plausible but uncertain.",
    });
  });

  test("rejects an explicitly irrelevant match", async () => {
    const result = await reviewWantedMatch(input, {
      apiKey: "test-key",
      fetchImpl: okFetch({
        relevant: false,
        confidence: 0.98,
        reason: "This is a dining table, not a computer desk.",
      }),
    });

    expect(result.status).toBe("rejected");
  });

  test("defers review when the API key is missing", async () => {
    const fetchImpl = vi.fn();

    const result = await reviewWantedMatch(input, {
      apiKey: "",
      fetchImpl,
    });

    expect(result).toEqual({
      status: "deferred",
      error: "AI match review is unavailable.",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("defers review for a non-200 response without exposing response content", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("secret upstream details", { status: 429 })
    );

    const result = await reviewWantedMatch(input, {
      apiKey: "test-key",
      fetchImpl,
    });

    expect(result).toEqual({
      status: "deferred",
      error: "AI match review request failed.",
    });
    expect(JSON.stringify(result)).not.toContain("secret upstream details");
  });

  test("defers review when OpenAI returns 201", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify(
          responseOutput({
            relevant: true,
            confidence: 0.99,
            reason: "This output must not be accepted from a 201 response.",
          })
        ),
        { status: 201 }
      )
    );

    const result = await reviewWantedMatch(input, {
      apiKey: "test-key",
      fetchImpl,
    });

    expect(result).toEqual({
      status: "deferred",
      error: "AI match review request failed.",
    });
  });

  test("defers review when structured output is invalid", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: "not json" }],
            },
          ],
        }),
        { status: 200 }
      )
    );

    const result = await reviewWantedMatch(input, {
      apiKey: "test-key",
      fetchImpl,
    });

    expect(result).toEqual({
      status: "deferred",
      error: "AI match review returned invalid output.",
    });
  });

  test("defers review when fetch fails", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("socket details must stay private");
    });

    await expect(
      reviewWantedMatch(input, {
        apiKey: "test-key",
        fetchImpl,
        timeoutMs: 5,
      })
    ).resolves.toEqual({
      status: "deferred",
      error: "AI match review is temporarily unavailable.",
    });
  });

  test("aborts a pending fetch after the configured timeout and defers review", async () => {
    let aborted = false;
    const fetchImpl = vi.fn<typeof fetch>(
      async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              aborted = true;
              reject(new DOMException("The request was aborted.", "AbortError"));
            },
            { once: true }
          );
        })
    );

    const result = await reviewWantedMatch(input, {
      apiKey: "test-key",
      fetchImpl,
      timeoutMs: 5,
    });

    expect(aborted).toBe(true);
    expect(result).toEqual({
      status: "deferred",
      error: "AI match review is temporarily unavailable.",
    });
  });
});
