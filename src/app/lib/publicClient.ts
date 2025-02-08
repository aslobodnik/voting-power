"use client";

import { publicActions } from "viem";

import { wagmiConfig } from "../components/ClientProviders";

export const publicClient = wagmiConfig.getClient().extend(publicActions);

export default publicClient;
