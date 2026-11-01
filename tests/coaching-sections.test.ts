import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CoachingGuides } from "../components/coaching/coaching-guides";
import { CoachingPrograms } from "../components/coaching/coaching-programs";
import { CoachingPackages } from "../components/coaching/coaching-packages";
import { CoachingFaq } from "../components/coaching/coaching-faq";
import { content } from "../lib/coaching/content";
import { learnPath, publishedArticles } from "../lib/learn/articles";

// The components use the automatic JSX runtime that Next provides. tsx does not, so expose React for rendering.
(globalThis as { React?: unknown }).React = React;

const html = (component: () => ReturnType<typeof CoachingGuides>) => renderToStaticMarkup(createElement(component));

test("the guides section shows one card per published guide, read from lib/learn", () => {
  const out = html(CoachingGuides);
  assert.match(out, /id="guides"/);
  for (const article of publishedArticles) {
    assert.ok(out.includes(`href="${learnPath(article.slug)}"`), article.slug);
    assert.ok(out.includes(article.title.replace(/&/g, "&amp;")), article.title);
    assert.ok(out.includes(`${article.readingMinutes} ${content.guides.minutes}`), article.slug);
  }
  assert.equal((out.match(/href="\/learn\//g) ?? []).length, publishedArticles.length);
  assert.ok(out.includes(`href="/learn"`) && out.includes(content.guides.seeAll));
});

test("programs: three olympiad steps on a rail, IB and A-Level as a separate track, one mid-page button", () => {
  const out = html(CoachingPrograms);
  assert.equal((out.match(/coaching-ladder-dot/g) ?? []).length, 3);
  assert.ok(out.includes(content.programs.trackLabel));
  assert.equal((out.match(new RegExp(content.programs.linkLabel, "g")) ?? []).length, 4);
  assert.equal((out.match(/href="#hero-cta"/g) ?? []).length, 1);
  assert.match(out, /<strong class="coaching-highlight">from your first olympiad to IPhO<\/strong>/);
});

test("packages: sessions and hours, no price, no popular label, a full-width price button and one mid-page button", () => {
  const out = html(CoachingPackages);
  for (const item of content.packages.items) assert.ok(out.includes(item.sessions) && out.includes(item.hours));
  assert.ok(!/[$€£]|popular|recommended/i.test(out));
  assert.equal((out.match(/href="#hero-cta"/g) ?? []).length, 2);
});

test("faq: only the first question starts open", () => {
  const out = html(CoachingFaq);
  assert.equal((out.match(/<details[^>]*open=""/g) ?? []).length, 1);
  assert.match(out, /<details[^>]*open=""[^>]*>\s*<summary[^>]*>What is Physcratic Coaching\?/);
});
