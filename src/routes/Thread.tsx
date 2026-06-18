import { useMemo, useRef, useState } from "react";
import { useStore } from "@/state/store";
import { StatementCard } from "@/components/StatementCard";
import { Avatar } from "@/components/Avatar";

export function Thread({ id }: { id: string }) {
  const { statementById, repliesOf, closeThread, session, feed } = useStore();
  const root = statementById(id);
  const replies = repliesOf(id);
  const now = useMemo(() => (feed[0]?.ts ?? 0) + 1000, [feed]);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  if (!root) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--ink-faint)" }}>
        That statement has decayed from the gossip layer.
        <div style={{ marginTop: 16 }}>
          <button className="btn btn--ghost" onClick={closeThread}>
            Back to the record
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          padding: "12px 30px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button className="thread__back" onClick={closeThread} title="Back">
          ←
        </button>
        <span className="mono-label">Thread</span>
        <span style={{ marginLeft: "auto" }} className="mono-label">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </span>
      </div>

      <div className="thread__root">
        <StatementCard
          s={root}
          now={now}
          linkToThread={false}
          onReply={() => boxRef.current?.focus()}
        />
      </div>

      {session && <ReplyBox parentId={id} boxRef={boxRef} />}

      <div className="thread__replies">
        {replies.map((r) => (
          <div key={r.id} className="thread__reply">
            <StatementCard s={r} now={now} linkToThread={false} />
          </div>
        ))}
        {replies.length === 0 && (
          <div
            style={{
              padding: "36px 30px",
              textAlign: "center",
              fontFamily: "var(--font-display)",
              fontStyle: "italic",
              color: "var(--ink-faint)",
              fontSize: 16,
            }}
          >
            No replies yet. Be the first human to weigh in.
          </div>
        )}
      </div>
    </div>
  );
}

function ReplyBox({
  parentId,
  boxRef,
}: {
  parentId: string;
  boxRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const { session, reply } = useStore();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  if (!session) return null;

  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await reply(parentId, text.trim());
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="composer" style={{ borderBottom: "1px solid var(--rule)" }}>
      <Avatar name={session.profile.displayName} hue={session.profile.avatarHue} size={40} />
      <div className="composer__body">
        <textarea
          ref={boxRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add to the record…"
          rows={1}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
          }}
        />
        <div className="composer__foot">
          <span className="composer__meta">
            replying as <b style={{ color: "var(--magenta-deep)" }}>{session.profile.handle}</b>
          </span>
          <button className="btn" onClick={send} disabled={!text.trim() || busy}>
            {busy ? <span className="spinner" /> : "Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
