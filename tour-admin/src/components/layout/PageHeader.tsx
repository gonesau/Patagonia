export function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-6">
      <h1 className="font-heading text-3xl text-textDark">{title}</h1>
      <p className="mt-1 text-sm text-neutral">{description}</p>
    </header>
  );
}
