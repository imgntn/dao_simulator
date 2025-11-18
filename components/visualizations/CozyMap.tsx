type CozyMapProps = {
  treasury?: number;
  proposals?: number;
  members?: number;
  shocks?: number;
  status?: 'running' | 'paused' | 'won' | 'lost';
};

type RoomStateLevel = 'healthy' | 'stressed' | 'critical';

type RoomState = {
  id: string;
  title: string;
  description: string;
  level: RoomStateLevel;
  stateLabel: string;
  metricLabel: string;
  metricValue: string;
};

const baseRooms: Array<{ id: 'governance' | 'treasury' | 'devhub' | 'market'; title: string; description: string }> = [
  { id: 'governance', title: 'Governance', description: 'Proposals, voting, and decision throughput.' },
  { id: 'treasury', title: 'Treasury', description: 'Runway, reserves, and capital allocation.' },
  { id: 'devhub', title: 'Delivery', description: 'Builders, contributors, and execution capacity.' },
  { id: 'market', title: 'Market & Risk', description: 'Token behaviour, liquidity, and shocks.' },
];

const levelBadge: Record<RoomStateLevel, string> = {
  healthy: 'bg-green-500/15 text-green-300 border border-green-500/40',
  stressed: 'bg-amber-500/15 text-amber-300 border border-amber-500/40',
  critical: 'bg-red-500/20 text-red-300 border border-red-500/60',
};

export function CozyMap({
  treasury = 0,
  proposals = 0,
  members = 0,
  shocks = 0,
  status = 'paused',
}: CozyMapProps) {
  const rooms: RoomState[] = baseRooms.map((room) => {
    if (room.id === 'treasury') {
      let level: RoomStateLevel = 'healthy';
      let stateLabel = 'Strong runway';
      if (treasury <= 0) {
        level = 'critical';
        stateLabel = 'Treasury insolvent';
      } else if (treasury < 5_000) {
        level = 'stressed';
        stateLabel = 'Runway getting thin';
      }
      return {
        ...room,
        level,
        stateLabel,
        metricLabel: 'Treasury balance',
        metricValue: treasury.toLocaleString('en-US'),
      };
    }

    if (room.id === 'governance') {
      let level: RoomStateLevel = 'healthy';
      let stateLabel = 'Decisions flowing';
      if (proposals >= 40) {
        level = 'critical';
        stateLabel = 'Governance gridlock';
      } else if (proposals >= 15) {
        level = 'stressed';
        stateLabel = 'Decision backlog building';
      }
      return {
        ...room,
        level,
        stateLabel,
        metricLabel: 'Open proposals',
        metricValue: proposals.toLocaleString('en-US'),
      };
    }

    if (room.id === 'devhub') {
      let level: RoomStateLevel = 'healthy';
      let stateLabel = 'Well-staffed delivery';
      if (members < 8) {
        level = 'critical';
        stateLabel = 'Understaffed, at risk';
      } else if (members < 25) {
        level = 'stressed';
        stateLabel = 'Capacity is constrained';
      }
      return {
        ...room,
        level,
        stateLabel,
        metricLabel: 'Active members',
        metricValue: members.toLocaleString('en-US'),
      };
    }

    // market
    let level: RoomStateLevel = 'healthy';
    let stateLabel = 'Calm market';
    if (shocks >= 8) {
      level = 'critical';
      stateLabel = 'Persistent stress regime';
    } else if (shocks >= 3) {
      level = 'stressed';
      stateLabel = 'Elevated volatility';
    }
    return {
      ...room,
      level,
      stateLabel,
      metricLabel: 'Shocks observed',
      metricValue: shocks.toLocaleString('en-US'),
    };
  });

  const simStatusLabel =
    status === 'running' ? 'Simulation running' : status === 'won' ? 'Run complete' : status === 'lost' ? 'Run failed' : 'Simulation paused';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {rooms.map((room) => (
        <div
          key={room.id}
          className="rounded-lg border border-gray-700 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 shadow-lg space-y-3"
        >
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">{room.id}</p>
              <h4 className="text-lg font-semibold text-white">{room.title}</h4>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`px-2 py-0.5 text-[11px] rounded-full ${levelBadge[room.level]}`}>
                {room.stateLabel}
              </span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                {simStatusLabel}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-400">{room.description}</p>
          <div className="mt-2 rounded border border-gray-700 bg-gray-800/60 p-2 text-sm text-gray-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">{room.metricLabel}</p>
              <p className="font-semibold">{room.metricValue}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
