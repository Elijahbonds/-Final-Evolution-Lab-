import React, { useCallback, useRef, useState } from 'react';

/**
 * RetroArch / Delta / phone-emulator controller overlay.
 * Translucent analog stick + ABXY cluster sit ON the 3D canvas.
 * Always visible — the parent must never gate this behind Mixamo `ready`.
 */

export interface EmulatorPadOverlayProps {
  onStick: (x: number, y: number) => void;
  onHoldDown: () => void;
  onHoldUp: () => void;
  onPlantDown: () => void;
  onDunkDown: () => void;
}

const STICK_RADIUS = 54;

function FaceButton({
  label,
  letter,
  color,
  ariaLabel,
  onDown,
  onUp,
}: {
  label: string;
  letter: string;
  color: string;
  ariaLabel: string;
  onDown?: () => void;
  onUp?: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
        setPressed(true);
        onDown?.();
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        setPressed(false);
        onUp?.();
      }}
      onPointerCancel={() => {
        setPressed(false);
        onUp?.();
      }}
      className="emulator-face-btn touch-none select-none"
      style={{
        background: pressed ? color.replace(/[\d.]+\)$/, '0.55)') : color,
        transform: pressed ? 'scale(0.92)' : 'scale(1)',
        boxShadow: pressed
          ? 'inset 0 0 10px rgba(255,255,255,0.25)'
          : 'inset 0 1px 0 rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.35)',
      }}
    >
      <span className="emulator-face-letter">{letter}</span>
      <span className="emulator-face-label">{label}</span>
    </button>
  );
}

export const EmulatorPadOverlay: React.FC<EmulatorPadOverlayProps> = ({
  onStick,
  onHoldDown,
  onHoldUp,
  onPlantDown,
  onDunkDown,
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const applyStick = useCallback(
    (clientX: number, clientY: number) => {
      const el = baseRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const mag = Math.hypot(dx, dy);
      if (mag > STICK_RADIUS) {
        dx = (dx / mag) * STICK_RADIUS;
        dy = (dy / mag) * STICK_RADIUS;
      }
      setKnob({ x: dx, y: dy });
      onStick(dx / STICK_RADIUS, dy / STICK_RADIUS);
    },
    [onStick]
  );

  const resetStick = useCallback(() => {
    draggingRef.current = false;
    setKnob({ x: 0, y: 0 });
    onStick(0, 0);
  }, [onStick]);

  return (
    <div className="emulator-pad pointer-events-none" data-testid="emulator-pad" style={{ zIndex: 40 }}>
      <div className="emulator-pad-left pointer-events-auto">
        <div
          ref={baseRef}
          className="emulator-stick-base touch-none select-none"
          aria-label="joystick"
          role="slider"
          aria-valuemin={-1}
          aria-valuemax={1}
          aria-valuenow={Math.round(knob.x * 100) / 100}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            draggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            applyStick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) return;
            applyStick(e.clientX, e.clientY);
          }}
          onPointerUp={resetStick}
          onPointerCancel={resetStick}
        >
          <div className="emulator-dpad" aria-hidden="true">
            <span className="emulator-dpad-arm emulator-dpad-n" />
            <span className="emulator-dpad-arm emulator-dpad-s" />
            <span className="emulator-dpad-arm emulator-dpad-e" />
            <span className="emulator-dpad-arm emulator-dpad-w" />
          </div>
          <div
            className="emulator-stick-knob"
            style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
          />
        </div>
        <span className="emulator-pad-caption">STICK</span>
      </div>

      <div className="emulator-pad-right pointer-events-auto">
        <div className="emulator-abxy">
          <div className="emulator-abxy-y">
            <FaceButton
              letter="Y"
              label="DUNK"
              ariaLabel="dunk"
              color="rgba(220, 196, 64, 0.38)"
              onDown={onDunkDown}
            />
          </div>
          <div className="emulator-abxy-x">
            <FaceButton
              letter="X"
              label=""
              ariaLabel="face-x"
              color="rgba(80, 140, 220, 0.18)"
            />
          </div>
          <div className="emulator-abxy-b">
            <FaceButton
              letter="B"
              label="PLANT"
              ariaLabel="plant"
              color="rgba(210, 72, 72, 0.38)"
              onDown={onPlantDown}
            />
          </div>
          <div className="emulator-abxy-a">
            <FaceButton
              letter="A"
              label="HOLD"
              ariaLabel="hold"
              color="rgba(72, 196, 118, 0.42)"
              onDown={onHoldDown}
              onUp={onHoldUp}
            />
          </div>
        </div>
        <span className="emulator-pad-caption">HOLD · PLANT · DUNK</span>
      </div>
    </div>
  );
};
