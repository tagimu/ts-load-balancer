
const ALLOWED_STRATEGIES = {
    rrobin: 'ROUND_ROBIN',
    wrobin: 'WEIGHTED_ROUND_ROBIN',
    ip: 'IP_HASHED',
} as const;

export type BalancerStrategy = keyof typeof ALLOWED_STRATEGIES;
