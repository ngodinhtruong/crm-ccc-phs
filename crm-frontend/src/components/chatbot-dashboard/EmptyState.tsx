export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
      {message}
    </div>
  );
}