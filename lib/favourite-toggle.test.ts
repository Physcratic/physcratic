import assert from "node:assert/strict";
import test from "node:test";
import { applyFavouriteOverride, favouriteErrorMessage, favouriteNoun } from "./favourite-toggle";

const stat = { key: "arena:x", favourites: 4, favourite: false, solves: 2 };

test("no override, or one that matches the server, leaves the stat untouched", () => {
  assert.equal(applyFavouriteOverride(stat, undefined), stat);
  assert.equal(applyFavouriteOverride(stat, false), stat);
  const liked = { ...stat, favourite: true };
  assert.equal(applyFavouriteOverride(liked, true), liked);
});

test("an optimistic favourite adds one and an optimistic unfavourite removes one", () => {
  assert.deepEqual(applyFavouriteOverride(stat, true), { ...stat, favourite: true, favourites: 5 });
  assert.deepEqual(applyFavouriteOverride({ ...stat, favourite: true }, false), { ...stat, favourite: false, favourites: 3 });
  // Other fields, such as the solve count, are kept.
  assert.equal(applyFavouriteOverride(stat, true).solves, 2);
  // Rolling back is dropping the override, which gives the server stat again.
  assert.equal(applyFavouriteOverride(stat, undefined).favourites, 4);
});

test("the count never goes below zero", () => {
  assert.equal(applyFavouriteOverride({ ...stat, favourites: 0, favourite: true }, false).favourites, 0);
});

test("write errors are plain words, with the rate limit and account change named", () => {
  assert.equal(favouriteErrorMessage(429), "Too many requests. Try again in a minute.");
  assert.equal(favouriteErrorMessage(409), "Your account changed. Reload the page before continuing.");
  for (const status of [undefined, 400, 403, 500, 503]) assert.equal(favouriteErrorMessage(status), "The change could not be confirmed. Reload before retrying.");
  for (const status of [undefined, 409, 429, 503]) assert.doesNotMatch(favouriteErrorMessage(status), /[–—;]/);
});

test("the noun matches the count", () => {
  assert.equal(favouriteNoun(1), "favourite");
  for (const count of [0, 2, 1000]) assert.equal(favouriteNoun(count), "favourites");
});
