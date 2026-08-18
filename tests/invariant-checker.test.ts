import { describe, expect, it } from 'vitest';
import type { DAO } from '../lib/data-structures/dao';
import { Treasury } from '../lib/data-structures/treasury';
import {
  checkAllTokenConservation,
  captureTokenSupply,
  checkTokenConservation,
  createAssetSupplyBaselines,
} from '../lib/research/invariant-checker';

function makeDao(): DAO {
  const treasury = new Treasury();
  treasury.deposit('DAO_TOKEN', 100);

  return {
    tokenSymbol: 'DAO_TOKEN',
    treasury,
    guilds: [],
    members: [
      {
        tokens: 40,
        stakedTokens: 10,
        delegations: new Map([['delegate', 5]]),
        getAssetBalance(token: string) {
          return token === 'DAO_TOKEN' ? this.tokens : 0;
        },
        getAssetBalances() {
          return { DAO_TOKEN: this.tokens };
        },
      },
    ],
  } as unknown as DAO;
}

describe('strict token conservation', () => {
  it('accounts for liquid, staked, delegated, locked, pool, and guild holdings', () => {
    const dao = makeDao();
    dao.treasury.lockTokens('DAO_TOKEN', 20);
    dao.treasury.deposit('USDC', 100);
    dao.treasury.addLiquidity('DAO_TOKEN', 'USDC', 30, 50);

    const guildTreasury = new Treasury();
    guildTreasury.deposit('DAO_TOKEN', 7);
    dao.guilds = [{ treasury: guildTreasury }] as DAO['guilds'];

    expect(captureTokenSupply(dao)).toMatchObject({
      memberLiquid: 40,
      memberStaked: 10,
      memberDelegated: 5,
      treasuryLiquid: 50,
      treasuryLocked: 20,
      treasuryBuffer: 0,
      liquidityPools: 30,
      guildTreasuries: 7,
      externalCustody: 0,
      total: 162,
    });
  });

  it('reconciles explicit minting and burning exactly', () => {
    const dao = makeDao();
    const initialSupply = captureTokenSupply(dao).total;

    dao.treasury.mintTokens('DAO_TOKEN', 12, 1);
    dao.treasury.burnTokens('DAO_TOKEN', 3, 2);

    expect(checkTokenConservation(dao, 2, initialSupply, 1e-9)).toBeNull();
  });

  it('keeps explicit boundary outflows in external custody', () => {
    const dao = makeDao();
    const initialSupply = captureTokenSupply(dao).total;
    dao.treasury.withdraw('DAO_TOKEN', 12, 1, {
      source: 'treasury:liquid',
      destination: 'external:incident_loss',
      event: 'incident_loss',
    });

    expect(captureTokenSupply(dao).externalCustody).toBe(12);
    expect(checkTokenConservation(dao, 1, initialSupply, 1e-9)).toBeNull();
  });

  it('rejects unaccounted token creation and ledger bypasses', () => {
    const dao = makeDao();
    const initialSupply = captureTokenSupply(dao).total;
    dao.members[0].tokens += 1;

    const unaccounted = checkTokenConservation(dao, 1, initialSupply, 1e-9);
    expect(unaccounted?.invariant).toBe('token_conservation');
    expect(unaccounted?.actual).toBe(initialSupply + 1);

    dao.members[0].tokens -= 1;
    dao.treasury.tokens.set('DAO_TOKEN', 101);
    const bypassed = checkTokenConservation(dao, 2, initialSupply, 1e-9);
    expect(bypassed?.message).toContain('ledger failed reconciliation');
  });

  it('detects unaccounted creation in a secondary member asset', () => {
    const dao = makeDao();
    let usdc = 25;
    dao.members[0].getAssetBalance = (token: string) =>
      token === 'DAO_TOKEN' ? dao.members[0].tokens : token === 'USDC' ? usdc : 0;
    dao.members[0].getAssetBalances = () => ({
      DAO_TOKEN: dao.members[0].tokens,
      USDC: usdc,
    });
    const baselines = createAssetSupplyBaselines(dao);

    usdc += 1;
    const violation = checkAllTokenConservation(dao, 1, baselines, 1e-9);
    expect(violation?.invariant).toBe('multi_asset_token_conservation');
    expect(violation?.message).toContain('USDC');
  });
});
