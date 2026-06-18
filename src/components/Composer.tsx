import { useState } from "react";
import { useStore } from "@/state/store";
import { Avatar } from "./Avatar";
import { Pin } from "./icons";

export function Composer() {
  const { session, post, activeChannel } = useStore();
  const [text, setText] = useState("");
  const [pin, setPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!session) return null;

  const long = text.length > 280;
  const empty = text.trim().length === 0;
  const durable = pin || long;

  async function submit() {
    if (empty || busy) return;
    setBusy(true);
    setError("");
    try {
      await post({ body: text.trim(), channel: activeChannel ?? "home", pin });
      setText("");
      setPin(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        /allowance/i.test(msg)
          ? "Couldn't publish — no signing allowance set. Approve the allowance request on your phone, then retry."
          : `Couldn't publish: ${msg}`
      );
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
            <button
              type="button"
              className={`pintoggle${durable ? " is-on" : ""}`}
              onClick={() => setPin((p) => !p)}
              disabled={long}
              title={
                long
                  ? "Long posts always pin to the Bulletin Chain"
                  : "Pin this statement to the Bulletin Chain (durable, survives gossip TTL)"
              }
            >
              <Pin /> {durable ? "Durable" : "Pin to record"}
            </button>
            <span className="composer__count" data-long={long}>
              {long ? "→ Bulletin Chain" : `${text.length}/280`}
            </span>
          </div>
          <button className="btn btn--magenta" onClick={submit} disabled={empty || busy}>
            {busy ? <span className="spinner" /> : "Sign & Gossip"}
          </button>
        </div>
        {error && <div className="composer__error">{error}</div>}
      </div>
    </div>
  );
}
