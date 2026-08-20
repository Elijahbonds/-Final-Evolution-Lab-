import { useCallback, useRef, useState } from 'react';

/**
 * DualShock / Xbox overlay. Face + shoulders only.
 * A / R2 = run. X / L1 = commit window. Stick = hang style.
 * Y / B / L2 / R1 are pad faces — no extra sport. Letters only, no dashboard chrome.
 */
type OverlayProps = {
  onHoldDown: () => void;
  onHoldUp: () => void;
  onPlantDown: () => void;
  onPlantUp: () => void;
  onSteer: (x: number, y: number) => void;
};

const STICK_R = 48;

export function EmulatorPadOverlay({ onHoldDown, onHoldUp, onPlantDown, onPlantUp, onSteer }: OverlayProps) {
  const stickRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const applyStick = useCallback(
    (clientX: number, clientY: number) => {
      const el = stickRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const nx = (clientX - cx) / STICK_R;
      const ny = (clientY - cy) / STICK_R;
      const mag = Math.hypot(nx, ny);
      const clamped = mag > 1 ? 1 / mag : 1;
      const x = nx * clamped;
      const y = ny * clamped;
      setKnob({ x: x * STICK_R, y: y * STICK_R });
      onSteer(x, y);
    },
    [onSteer],
  );

  const endStick = useCallback(() => {
    dragging.current = false;
    setKnob({ x: 0, y: 0 });
    onSteer(0, 0);
  }, [onSteer]);

  return (
    <div className="emulator-pad pointer-events-none" data-testid="venice-emulator-pad" style={{ zIndex: 40 }}>
      <div className="emulator-pad-left pointer-events-auto">
        <div className="emulator-shoulders">
          <Shoulder face="L2" />
          <Shoulder face="L1" down={onPlantDown} up={onPlantUp} ariaLabel="plant" />
        </div>
        <div
          ref={stickRef}
          className="emulator-stick-base touch-none select-none"
          data-testid="venice-stick"
          aria-label="joystick"
          role="slider"
          aria-valuemin={-1}
          aria-valuemax={1}
          aria-valuenow={Math.round((knob.x / STICK_R) * 100) / 100}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            applyStick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!dragging.current) return;
            applyStick(e.clientX, e.clientY);
          }}
          onPointerUp={endStick}
          onPointerCancel={endStick}
        >
          <div className="emulator-dpad" aria-hidden="true">
            <span className="emulator-dpad-arm emulator-dpad-n" />
            <span className="emulator-dpad-arm emulator-dpad-s" />
            <span className="emulator-dpad-arm emulator-dpad-e" />
            <span className="emulator-dpad-arm emulator-dpad-w" />
          </div>
          <div className="emulator-stick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
        </div>
      </div>

      <div className="emulator-pad-right pointer-events-auto">
        <div className="emulator-shoulders">
          <Shoulder face="R1" />
          <Shoulder face="R2" down={onHoldDown} up={onHoldUp} ariaLabel="hold" />
        </div>
        <div className="emulator-abxy">
          <div className="emulator-abxy-y">
            <Face letter="Y" color="rgba(220, 196, 64, 0.28)" />
          </div>
          <div className="emulator-abxy-x">
            <Face letter="X" color="rgba(80, 140, 220, 0.42)" down={onPlantDown} up={onPlantUp} ariaLabel="plant" />
          </div>
          <div className="emulator-abxy-b">
            <Face letter="B" color="rgba(210, 72, 72, 0.28)" />
          </div>
          <div className="emulator-abxy-a">
            <Face letter="A" color="rgba(72, 196, 118, 0.42)" down={onHoldDown} up={onHoldUp} ariaLabel="hold" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Shoulder({
  face,
  down,
  up,
  ariaLabel,
}: {
  face: string;
  down?: () => void;
  up?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? face.toLowerCase()}
      className="emulator-face-btn emulator-shoulder-btn"
      onPointerDown={(e) => {
        e.preventDefault();
        down?.();
      }}
      onPointerUp={() => up?.()}
      onPointerLeave={() => up?.()}
    >
      <span className="emulator-face-letter">{face}</span>
    </button>
  );
}

function Face({
  letter,
  color,
  down,
  up,
  ariaLabel,
}: {
  letter: string;
  color: string;
  down?: () => void;
  up?: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? letter.toLowerCase()}
      className="emulator-face-btn"
      style={{ background: color }}
      onPointerDown={(e) => {
        e.preventDefault();
        down?.();
      }}
      onPointerUp={() => up?.()}
      onPointerLeave={() => up?.()}
    >
      <span className="emulator-face-letter">{letter}</span>
    </button>
  );
}
