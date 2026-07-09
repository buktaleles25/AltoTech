export type NewsItemData = {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string | null;
  publishedAt: Date | string;
};

export default function NewsFeedItem({ item }: { item: NewsItemData }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-border-subtle bg-surface p-3 transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between text-[10px] text-text-muted">
        <span>{item.source}</span>
        <span>{new Date(item.publishedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-text-primary">{item.title}</p>
      {item.summary && <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{item.summary}</p>}
    </a>
  );
}
