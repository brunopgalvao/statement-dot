import type { CSSProperties } from "react";
import { initials } from "@/lib/format";

export function Avatar({
  name,
  hue,
  size = 44,
}: {
  name: string;
  hue: number;
  size?: number;
}) {
  return (
    <div
      className="avatar"
      style={
        {
          width: size,
          height: size,
          fontSize: size * 0.38,
          "--hue": hue,
        } as CSSProperties
      }
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
