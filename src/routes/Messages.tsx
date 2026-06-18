import { useState } from "react";
import { useStore } from "@/state/store";
import { ChatList } from "@/components/chat/ChatList";
import { Conversation } from "@/components/chat/Conversation";
import { NewChat } from "@/components/chat/NewChat";

// A Telegram-style messenger, unified into statement.dot. Two-pane on desktop
// (chat list + conversation), stacked on mobile (list ↔ conversation). Every
// contact is a verified human — DMs, groups, supergroups, and channels.
export function Messages() {
  const { activeRoomId } = useStore();
  const [newChat, setNewChat] = useState(false);

  return (
    <div className="messenger" data-open={activeRoomId ? "true" : "false"}>
      <ChatList onNewChat={() => setNewChat(true)} />
      <Conversation />
      {newChat && <NewChat onClose={() => setNewChat(false)} />}
    </div>
  );
}
