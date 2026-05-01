import { Contract, JsonRpcSigner } from "ethers";
import { CONTRACT_ADDRESSES } from "./contractAddresses";
import {
  MUSDT_ABI,
  PROPERTY_TOKEN_ABI,
  MARKETPLACE_ABI,
  DIVIDEND_VAULT_ABI,
} from "./contractAbis";

export function getContracts(signer: JsonRpcSigner) {
  return {
    musdt:         new Contract(CONTRACT_ADDRESSES.musdt,         MUSDT_ABI,         signer),
    propertyToken: new Contract(CONTRACT_ADDRESSES.propertyToken, PROPERTY_TOKEN_ABI, signer),
    marketplace:   new Contract(CONTRACT_ADDRESSES.marketplace,   MARKETPLACE_ABI,   signer),
    dividendVault: new Contract(CONTRACT_ADDRESSES.dividendVault, DIVIDEND_VAULT_ABI, signer),
  };
}
