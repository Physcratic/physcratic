// Unit tests run server modules and React DOM renderers together. Next.js still
// enforces the real server-only boundary in the production build.
const { Module } = require("node:module");
const path = require.resolve("server-only");
const boundary = new Module(path);
boundary.exports = {};
boundary.loaded = true;
require.cache[path] = boundary;
