import { useState } from "react";
import { useStore } from "@/state/store";
import { Avatar } from "../Avatar";
import { VerifiedStamp } from "../VerifiedStamp";
import type { RoomKind } from "@/sdk";

const GROUP_KINDS: { kind: RoomKind; label: string; hint: string }[] = [
  { kind: "group", label: "Group", hint: "Small private chat" },
  { kind: "supergroup", label: "Supergroup", hint: "Large open chat" },
  { kind: "channel", label: "Channel", hint: "Broadcast — only you post" },
];

export function NewChat({ onClose }: { onClose: () => void }) {
  const { profiles, session, startChat, createGroup } = useStore();
  const me = session?.pop.alias;
  const people = Object.values(profiles).filter((p) => p.alias !== me);
  const [tab, setTab] = useState<"dm" | "group">("dm");
  const [handle, setHandle] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<RoomKind>("group");
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function doDM(alias: string) {
    setBusy(true);
    setErr("");
    const id = await startChat(alias);
    setBusy(false);
    if (id) onClose();
    else setErr("Couldn't find that .dot handle.");
  }

  async function doGroup() {
    if (!title.trim() || members.size === 0) return;
    setBusy(true);
    await createGroup({ kind, members: [...members], title: title.trim() });
    setBusy(false);
    onClose();
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3>New chat</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="modal__tabs">
          <button className={tab === "dm" ? "is-on" : ""} onClick={() => setTab("dm")}>Direct</button>
          <button className={tab === "group" ? "is-on" : ""} onClick={() => setTab("group")}>Group / Channel</button>
        </div>

        {tab === "dm" ? (
          <>
            <div className="field">
              <label>Start a DM by .dot handle</label>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handle.trim() && doDM(handle.trim())}
                placeholder="alice.dot"
                autoFocus
              />
            </div>
            {err && <div className="modal__err">{err}</div>}
            <div className="modal__people">
              {people.map((p) => (
                <button key={p.alias} className="modal__person" onClick={() => doDM(p.alias)}>
                  <Avatar name={p.displayName} hue={p.avatarHue} size={36} />
                  <div>
                    <div className="who__name">{p.displayName} {p.human && <VerifiedStamp />}</div>
                    <div className="who__handle">{p.handle}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="modal__kinds">
              {GROUP_KINDS.map((k) => (
                <button
                  key={k.kind}
                  className={`modal__kind${kind === k.kind ? " is-on" : ""}`}
                  onClick={() => setKind(k.kind)}
                >
                  <b>{k.label}</b>
                  <span>{k.hint}</span>
                </button>
              ))}
            </div>
            <div className="field">
              <label>Name</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Polkadot Builders" />
            </div>
            <label className="modal__sub">Add verified humans</label>
            <div className="modal__people">
              {people.map((p) => {
                const on = members.has(p.alias);
                return (
                  <button
                    key={p.alias}
                    className={`modal__person${on ? " is-on" : ""}`}
                    onClick={() =>
                      setMembers((s) => {
                        const n = new Set(s);
                        n.has(p.alias) ? n.delete(p.alias) : n.add(p.alias);
                        return n;
                      })
                    }
                  >
                    <Avatar name={p.displayName} hue={p.avatarHue} size={36} />
                    <div>
                      <div className="who__name">{p.displayName}</div>
                      <div className="who__handle">{p.handle}</div>
                    </div>
                    <span className="modal__check">{on ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>
            <button
              className="btn btn--magenta modal__create"
              onClick={doGroup}
              disabled={busy || !title.trim() || members.size === 0}
            >
              Create {kind}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
