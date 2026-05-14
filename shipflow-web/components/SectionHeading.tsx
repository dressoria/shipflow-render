type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow ? (
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#FF1493]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}
