"use client";
import {
  useId,
  useRef,
  useState,
  cloneElement,
  isValidElement,
  type ReactNode,
} from "react";
import katex from "katex";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { equationTemplates } from "@/lib/latex-working";
import {
  moveItem,
  newBlock,
  type EditorBlock,
} from "@/lib/problem-authoring-editor";

export function Field({
  label,
  children,
  help,
}: {
  label: string;
  children: (id: string) => ReactNode;
  help?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {isValidElement<{ "aria-describedby"?: string }>(children(id)) && help
        ? cloneElement(
            children(id) as React.ReactElement<{ "aria-describedby"?: string }>,
            { "aria-describedby": `${id}-help` },
          )
        : children(id)}
      {help && (
        <p
          id={`${id}-help`}
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {help}
        </p>
      )}
    </div>
  );
}
export const inputClass =
  "min-h-11 w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
export function MathPreview({
  latex,
  inline = false,
  keyboardScrollable = false,
}: {
  latex: string;
  inline?: boolean;
  keyboardScrollable?: boolean;
}) {
  try {
    const html = katex.renderToString(latex, {
      displayMode: !inline,
      throwOnError: true,
      trust: false,
      maxExpand: 1000,
      maxSize: 20,
      output: "htmlAndMathml",
    });
    return (
      <span
        tabIndex={keyboardScrollable ? 0 : undefined}
        role={keyboardScrollable ? "group" : undefined}
        aria-label={keyboardScrollable ? "Mathematical expression" : undefined}
        className={
          inline
            ? "inline-block max-w-full overflow-x-auto align-middle focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            : "block max-w-full overflow-x-auto py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return (
      <span className="block text-sm text-destructive">
        Equation preview unavailable. Check LaTeX commands and braces.
      </span>
    );
  }
}
function EquationInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="space-y-3">
      <Field
        label={label}
        help="LaTeX only, without dollar delimiters. Shortcuts insert at your cursor."
      >
        {(id) => (
          <textarea
            ref={ref}
            id={id}
            rows={2}
            className={`${inputClass} font-mono`}
            value={value}
            maxLength={2000}
            onChange={(e) => onChange(e.target.value)}
            spellCheck={false}
          />
        )}
      </Field>
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label={`${label} shortcuts`}
      >
        {equationTemplates.map((t) => (
          <Button
            key={t.label}
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              const start = ref.current?.selectionStart ?? value.length,
                end = ref.current?.selectionEnd ?? start;
              const next = value.slice(0, start) + t.latex + value.slice(end);
              if (next.length > 2000) return;
              onChange(next);
              requestAnimationFrame(() => {
                ref.current?.focus();
                ref.current?.setSelectionRange(start, start + t.latex.length);
              });
            }}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <div
        className="min-h-14 rounded-md bg-muted/40 px-3"
        role="group"
        aria-label={`${label} preview`}
      >
        <MathPreview latex={value} />
      </div>
    </div>
  );
}
export function OrderControls({
  index,
  count,
  label,
  move,
  remove,
}: {
  index: number;
  count: number;
  label: string;
  move: (delta: -1 | 1) => void;
  remove: () => void | boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  function apply(delta?: -1 | 1) {
    const item = ref.current?.closest<HTMLElement>("[data-order-item]");
    const neighbor = item?.nextElementSibling?.hasAttribute("data-order-item")
      ? item.nextElementSibling
      : item?.previousElementSibling?.hasAttribute("data-order-item")
        ? item.previousElementSibling
        : item?.parentElement;
    const target = delta === undefined ? neighbor : item;
    if (delta === undefined) {
      if (remove() === false) return;
    } else move(delta);
    requestAnimationFrame(() => {
      if (target instanceof HTMLElement && target.isConnected) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    });
  }
  return (
    <div ref={ref} className="flex shrink-0 gap-1">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={index === 0}
        aria-label={`Move ${label} up`}
        onClick={() => apply(-1)}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={index === count - 1}
        aria-label={`Move ${label} down`}
        onClick={() => apply(1)}
      >
        <ArrowDown className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={`Delete ${label}`}
        onClick={() => apply()}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
import { MediaImage, UploadControl } from "./media-controls";

export function BlocksEditor({
  blocks,
  onChange,
  label,
  scope = "statement",
}: {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  label: string;
  scope?: "statement" | "solution";
}) {
  const [notice, setNotice] = useState("");
  return (
    <div className="space-y-4">
      <p className="sr-only" role="status">
        {notice}
      </p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <span className="text-xs text-muted-foreground">
          {blocks.length} blocks
        </span>
      </div>
      {blocks.map((block, index) => (
        <div
          key={block.id}
          data-order-item
          tabIndex={-1}
          aria-label={`${label} block ${index + 1}`}
          className="rounded-lg border border-dashed p-3 sm:p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {block.kind === "math"
                ? "Equation"
                : block.kind === "image"
                  ? "Image"
                  : "Text"}{" "}
              {index + 1}
            </span>
            <OrderControls
              index={index}
              count={blocks.length}
              label={`${label} block ${index + 1}`}
              move={(delta) => {
                onChange(moveItem(blocks, index, delta));
                setNotice(
                  `${label} block ${index + 1} moved to position ${index + delta + 1}.`,
                );
              }}
              remove={() => {
                onChange(blocks.filter((b) => b.id !== block.id));
                setNotice(
                  `${label} block deleted. ${blocks.length - 1} remain.`,
                );
              }}
            />
          </div>
          {block.kind === "math" ? (
            <EquationInput
              label={`${label} equation ${index + 1}`}
              value={block.latex}
              onChange={(latex) =>
                onChange(
                  blocks.map((b) =>
                    b.id === block.id ? { ...block, latex } : b,
                  ),
                )
              }
            />
          ) : block.kind === "text" ? (
            <div className="space-y-3">
              {block.spans.map((span, si) => (
                <div key={si} className="space-y-1">
                  {span.kind === "text" ? (
                    <Field
                      label={`${label} text ${index + 1}${block.spans.length > 1 ? ` · span ${si + 1}` : ""}`}
                    >
                      {(id) => (
                        <textarea
                          id={id}
                          className={inputClass}
                          rows={3}
                          value={span.text}
                          maxLength={12000}
                          onChange={(e) =>
                            onChange(
                              blocks.map((b) =>
                                b.id === block.id
                                  ? {
                                      ...block,
                                      spans: block.spans.map((s, i) =>
                                        i === si
                                          ? {
                                              kind: "text",
                                              text: e.target.value,
                                            }
                                          : s,
                                      ),
                                    }
                                  : b,
                              ),
                            )
                          }
                        />
                      )}
                    </Field>
                  ) : (
                    <EquationInput
                      label={`${label} inline equation ${si + 1}`}
                      value={span.latex}
                      onChange={(latex) =>
                        onChange(
                          blocks.map((b) =>
                            b.id === block.id
                              ? {
                                  ...block,
                                  spans: block.spans.map((s, i) =>
                                    i === si ? { kind: "math", latex } : s,
                                  ),
                                }
                              : b,
                          ),
                        )
                      }
                    />
                  )}
                  {block.spans.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        onChange(
                          blocks.map((b) =>
                            b.id === block.id
                              ? {
                                  ...block,
                                  spans: block.spans.filter((_, i) => i !== si),
                                }
                              : b,
                          ),
                        )
                      }
                    >
                      Remove span {si + 1}
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={block.spans.length >= 100}
                  onClick={() =>
                    onChange(
                      blocks.map((b) =>
                        b.id === block.id
                          ? {
                              ...block,
                              spans: [
                                ...block.spans,
                                { kind: "math", latex: "" },
                              ],
                            }
                          : b,
                      ),
                    )
                  }
                >
                  + Inline equation
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={block.spans.length >= 100}
                  onClick={() =>
                    onChange(
                      blocks.map((b) =>
                        b.id === block.id
                          ? {
                              ...block,
                              spans: [
                                ...block.spans,
                                { kind: "text", text: "" },
                              ],
                            }
                          : b,
                      ),
                    )
                  }
                >
                  + Text span
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <MediaImage
                mediaId={block.mediaId}
                alt={block.alt}
                caption={block.caption}
              />
              <Field
                label={`${label} image ${index + 1} alt text`}
                help="Describe the image for readers who cannot see it; required to publish."
              >
                {(id) => (
                  <input
                    id={id}
                    className={inputClass}
                    value={block.alt}
                    maxLength={1000}
                    onChange={(e) =>
                      onChange(
                        blocks.map((b) =>
                          b.id === block.id
                            ? { ...block, alt: e.target.value }
                            : b,
                        ),
                      )
                    }
                  />
                )}
              </Field>
              <Field label={`${label} image ${index + 1} caption`}>
                {(id) => (
                  <input
                    id={id}
                    className={inputClass}
                    value={block.caption}
                    maxLength={2000}
                    onChange={(e) =>
                      onChange(
                        blocks.map((b) =>
                          b.id === block.id
                            ? { ...block, caption: e.target.value }
                            : b,
                        ),
                      )
                    }
                  />
                )}
              </Field>
              <UploadControl
                purpose={`${scope}-image`}
                label={`Replace ${label.toLowerCase()} image ${index + 1}`}
                onUploaded={(file) =>
                  onChange(
                    blocks.map((b) =>
                      b.id === block.id ? { ...block, mediaId: file.id } : b,
                    ),
                  )
                }
              />
            </div>
          )}
        </div>
      ))}
      {blocks.length < 100 && (
        <UploadControl
          purpose={`${scope}-image`}
          label={`Upload image to ${label.toLowerCase()}`}
          onUploaded={(file) =>
            onChange([
              ...blocks,
              {
                id: crypto.randomUUID(),
                kind: "image",
                mediaId: file.id,
                alt: "",
                caption: "",
              },
            ])
          }
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={blocks.length >= 100}
          onClick={() => onChange([...blocks, newBlock("text")])}
        >
          <Plus className="mr-1 size-4" />
          Add text to {label.toLowerCase()}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={blocks.length >= 100}
          onClick={() => onChange([...blocks, newBlock("math")])}
        >
          + Add equation to {label.toLowerCase()}
        </Button>
      </div>
    </div>
  );
}
export function ReaderBlocks({ blocks }: { blocks: EditorBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block) =>
        block.kind === "math" ? (
          <MathPreview key={block.id} latex={block.latex} />
        ) : block.kind === "text" ? (
          <p
            key={block.id}
            className="whitespace-pre-wrap break-words leading-7"
          >
            {block.spans.map((s, i) =>
              s.kind === "text" ? (
                <span key={i}>{s.text}</span>
              ) : (
                <MathPreview key={i} latex={s.latex} inline />
              ),
            )}
          </p>
        ) : (
          <MediaImage
            key={block.id}
            mediaId={block.mediaId}
            alt={block.alt}
            caption={block.caption}
          />
        ),
      )}
    </div>
  );
}

export function NumberInput({
  id,
  value,
  onValue,
  nonnegative = false,
}: {
  id: string;
  value: number | string | null | undefined;
  onValue: (value: number | string | null) => void;
  nonnegative?: boolean;
}) {
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      className={inputClass}
      maxLength={80}
      value={value ?? ""}
      aria-invalid={
        value !== undefined &&
        (typeof value !== "number" || (nonnegative && value < 0))
      }
      onBlur={() => {
        if (
          typeof value === "string" &&
          value.trim() &&
          Number.isFinite(Number(value))
        )
          onValue(Number(value));
      }}
      onChange={(e) => {
        const raw = e.target.value;
        const complete =
          /^[+-]?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/.test(raw) &&
          Number.isFinite(Number(raw));
        onValue(
          raw === ""
            ? null
            : complete && !(Number(raw) === 0 && raw.startsWith("-"))
              ? Number(raw)
              : raw,
        );
      }}
    />
  );
}
