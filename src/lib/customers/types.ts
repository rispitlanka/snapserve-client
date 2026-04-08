export type CreateCustomerPayload = {
  name: string;
  mobileNumber: string;
};

export type Customer = {
  id: string;
} & Record<string, unknown>;

export type CustomerSale = {
  id: string;
} & Record<string, unknown>;

export type CustomerCredit = {
  id: string;
} & Record<string, unknown>;

export type LoyaltyTransaction = {
  id: string;
} & Record<string, unknown>;

export type CustomerLoyaltyPoints = {
  customerId?: string;
  pointsBalance?: number;
  recentTransactions: LoyaltyTransaction[];
} & Record<string, unknown>;
