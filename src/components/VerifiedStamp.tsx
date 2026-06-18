import { CheckSeal } from "./icons";

export function VerifiedStamp({ large = false }: { large?: boolean }) {
  return (
    <span
      className={large ? "stamp stamp--lg" : "stamp"}
      title="Proof of Personhood verified — a unique human, recorded on-chain"
    >
      <CheckSeal />
      {large ? "Verified Human" : "Human"}
    </span>
  );
}
