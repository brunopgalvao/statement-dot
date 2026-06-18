import { useState } from "react";
import { useStore } from "@/state/store";
import { Avatar } from "./Avatar";

export function Composer() {
  const { session, post, activeChannel } = useStore();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!session) return null;

  const long = text.length > 280;
  const empty = text.trim().length === 0;

  async function submit() {
    if (empty || busy) return;
    setBusy(true);
    try {
      await post({ body: text.trim(), channel: activeChannel ?? "home" });
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="composer">
      <Avatar name={session.profile.displayName} hue={session.profile.avatarHue} />
      <div className="composer__body">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={activeChannel ? `Make a statement in #${activeChannel}…` : "Put it on the record…"}
          rows={2}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
          }}
        />
        <div className="composer__foot">
          <div className="composer__meta">
            <span>
              signing as <b style={{ color: "var(--magenta-deep)" }}>{session.profile.handle}</b>
            </span>
            <span className="composer__count" data-long={long}>
              {long ? "→ Bulletin Chain" : `${text.length}/280`}
            </span>
          </div>
          <button className="btn btn--magenta" onClick={submit} disabled={empty || busy}>
            {busy ? <span className="spinner" /> : "Sign & Gossip"}
          </button>
        </div>
      </div>
    </div>
  );
}
