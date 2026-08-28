type IconName =
  | "box"
  | "chart"
  | "chevron-right"
  | "clipboard"
  | "close"
  | "download"
  | "file"
  | "menu"
  | "money"
  | "people"
  | "plus"
  | "printer"
  | "receipt"
  | "settings"
  | "shopping-cart"
  | "sign-out"
  | "warning";

const paths: Record<IconName, string> = {
  box: "M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9ZM12 12l8-4.5M12 12v9M4 7.5 12 12",
  chart: "M4 19V5m0 14h16M8 16v-4m4 4V8m4 8V5",
  "chevron-right": "m9 6 6 6-6 6",
  clipboard: "M9 5h6m-8 0H6v15h12V5h-1M9 3h6v4H9V3Zm0 8h6m-6 4h4",
  close: "M6 6l12 12M18 6 6 18",
  download: "M12 3v12m0 0 4-4m-4 4-4-4M4 20h16",
  file: "M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6m-6 4h6",
  menu: "M4 6h16M4 12h16M4 18h16",
  money: "M3 7h18v10H3V7Zm3 3h.01M18 14h.01M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
  people: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20m6-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm5-5h1a3 3 0 0 1 3 3m-1 11v-1.5a3.5 3.5 0 0 0-2-3.18",
  plus: "M12 5v14M5 12h14",
  printer: "M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M6 14h12v7H6v-7Z",
  receipt: "M5 3h14v18l-3-2-4 2-4-2-3 2V3Zm3 5h8m-8 4h8m-8 4h5",
  settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5a7.7 7.7 0 0 0-.1-1l2-1.5-2-3.4-2.3.9a8 8 0 0 0-1.7-1L15 3.6h-4l-.3 2.4a8 8 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a8 8 0 0 0 1.7 1l.3 2.4h4l.3-2.4a8 8 0 0 0 1.7-1l2.3.9 2-3.4-2-1.5c.1-.3.1-.7.1-1Z",
  "shopping-cart": "M3 4h2l2.2 10.3A2 2 0 0 0 9.2 16H17a2 2 0 0 0 1.9-1.4L21 8H6M10 20h.01M17 20h.01",
  "sign-out": "M10 5H5v14h5m5-4 4-3-4-3m4 3H9",
  warning: "M12 4 21 20H3L12 4Zm0 5v5m0 3h.01",
};

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg aria-hidden="true" className="shrink-0" fill="none" height={size} viewBox="0 0 24 24" width={size} xmlns="http://www.w3.org/2000/svg">
      <path d={paths[name]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}