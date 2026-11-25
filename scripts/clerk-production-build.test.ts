import { afterEach, expect, test } from "bun:test";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import config from "../next.config";

const keys = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "ALLOW_CLERK_TEST_KEYS",
  "WORKERS_CI",
  "WORKERS_CI_BRANCH",
] as const;
const previous = new Map(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const [key, value] of previous) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function build(branch: string, domain: string, mode: "test" | "live") {
  process.env.WORKERS_CI = "1";
  process.env.WORKERS_CI_BRANCH = branch;
  process.env.ALLOW_CLERK_TEST_KEYS = "1";
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY =
    `pk_${mode}_${Buffer.from(domain + "$").toString("base64")}`;
  return config(PHASE_PRODUCTION_BUILD);
}

test("the production branch rejects a development key even with the preview override", () => {
  expect(() => build("main", "example.clerk.accounts.dev", "test")).toThrow(/production publishable key/i);
});

test("the production branch rejects a live key for another instance", () => {
  expect(() => build("main", "clerk.example.org", "live")).toThrow(/clerk.rayincare.org/);
});

test("the production branch accepts the canonical instance and rejects development server credentials", () => {
  process.env.CLERK_SECRET_KEY = "sk_live_fixture";
  expect(() => build("main", "clerk.rayincare.org", "live")).not.toThrow();
  process.env.CLERK_SECRET_KEY = "sk_test_fixture";
  expect(() => build("main", "clerk.rayincare.org", "live")).toThrow(/development secret key/i);
});

test("an explicitly opted-in preview can still use its test instance", () => {
  expect(() => build("preview", "example.clerk.accounts.dev", "test")).not.toThrow();
});
