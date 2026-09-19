import { highlightMatches } from '@/lib/ops/search-text';

export default function OpsHighlight({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  const spans = highlightMatches(text, query);
  return (
    <>
      {spans.map((span, index) =>
        span.match ? (
          <mark key={`${index}-${span.text}`} className="rounded-sm bg-codiva-primary/15 text-inherit">
            {span.text}
          </mark>
        ) : (
          <span key={`${index}-${span.text}`}>{span.text}</span>
        )
      )}
    </>
  );
}
