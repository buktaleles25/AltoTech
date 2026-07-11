export function Toast({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-32 z-50 flex justify-center px-4">
      <div className="animate-pop max-w-sm rounded-3xl bg-lav-500/95 px-4 py-2.5 text-center text-sm font-bold text-white shadow-lg">
        {message}
      </div>
    </div>
  )
}
