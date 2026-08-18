import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  indexCampaignArtifact,
  loadCampaign,
  transitionCampaign,
  writeJsonAtomic,
} from './campaign-manifest';

export interface CampaignAbortReport {
  schemaVersion: '1.0.0';
  campaignId: string;
  campaignIdentitySha256: string;
  previousState: string;
  abortedAt: string;
  reason: string;
}

export function abortCampaign(
  campaignDirValue: string,
  reasonValue: string,
): CampaignAbortReport {
  const campaignDir = path.resolve(campaignDirValue);
  const reason = reasonValue.trim();
  if (!reason) throw new Error('Campaign abort reason is required');
  const campaign = loadCampaign(campaignDir);
  if (campaign.state === 'verified' || campaign.state === 'completed') {
    throw new Error(`Cannot abort a finalized campaign in state ${campaign.state}`);
  }
  if (campaign.state === 'failed') {
    throw new Error('Campaign is already failed');
  }
  const reportPath = path.join(campaignDir, 'diagnostics', 'campaign-abort.json');
  if (fs.existsSync(reportPath)) {
    throw new Error('Campaign already contains an abort report');
  }
  const report: CampaignAbortReport = {
    schemaVersion: '1.0.0',
    campaignId: campaign.campaignId,
    campaignIdentitySha256: campaign.identitySha256,
    previousState: campaign.state,
    abortedAt: new Date().toISOString(),
    reason,
  };
  writeJsonAtomic(reportPath, report);
  indexCampaignArtifact(campaignDir, {
    id: 'campaign-abort',
    kind: 'diagnostic',
    path: path.relative(campaignDir, reportPath).replaceAll(path.sep, '/'),
  });
  transitionCampaign(campaignDir, 'failed');
  return report;
}
