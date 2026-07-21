"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PrepareClientLogo = () => Promise<File | null>;

type LogoMode = "contain" | "cover";
type Point = { x: number; y: number };

const PREVIEW_SIZE = 640;
const OUTPUT_SIZE = 1024;

function drawLogo(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  mode: LogoMode,
  zoom: number,
  offset: Point,
) {
  const size = canvas.width;
  const baseScale =
    mode === "cover"
      ? Math.max(size / image.naturalWidth, size / image.naturalHeight)
      : Math.min(size / image.naturalWidth, size / image.naturalHeight);
  const scale = baseScale * (mode === "cover" ? zoom : 1);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const x = (size - width) / 2 + (mode === "cover" ? offset.x : 0);
  const y = (size - height) / 2 + (mode === "cover" ? offset.y : 0);
  const context = canvas.getContext("2d");

  if (!context) return;
  context.clearRect(0, 0, size, size);
  context.drawImage(image, x, y, width, height);
}

function clampOffset(image: HTMLImageElement, zoom: number, offset: Point) {
  const scale = Math.max(
    PREVIEW_SIZE / image.naturalWidth,
    PREVIEW_SIZE / image.naturalHeight,
  ) * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const maxX = Math.max(0, (width - PREVIEW_SIZE) / 2);
  const maxY = Math.max(0, (height - PREVIEW_SIZE) / 2);

  return {
    x: Math.max(-maxX, Math.min(maxX, offset.x)),
    y: Math.max(-maxY, Math.min(maxY, offset.y)),
  };
}

