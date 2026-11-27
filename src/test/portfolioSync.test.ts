import { describe, expect, it } from "vitest";
import {
  ALL_BUILTIN_PROJECTS,
  CURATED_PROJECTS,
  LEGACY_CASE_STUDIES,
  buildSeedInsertPayloads,
  decodePortfolioDescription,
  encodePortfolioDescription,
  mapRowToShowcaseProject,
  resolvePortfolioImageUrl,
  sanitizeSafeLinkUrl,
} from "@/data/portfolioData";

describe("Project CMS catalog & case study sync", () => {
  it("contains all 6 works and 3 legacy growth case studies with unique seed keys", () => {
    expect(CURATED_PROJECTS).toHaveLength(6);
    expect(LEGACY_CASE_STUDIES).toHaveLength(3);
    expect(ALL_BUILTIN_PROJECTS).toHaveLength(9);

    const keys = ALL_BUILTIN_PROJECTS.map((p) => p.seedKey);
    expect(new Set(keys).size).toBe(9);
  });

  it("round-trips full case study metadata and drops unsafe links", () => {
    const encoded = encodePortfolioDescription({
      seedKey: "case-study-ecommerce-apparel",
      itemKind: "case-study",
      pillar: "paid-media",
      categoryLabel: "Case Study · Fashion & Apparel",
      clientType: "Fashion & Apparel",
      summary: "Rebuilt paid acquisition funnel.",
      challenge: "Low CTR and stalled ROAS.",
      architecture: "Creative matrix + email automation.",
      outcomeHeadline: "5.4x ROAS · +700% Leads",
      stack: ["Meta Ads", "Email Automation"],
      metrics: [
        { label: "ROAS", before: "1.1x", after: "5.4x", delta: "+390%" },
      ],
      liveDemoUrl: "https://example.com/demo",
      repoUrl: "javascript:alert(1)",
      assetKey: "paid-media",
      published: false,
    });

    const decoded = decodePortfolioDescription(encoded);
    expect(decoded.itemKind).toBe("case-study");
    expect(decoded.clientType).toBe("Fashion & Apparel");
    expect(decoded.challenge).toBe("Low CTR and stalled ROAS.");
    expect(decoded.metrics).toEqual([
      { label: "ROAS", before: "1.1x", after: "5.4x", delta: "+390%" },
    ]);
    expect(decoded.liveDemoUrl).toBe("https://example.com/demo");
    expect(decoded.repoUrl).toBe("");
    expect(decoded.published).toBe(false);
    expect(sanitizeSafeLinkUrl("#contact")).toBe("#contact");
  });

  it("generates idempotent seed payloads without duplicating already-synced entries", () => {
    const initialBatch = buildSeedInsertPayloads([]);
    expect(initialBatch).toHaveLength(9);
    expect(initialBatch[0].order_index).toBe(0);
    expect(initialBatch[8].order_index).toBe(8);

    const simulatedExistingRows = initialBatch.slice(0, 4).map((payload, idx) => ({
      id: `row-${idx}`,
      ...payload,
    }));

    const remainder = buildSeedInsertPayloads(simulatedExistingRows);
    expect(remainder).toHaveLength(5);
    expect(remainder[0].order_index).toBe(4);

    const fullExistingRows = initialBatch.map((payload, idx) => ({
      id: `row-${idx}`,
      ...payload,
    }));
    expect(buildSeedInsertPayloads(fullExistingRows)).toHaveLength(0);
  });

  it("maps CMS rows cleanly back into ShowcaseProject with builtin artwork fallback", () => {
    const payload = buildSeedInsertPayloads([])[0];
    const mapped = mapRowToShowcaseProject({
      id: "cms-1",
      ...payload,
    });

    expect(mapped.source).toBe("cms");
    expect(mapped.published).toBe(true);
    expect(mapped.metrics.length).toBeGreaterThan(0);
    expect(mapped.imageUrl).toBeTruthy();
    expect(resolvePortfolioImageUrl("builtin:fullstack")).toBeTruthy();
  });
});
