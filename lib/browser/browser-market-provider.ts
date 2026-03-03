/**
 * Browser Market Provider
 *
 * Stores bundled market time series data in memory
 * and provides per-DAO lookup for the simulation.
 */

export class BrowserMarketProvider {
  private data: Record<string, Array<{ step: number; price: number }>>;

  constructor(data: Record<string, Array<{ step: number; price: number }>>) {
    this.data = data;
  }

  getTimeSeries(daoId: string): Array<{ step: number; price: number }> {
    return this.data[daoId] ?? [];
  }

  hasData(daoId: string): boolean {
    return daoId in this.data;
  }

  listAvailableIds(): string[] {
    return Object.keys(this.data);
  }

  /** Get the full data record for passing to DAOSimulation.setMarketData() */
  getAllData(): Record<string, Array<{ step: number; price: number }>> {
    return this.data;
  }
}