export function ClientLogoEditor({
  currentLogoUrl,
  prepareRef,
}: {
  currentLogoUrl?: string | null;
  prepareRef: React.MutableRefObject<PrepareClientLogo | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const sourceObjectUrlRef = useRef<string | null>(null);
  const dragRef = useRef<{ pointerId: number; point: Point; offset: Point } | null>(null);
  const [mode, setMode] = useState<LogoMode>("contain");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [hasEditableImage, setHasEditableImage] = useState(false);
  const [hasNewFile, setHasNewFile] = useState(false);
  const [removeLogo, setRemoveLogo] = useState(false);

  function redraw(nextMode = mode, nextZoom = zoom, nextOffset = offset) {
    if (!canvasRef.current || !imageRef.current) return;
    drawLogo(canvasRef.current, imageRef.current, nextMode, nextZoom, nextOffset);
  }

  function loadSource(source: string, isNewFile: boolean) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      imageRef.current = image;
      setHasEditableImage(true);
      setHasNewFile(isNewFile);
      setRemoveLogo(false);
      setMode("contain");
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      if (canvasRef.current) drawLogo(canvasRef.current, image, "contain", 1, { x: 0, y: 0 });
    };
    image.onerror = () => setHasEditableImage(false);
    image.src = source;
  }

  useEffect(() => {
    if (currentLogoUrl) loadSource(currentLogoUrl, false);
    return () => {
      if (sourceObjectUrlRef.current) URL.revokeObjectURL(sourceObjectUrlRef.current);
    };
    // The initial URL belongs to the loaded client and does not change while this form is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prepareLogo = useCallback(async () => {
    if (!hasNewFile || !imageRef.current) return null;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = OUTPUT_SIZE;
    exportCanvas.height = OUTPUT_SIZE;
    drawLogo(
      exportCanvas,
      imageRef.current,
      mode,
      zoom,
      { x: (offset.x / PREVIEW_SIZE) * OUTPUT_SIZE, y: (offset.y / PREVIEW_SIZE) * OUTPUT_SIZE },
    );
    const blob = await new Promise<Blob>((resolve, reject) => {
      exportCanvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error("Não foi possível preparar o logótipo."))),
        "image/webp",
        0.92,
      );
    });

    return new File([blob], "logo-enquadrado.webp", { type: "image/webp" });
  }, [hasNewFile, mode, offset, zoom]);

  useEffect(() => {
    prepareRef.current = prepareLogo;
    return () => {
      prepareRef.current = null;
    };
  }, [prepareLogo, prepareRef]);

  return (
    <fieldset className="grid gap-4 rounded-[18px] border border-[var(--bb-border)] bg-white/35 p-4">
      <legend className="px-1 text-sm font-bold text-[var(--bb-charcoal)]">Logótipo</legend>
      <div className="grid gap-5 lg:grid-cols-[minmax(240px,320px)_1fr]">
        <div className="grid gap-2">
          <div
            className="relative aspect-square w-full touch-none overflow-hidden rounded-2xl border border-[var(--bb-border)] bg-[linear-gradient(45deg,#f2f2f2_25%,transparent_25%),linear-gradient(-45deg,#f2f2f2_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f2f2f2_75%),linear-gradient(-45deg,transparent_75%,#f2f2f2_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0] shadow-inner"
          >
            <canvas
              ref={canvasRef}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              className={`h-full w-full ${mode === "cover" && hasEditableImage ? "cursor-grab active:cursor-grabbing" : ""}`}
              aria-label="Pré-visualização final do logótipo. Usa as setas para ajustar a posição."
              role={mode === "cover" && hasEditableImage ? "application" : "img"}
              tabIndex={mode === "cover" && hasEditableImage ? 0 : -1}
              onPointerDown={(event) => {
                if (mode !== "cover" || !imageRef.current) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = {
                  pointerId: event.pointerId,
                  point: { x: event.clientX, y: event.clientY },
                  offset,
                };
              }}
              onPointerMove={(event) => {
                if (!dragRef.current || !imageRef.current) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const scale = PREVIEW_SIZE / rect.width;
                const nextOffset = clampOffset(imageRef.current, zoom, {
                  x: dragRef.current.offset.x + (event.clientX - dragRef.current.point.x) * scale,
                  y: dragRef.current.offset.y + (event.clientY - dragRef.current.point.y) * scale,
                });
                setOffset(nextOffset);
                redraw("cover", zoom, nextOffset);
              }}
              onPointerUp={(event) => {
                if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
              }}
              onPointerCancel={() => { dragRef.current = null; }}
              onKeyDown={(event) => {
                if (mode !== "cover" || !imageRef.current) return;
                const movement: Record<string, Point> = {
                  ArrowLeft: { x: -8, y: 0 },
                  ArrowRight: { x: 8, y: 0 },
                  ArrowUp: { x: 0, y: -8 },
                  ArrowDown: { x: 0, y: 8 },
                };
                const delta = movement[event.key];
                if (!delta) return;
                event.preventDefault();
                const nextOffset = clampOffset(imageRef.current, zoom, {
                  x: offset.x + delta.x,
                  y: offset.y + delta.y,
                });
                setOffset(nextOffset);
                redraw("cover", zoom, nextOffset);
              }}
            />
            {!hasEditableImage ? (
              <span className="pointer-events-none absolute inset-0 grid place-items-center text-xs font-bold text-[var(--bb-muted)]">
                Sem logótipo
              </span>
            ) : null}
          </div>
          <span className="text-center text-xs font-bold text-[var(--bb-muted)]">
            Esta é a versão final em formato quadrado.
          </span>
        </div>

        <div className="grid content-start gap-4">
          <label className="grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]">
            Escolher imagem
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="bb-input cursor-pointer text-sm font-medium file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--bb-black)] file:px-3 file:py-1.5 file:text-xs file:font-extrabold file:text-white"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                if (sourceObjectUrlRef.current) URL.revokeObjectURL(sourceObjectUrlRef.current);
                sourceObjectUrlRef.current = URL.createObjectURL(file);
                loadSource(sourceObjectUrlRef.current, true);
              }}
            />
          </label>

          {hasEditableImage ? (
            <>
              <div className="grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]">
                Enquadramento
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["contain", "Logo inteiro"],
                    ["cover", "Preencher e recortar"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`min-h-10 rounded-xl border px-3 text-xs font-extrabold transition ${mode === value ? "border-[var(--bb-black)] bg-[var(--bb-black)] text-white" : "border-[var(--bb-border)] bg-white text-[var(--bb-muted)]"}`}
                      onClick={() => {
                        setMode(value);
                        setZoom(1);
                        setOffset({ x: 0, y: 0 });
                        redraw(value, 1, { x: 0, y: 0 });
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {mode === "cover" ? (
                <label className="grid gap-2 text-sm font-bold text-[var(--bb-charcoal)]">
                  Zoom <span className="font-semibold text-[var(--bb-muted)]">{zoom.toFixed(1)}×</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={zoom}
                    className="accent-[var(--bb-black)]"
                    onChange={(event) => {
                      if (!imageRef.current) return;
                      const nextZoom = Number(event.currentTarget.value);
                      const nextOffset = clampOffset(imageRef.current, nextZoom, offset);
                      setZoom(nextZoom);
                      setOffset(nextOffset);
                      redraw("cover", nextZoom, nextOffset);
                    }}
                  />
                  <span className="text-xs font-semibold text-[var(--bb-muted)]">Arrasta diretamente a imagem para a posicionar.</span>
                </label>
              ) : null}
            </>
          ) : null}

          <input type="hidden" name="logo_url" value={currentLogoUrl ?? ""} />
          {currentLogoUrl ? (
            <label className="flex items-center gap-2 text-xs font-bold text-[var(--bb-muted)]">
              <input
                name="remove_logo"
                type="checkbox"
                checked={removeLogo}
                className="size-4 accent-[var(--bb-black)]"
                onChange={(event) => {
                  setRemoveLogo(event.currentTarget.checked);
                  if (event.currentTarget.checked) {
                    imageRef.current = null;
                    setHasEditableImage(false);
                    canvasRef.current?.getContext("2d")?.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
                  } else if (currentLogoUrl) {
                    loadSource(currentLogoUrl, false);
                  }
                }}
              />
              Remover o logótipo atual
            </label>
          ) : null}
        </div>
      </div>
      <div className="grid gap-1 text-xs font-semibold text-[var(--bb-muted)]">
        <span>Uso na aplicação: avatares quadrados de 32–64 px. Uso no PDF: 44 × 44 pt.</span>
        <span>Recomendado: PNG ou WebP com fundo transparente, 1024 × 1024 px (mínimo 512 × 512 px), até 2 MB.</span>
      </div>
    </fieldset>
  );
}
