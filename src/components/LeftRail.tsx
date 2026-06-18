import type { FC } from "react";
import { useStore } from "@/state/store";
import { Hash, Home, Mail, User } from "./icons";
import { Avatar } from "./Avatar";
import type { View } from "@/App";

const HOST_LABEL: Record<string, string> = {
  mock: "Local · Mock",
  desktop: "Polkadot Desktop",
  app: "Polkadot App",
  web: "Polkadot Web",
};

const NAV: { id: View; label: string; icon: FC<{ className?: string }> }[] = [
  { id: "home", label: "The Record", icon: Home },
  { id: "channels", label: "Channels", icon: Hash },
  { id: "messages", label: "Messages", icon: Mail },
  { id: "profile", label: "Profile", icon: User },
];

export function LeftRail({ view, setView }: { view: View; setView: (v: View) => void }) {
  const { session, hostKind, feed, totalUnread } = useStore();

  return (
    <aside className="rail rail--left">
      <button onClick={() => setView("home")} style={{ textAlign: "left" }}>
        <span className="wordmark">
          <b>statement</b>
          <span className="dot">.dot</span>
        </span>
      </button>
      <span className="wordmark__tag">Statements you can verify, from humans you can't fake.</span>

      <nav className="nav">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav__item${view === id ? " nav__item--active" : ""}`}
            onClick={() => setView(id)}
          >
            <span className="nav__dot" />
            <Icon className="" />
            {label}
            {id === "messages" && totalUnread > 0 && (
              <span className="nav__badge">{totalUnread}</span>
            )}
          </button>
        ))}
      </nav>

      {session && (
        <button
          className="who"
          style={{ marginTop: 22, width: "100%" }}
          onClick={() => setView("profile")}
        >
          <Avatar name={session.profile.displayName} hue={session.profile.avatarHue} size={38} />
          <div className="who__main" style={{ textAlign: "left" }}>
            <div className="who__name">{session.profile.displayName}</div>
            <div className="who__handle">{session.profile.handle}</div>
          </div>
        </button>
      )}

      <div className="status">
        <div className="status__row">
          <span>Host</span>
          <b>{HOST_LABEL[hostKind] ?? hostKind}</b>
        </div>
        <div className="status__row">
          <span>People Chain</span>
          <span className="status__live">
            <span className="status__pulse" /> gossip live
          </span>
        </div>
        <div className="status__row">
          <span>On the record</span>
          <b>{feed.length} statements</b>
        </div>
      </div>
    </aside>
  );
}
