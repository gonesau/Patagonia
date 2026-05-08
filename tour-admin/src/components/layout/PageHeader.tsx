export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-4 sm:mb-6">
      <h1 className="font-heading text-2xl text-textDark sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-neutral">{description}</p>
    </header>
  );
}
