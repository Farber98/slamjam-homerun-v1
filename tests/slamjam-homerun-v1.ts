import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SlamjamHomerunV1 } from "../target/types/slamjam_homerun_v1";

describe("slamjam-homerun-v1", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.SlamjamHomerunV1 as Program<SlamjamHomerunV1>;


});
