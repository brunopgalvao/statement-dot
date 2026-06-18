import { useEffect, useState } from "react";
import { useStore, sdk, type OnboardStep } from "@/state/store";
import { VerifiedStamp } from "@/components/VerifiedStamp";
import { CheckSeal } from "@/components/icons";

const order: OnboardStep[] = ["pop", "handle", "record", "done"];

export function Onboarding() {
  const { onboard } = useStore();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [step, setStep] = useState<OnboardStep | null>(null);
  const [error, setError] = useState("");
  // The dotNS name the signed-in account actually owns (from the Host). When
  // present it IS the handle — you can't invent one, so nobody can claim a name
  // they don't own.
  const [ownedName, setOwnedName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    sdk.signer
      .getUserId()
      .then((u) => {
        if (cancelled || !u?.primaryUsername) return;
        const full = u.primaryUsername.endsWith(".dot")
          ? u.primaryUsername
          : `${u.primaryUsername}.dot`;
        setOwnedName(full);
        setDisplayName((d) => d || full.replace(/\.dot$/, ""));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const busy = step !== null && step !== "done";
  const typedHandle = handle.trim().replace(/\.dot$/, "").replace(/[^a-z0-9_-]/gi, "");
  const effectiveHandle = ownedName ? ownedName.replace(/\.dot$/, "") : typedHandle;
  const ready = effectiveHandle.length >= 2 && displayName.trim().length >= 1;

  const STEPS: { id: OnboardStep; title: string; sub: string }[] = [
    { id: "pop", title: "Prove personhood", sub: "One Ring-VRF proof in the Polkadot App" },
    {
      id: "handle",
      title: ownedName ? "Use your .dot" : "Claim your .dot",
      sub: ownedName ? "The dotNS name you already own" : "Register a human-readable name via dotNS",
    },
    { id: "record", title: "Sign the record", sub: "Badge written to the social contract" },
  ];

  async function attest() {
    if (!ready || busy) return;
    setError("");
    try {
      await onboard(
        { handle: effectiveHandle, displayName: displayName.trim(), bio: bio.trim() },
        setStep
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep(null);
    }
  }

  const idx = step ? order.indexOf(step) : -1;

  return (
    <div className="onboard">
      <form
        className="affidavit"
        onSubmit={(e) => {
          e.preventDefault();
          attest();
        }}
      >
        <div className="affidavit__seal">
          <VerifiedStamp large />
        </div>

        <div className="affidavit__kicker">Public Record · No. 0001</div>
        <h1 className="affidavit__title">
          A network of<br />
          humans<span className="dot">.</span>
        </h1>
        <p className="affidavit__lede">"I attest that I am one human, and only one."</p>

        <div className="field">
          <label>Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What should people call you?"
            disabled={busy}
            autoFocus
          />
        </div>

        {ownedName ? (
          <div className="field">
            <label>
              Your dotNS identity <span style={{ color: "var(--verify)" }}>· you own this</span>
            </label>
            <div className="field__owned">
              <span>{ownedName}</span>
              <CheckSeal className="" />
            </div>
          </div>
        ) : (
          <div className="field field--handle">
            <label>Your handle</label>
            <input
              value={typedHandle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="the-dot-name-you-own"
              disabled={busy}
            />
            <span className="suffix">.dot</span>
          </div>
        )}

        <div className="field">
          <label>One line about you (optional)</label>
          <input
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Verified carbon-based lifeform."
            disabled={busy}
          />
        </div>

        <div className="steps">
          {STEPS.map((s, i) => {
            const done = idx > i || step === "done";
            const active = step === s.id;
            return (
              <div className="step" key={s.id} data-done={done} data-active={active}>
                <span className="step__num">{done ? "✓" : i + 1}</span>
                <div className="step__txt">
                  <b>{s.title}</b>
                  <span>{active ? "Working…" : s.sub}</span>
                </div>
                {active && (
                  <span
                    className="spinner"
                    style={{
                      borderTopColor: "var(--magenta)",
                      borderColor: "var(--magenta-wash)",
                      borderTopWidth: 2,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ color: "var(--magenta-deep)", fontSize: 12, marginBottom: 12, textAlign: "center" }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn btn--magenta affidavit__sign" disabled={!ready || busy}>
          {busy ? <span className="spinner" /> : `Attest & enter as ${effectiveHandle || "…"}.dot`}
        </button>

        <p className="affidavit__fine">
          Personhood is proven on your phone. statement.dot uses the <b>.dot name you already own</b>
          {" "}— and your per-app alias can't be linked to your activity on other Products.
        </p>
      </form>
    </div>
  );
}
