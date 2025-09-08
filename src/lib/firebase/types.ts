// This file defines shared data structures for Firebase to be used by both client and server code.

export interface UserProfile {
  uid: string;
  email: string | null;
  isSubscribed: boolean;
  credits: number;
  createdAt: any;
  lastLogin?: any;
  subscriptionEndDate?: any | null;
  creditsGranted: boolean; // Flag to ensure credits are granted only once per subscription cycle.
}
