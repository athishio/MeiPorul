import { Claim } from '../types';

export interface SourceInfo {
  name: string;
  url: string | null;
  domain: string | null;
}

/**
 * Extracts and normalizes evidence source information from a claim.
 * Guarantees that if evidence_source_url is null or unavailable, url is strictly null
 * to prevent broken or fabricated links.
 */
export function getClaimSourceInfo(claim: Claim): SourceInfo {
  let name = claim.evidence_source_name?.trim();
  let url = claim.evidence_source_url?.trim() || null;
  let domain = claim.evidence_source_domain?.trim() || null;

  // Fallback: If name/url/domain were not explicitly provided, extract from claim.evidence_source
  if (!name && claim.evidence_source && claim.evidence_source !== 'None') {
    const raw = claim.evidence_source.trim();
    const urlMatch = raw.match(/https?:\/\/[^\s\)]+/);
    if (urlMatch) {
      if (!url) url = urlMatch[0];
      name = raw.replace(`(${urlMatch[0]})`, '').replace(urlMatch[0], '').trim();
    } else {
      name = raw;
    }
  }

  // Derive domain from url if domain is absent
  if (url && !domain) {
    try {
      const parsed = new URL(url);
      domain = parsed.hostname.replace(/^www\./, '');
    } catch {
      domain = null;
    }
  }

  // Clean domain if it has www.
  if (domain) {
    domain = domain.replace(/^www\./, '');
  }

  if (!name) {
    name = domain || (claim.evidence_source && claim.evidence_source !== 'None' ? claim.evidence_source : 'Primary Evidence');
  }

  return {
    name,
    url: url || null,
    domain: domain || null,
  };
}
