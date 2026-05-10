"use client";

const EMOJIS = [
  "💰", "💵", "💸", "💴", "💶", "💷", "🪙", "🏦",
  "💳", "💼", "📈", "📊", "🧾", "🎁", "🏠", "🏢",
  "🛒", "🍔", "☕", "🚗", "✈️", "🎬", "🎮", "📱",
  "💻", "🎨", "🎤", "🎓", "🩺", "🐾", "🌱", "⚡",
  "🛠️", "📦", "🧑‍💻", "🧑‍🏫", "🧑‍🍳", "🧑‍🎨", "👜", "💎"
];

export function EmojiPicker({
  value,
  onChange
}: {
  value: string;
  onChange: (e: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {EMOJIS.map(e => {
        const active = e === value;
        return (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={`aspect-square rounded-xl text-xl grid place-items-center transition ${
              active ? "bg-ink text-paper" : "bg-chip hover:bg-line"
            }`}
            aria-label={`emoji ${e}`}
          >
            <span>{e}</span>
          </button>
        );
      })}
    </div>
  );
}
