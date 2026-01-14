import { messages as m } from '@/lib/i18n';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        {/* Animated Logo/Spinner */}
        <div className="relative mx-auto w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-gray-700" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
        </div>

        {/* Loading Text */}
        <h2 className="text-xl font-semibold text-white mb-2">{m.loadingStates.loading}</h2>
        <p className="text-gray-400 text-sm">{m.loadingStates.pleaseWait}</p>
      </div>
    </div>
  );
}
