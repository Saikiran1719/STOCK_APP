import { productColor, productInitial } from "@/lib/productColor";

export default function ProductAvatar({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const { bg, text } = productColor(name);
  const dims = size === "md" ? "h-9 w-9 text-sm" : "h-7 w-7 text-xs";
  return (
    <span
      className={`inline-flex ${dims} shrink-0 items-center justify-center rounded-full font-semibold ${bg} ${text}`}
      aria-hidden
    >
      {productInitial(name)}
    </span>
  );
}
