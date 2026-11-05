import { statusTone, type Tone } from "@/lib/purchase";

const TONE_STYLES: Record<Tone, [string, string]> = {
  amber: ["bg-amber-50 text-amber-700 ring-amber-600/20", "bg-amber-500"],
  blue: ["bg-blue-50 text-blue-700 ring-blue-600/20", "bg-blue-500"],
  green: ["bg-green-50 text-green-700 ring-green-600/20", "bg-green-500"],
  red: ["bg-red-50 text-red-700 ring-red-600/20", "bg-red-500"],
  gray: ["bg-gray-50 text-gray-600 ring-gray-500/20", "bg-gray-400"],
};

export default function StatusBadge({ status, label }: { status: string; label: string }) {
  const [box, dot] = TONE_STYLES[statusTone(status)];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${box}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
