// Use object instead Enum because of 'isolatedModules'
// More here: https://www.typescriptlang.org/docs/handbook/enums.html#const-enum-pitfalls
export const STRATEGIES = {
    rrobin: 'rrobin',
    wrobin: 'wrobin',
    ip: 'ip',
} as const;

export type BalancerStrategy = keyof typeof STRATEGIES;
