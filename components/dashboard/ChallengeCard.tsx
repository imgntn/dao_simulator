'use client';

interface ChallengeConfig {
  seed?: number;
  [key: string]: unknown;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  config: ChallengeConfig;
}

interface ChallengeCardProps {
  challenges: Challenge[];
  onStartChallenge: (config: ChallengeConfig, challengeId: string) => void;
}

export function ChallengeCard({ challenges, onStartChallenge }: ChallengeCardProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {challenges.map((challenge) => (
        <div
          key={challenge.id}
          className="p-4 rounded-lg border border-purple-600/50 bg-purple-900/10 text-gray-100 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-purple-300">
                {challenge.id.toUpperCase()}
              </p>
              <h4 className="font-semibold">{challenge.name}</h4>
            </div>
            <button
              className="px-3 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
              onClick={() => onStartChallenge(challenge.config, challenge.id)}
            >
              Start challenge
            </button>
          </div>
          <p className="text-sm text-gray-300">{challenge.description}</p>
        </div>
      ))}
    </section>
  );
}
