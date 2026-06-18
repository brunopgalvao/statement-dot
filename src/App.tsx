import { useState } from "react";
import { useStore } from "@/state/store";
import { LeftRail } from "@/components/LeftRail";
import { RightRail } from "@/components/RightRail";
import { Onboarding } from "@/routes/Onboarding";
import { Home } from "@/routes/Home";
import { Profile } from "@/routes/Profile";
import { Channels } from "@/routes/Channels";
import { Messages } from "@/routes/Messages";
import { Thread } from "@/routes/Thread";

export type View = "home" | "channels" | "messages" | "profile";

const HEAD: Record<View, { title: string; sub: string }> = {
  home: { title: "The Record", sub: "Signed · gossiped · human" },
  channels: { title: "Channels", sub: "Rooms on the People Chain" },
  messages: { title: "Messages", sub: "End-to-end encrypted" },
  profile: { title: "Profile", sub: "Your public record" },
};

export default function App() {
  const { ready, session, threadId, closeThread } = useStore();
  const [view, setView] = useState<View>("home");

  if (!ready) {
    return <div className="boot">resolving statement.dot…</div>;
  }

  if (!session) {
    return <Onboarding />;
  }

  // Opening a thread doesn't change the nav selection — it overlays the center.
  const nav = (v: View) => {
    closeThread();
    setView(v);
  };

  const inThread = threadId !== null;
  const head = inThread ? { title: "The Record", sub: "Thread" } : HEAD[view];

  return (
    <div className="shell">
      <LeftRail view={view} setView={nav} />

      <main className="center">
        <header className="center__head">
          <div className="center__title">{head.title}</div>
          <div className="center__sub">{head.sub}</div>
        </header>
        {inThread ? (
          <Thread id={threadId!} />
        ) : (
          <>
            {view === "home" && <Home />}
            {view === "channels" && <Channels goHome={nav} />}
            {view === "messages" && <Messages />}
            {view === "profile" && <Profile />}
          </>
        )}
      </main>

      <RightRail />
    </div>
  );
}
