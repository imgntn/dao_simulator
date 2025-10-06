# DAO Simulator Dashboard 🌐

A stunning real-time visualization dashboard for decentralized autonomous organization simulations.

## Features

### 🎨 Visualizations

All Python visualizations have been fully ported to modern React/Next.js:

1. **Price Line Chart** - Real-time DAO token price tracking with interactive Recharts
2. **3D Network Graph** - Stunning WebGL-powered network visualization using Three.js
3. **Member Heatmap** - Scatter plot visualization of member reputation vs token balance
4. **Choropleth Map** - Geographic distribution of DAO members
5. **Comprehensive Report** - Statistics, leaderboards, and analytics dashboard

### ⚡ Real-time Updates

- WebSocket integration via Socket.IO for live data streaming
- Automatic network graph updates with delta computation
- Live price charts that update as simulation progresses
- Real-time leaderboard tracking

### 🛠️ Technology Stack

- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **Three.js** - 3D WebGL rendering
- **React Three Fiber** - React renderer for Three.js
- **Recharts** - Composable charting library
- **Socket.IO** - Real-time bidirectional communication
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling

## Getting Started

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

Navigate to [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to view the dashboard.

### Production Build

```bash
npm run build
npm start
```

## Architecture

### Component Structure

```
components/
└── visualizations/
    ├── PriceLineChart.tsx       # Recharts line chart for price history
    ├── MemberHeatmap.tsx        # Scatter plot heatmap
    ├── NetworkGraph3D.tsx       # Three.js 3D network graph
    ├── ChoroplethMap.tsx        # Geographic distribution
    ├── DAOReport.tsx            # Comprehensive analytics
    └── index.ts                 # Barrel exports
```

### Type Definitions

```
lib/
├── types/
│   └── visualization.ts         # TypeScript interfaces
└── hooks/
    └── useSimulationSocket.ts   # WebSocket state management
```

### Pages

```
app/
├── page.tsx                     # Landing page
└── dashboard/
    └── page.tsx                 # Main dashboard
```

## WebSocket Events

The dashboard listens for these events from the Python backend:

- `simulation_step` - New simulation step data
- `network_update` - Network graph updates (nodes/edges)
- `members_update` - Member list updates
- `proposals_update` - Proposal list updates
- `leaderboard_update` - Token/influence rankings
- `market_shock` - Market shock events

## Port Mapping

| Python Visualization | React Component | Technology |
|---------------------|-----------------|------------|
| `line_chart.py` | `PriceLineChart.tsx` | Recharts |
| `interactive_line_chart.py` | `PriceLineChart.tsx` | Recharts (interactive mode) |
| `network_graph.py` | `NetworkGraph3D.tsx` | Three.js |
| `interactive_network.py` | `NetworkGraph3D.tsx` | R3F + OrbitControls |
| `heatmap.py` | `MemberHeatmap.tsx` | Recharts ScatterChart |
| `choropleth_map.py` | `ChoroplethMap.tsx` | Recharts BarChart |
| `report.py` | `DAOReport.tsx` | Recharts + custom UI |

## Features by Component

### PriceLineChart
- Responsive design
- Dark mode support
- Customizable interactive mode
- Smooth animations
- Tooltip on hover

### NetworkGraph3D
- Interactive 3D camera controls
- Auto-rotation when not interactive
- Node clustering for large graphs (LOD)
- Color-coded node types (members, proposals, clusters)
- Edge type visualization (delegation, representative, created)
- Hover effects and scaling
- Optional label display

### MemberHeatmap
- Normalized reputation/token scatter plot
- Color gradient based on composite score
- Interactive tooltips showing raw values
- Responsive layout

### ChoroplethMap
- Horizontal bar chart by location
- Gradient coloring by member count
- Sorted by population

### DAOReport
- Statistics overview cards
- Treasury balance chart
- Top token holders leaderboard
- Most influential members
- Market shock history

## Performance Optimizations

- Memoized chart data transformations
- Delta-based network updates
- WebSocket connection pooling
- Lazy loading of 3D components
- Turbopack for fast builds

## Styling

The dashboard uses a dark theme with gradient accents:
- **Primary**: Blue-Purple gradient
- **Backgrounds**: Gray-900 with transparency
- **Accents**: Blue, Purple, Pink, Green
- **Effects**: Backdrop blur, shadows, animations

## Future Enhancements

- [ ] Additional chart types (radar, sankey, treemap)
- [ ] Export visualizations as PNG/SVG
- [ ] Customizable dashboard layouts
- [ ] Historical data comparison
- [ ] Advanced filtering and search
- [ ] Mobile-optimized views

## Contributing

Built with vision by incredible technologists and artists.

## License

Part of the DAO Simulator project.
