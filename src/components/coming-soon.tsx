import { Sparkles } from "lucide-react";

interface Props {
  title: string;
  description: string;
}

export function ComingSoon({ title, description }: Props) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl rounded-3xl border border-border bg-surface p-10 text-center shadow-sm">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold/15 text-gold">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        <p className="mt-6 inline-block rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Em construção
        </p>
      </div>
    </div>
  );
}
