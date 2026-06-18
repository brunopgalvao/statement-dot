import { useState } from "react";
import { useStore } from "@/state/store";
import { LeftRail } from "@/components/LeftRail";
import { RightRail } from "@/components/RightRail";
import { MobileNav } from "@/components/MobileNav";
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
  const { ready, session, threadId, profileAlias, closeThread, closeProfile } = useStore();
  const [view, setView] = useState<View>("home");

  if (!ready) {
    return <div className="boot">resolving statement.dot…</div>;
  }

  if (!session) {
    return <Onboarding />;
  }

  // Threads and viewed profiles overlay the center without changing nav.
  const nav = (v: View) => {
    closeThread();
    closeProfile();
    setView(v);
  };

  const inThread = threadId !== null;
  const inProfile = profileAlias !== null;
  const head = inThread
    ? { title: "The Record", sub: "Thread" }
    : inProfile
      ? { title: "Profile", sub: "Public record" }
      : HEAD[view];

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
        ) : inProfile ? (
          <Profile alias={profileAlias!} />
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
      <MobileNav view={view} setView={nav} />
    </div>
  );
}
