import { useEffect, useState } from "react";
import { useStore, sdk } from "@/state/store";
import { Avatar } from "@/components/Avatar";
import { VerifiedStamp } from "@/components/VerifiedStamp";

interface Msg {
  mine: boolean;
  text: string;
  cipher: string;
}

// A minimal end-to-end-encrypted DM thread. Every message is encrypted with a
// per-Product key derived via `keys`, sent as an encrypted Statement, and
// decrypted locally — so you can literally see the ciphertext that crosses the
// wire vs. the plaintext you read.
export function Messages() {
  const { session, profiles } = useStore();
  const peer = Object.values(profiles).find((p) => p.alias !== session?.pop.alias);
  const [draft, setDraft] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [showCipher, setShowCipher] = useState(false);

  useEffect(() => {
    if (!session || !peer || msgs.length) return;
    (async () => {
      const greeting = "hey — verified human here. no bots in this DM, promise.";
      const cipher = await sdk.crypto.encrypt(greeting, session.dmKey);
      setMsgs([{ mine: false, text: greeting, cipher }]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, peer]);

  if (!session || !peer) return null;

  async function send() {
    if (!draft.trim() || !session) return;
    const text = draft.trim();
    setDraft("");
    const cipher = await sdk.crypto.encrypt(text, session.dmKey);
    // The encrypted payload is what gossips via the Statement Store (kind: dm).
    await sdk.statements.submit({
      kind: "dm",
      author: session.pop.alias,
      body: cipher,
      target: peer!.alias,
    });
    setMsgs((m) => [...m, { mine: true, text, cipher }]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 58px)" }}>
      <div
        style={{
          padding: "16px 30px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Avatar name={peer.displayName} hue={peer.avatarHue} size={40} />
        <div style={{ flex: 1 }}>
          <div className="who__name">
            {peer.displayName} <VerifiedStamp />
          </div>
          <div className="who__handle">{peer.handle}</div>
        </div>
        <button
          className="who__follow"
          data-on={showCipher}
          onClick={() => setShowCipher((v) => !v)}
        >
          {showCipher ? "Showing ciphertext" : "Show ciphertext"}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 30px", display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.mine ? "flex-end" : "flex-start",
              maxWidth: "72%",
            }}
          >
            <div
              className="serif"
              style={{
                fontSize: 15.5,
                lineHeight: 1.45,
                padding: "10px 14px",
                borderRadius: 14,
                borderBottomRightRadius: m.mine ? 4 : 14,
                borderBottomLeftRadius: m.mine ? 14 : 4,
                background: m.mine ? "var(--ink)" : "var(--paper-card)",
                color: m.mine ? "var(--paper)" : "var(--ink)",
                border: m.mine ? "none" : "1px solid var(--rule)",
              }}
            >
              {showCipher ? (
                <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, wordBreak: "break-all", opacity: 0.85 }}>
                  {m.cipher}
                </code>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "14px 30px", borderTop: "1px solid var(--rule)", display: "flex", gap: 10 }}>
        <input
          className="field"
          style={{
            flex: 1,
            background: "var(--paper)",
            border: "1px solid var(--rule-strong)",
            borderRadius: 9,
            padding: "11px 14px",
            outline: "none",
            fontSize: 15,
          }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Encrypted message…"
        />
        <button className="btn btn--magenta" onClick={send} disabled={!draft.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
