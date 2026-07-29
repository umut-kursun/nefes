export default function Loading() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-[#F4F7F5]"
      role="status"
      aria-label="Yükleniyor"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/25 border-t-primary" />
    </div>
  );
}
