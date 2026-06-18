import type { FC } from "react";
import { useStore } from "@/state/store";
import { Hash, Home, Mail, User } from "./icons";
import type { View } from "@/App";

const ITEMS: { id: View; label: string; icon: FC<{ className?: string }> }[] = [
  { id: "home", label: "Record", icon: Home },
  { id: "channels", label: "Channels", icon: Hash },
  { id: "messages", label: "Messages", icon: Mail },
  { id: "profile", label: "Profile", icon: User },
];

// Bottom tab bar for phones — the left rail is hidden at narrow widths, so this
// is the only navigation on mobile. `active` reflects overlays too (a viewed
// thread/profile keeps "Record"/"Profile" highlighted).
export function MobileNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  const { threadId, profileAlias } = useStore();
  const active = threadId ? "home" : profileAlias ? "profile" : view;

  return (
    <nav className="mobilenav">
      {ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`mobilenav__item${active === id ? " is-active" : ""}`}
          onClick={() => setView(id)}
        >
          <Icon className="" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
