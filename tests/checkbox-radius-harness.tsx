import React from "react";
import { createRoot } from "react-dom/client";
import { Checkbox } from "@/components/ui/checkbox";

// Plain inline styles for the layout, because Tailwind does not scan tests/. The checkbox itself keeps its real classes.
const cell: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: 12, fontSize: 12, color: "hsl(var(--muted-foreground))" };
createRoot(document.getElementById("root")!).render(
  <main style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 32, padding: 32, background: "hsl(var(--background))", color: "hsl(var(--foreground))", minHeight: "100vh" }}>
    <div style={cell}><Checkbox id="unchecked" aria-label="Unchecked" />Unchecked</div>
    <div style={cell}><Checkbox id="checked" aria-label="Checked" defaultChecked />Checked</div>
    <div style={cell}><Checkbox id="focus" aria-label="Focused" />Focused</div>
    <div style={cell}><Checkbox id="indeterminate" aria-label="Indeterminate" checked="indeterminate" />Indeterminate</div>
    <div style={cell}><Checkbox id="invalid" aria-label="Invalid" aria-invalid required />Invalid</div>
    <div style={cell}><Checkbox id="disabled" aria-label="Disabled" disabled />Disabled</div>
  </main>,
);
