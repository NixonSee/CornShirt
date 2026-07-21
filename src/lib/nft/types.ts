export type NftMintResult = {
  tokenId: bigint;
  transactionHash: `0x${string}`;
};

export type NftTransferResult = {
  transactionHash: `0x${string}`;
};

export type NftBurnResult = {
  transactionHash: `0x${string}`;
};

export type GasFundingResult =
  | { funded: false; balance: bigint }
  | { funded: true; balance: bigint; transactionHash: `0x${string}` };
