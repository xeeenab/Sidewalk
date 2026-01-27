import { Request, Response } from "express";
import { stellarService } from "../../config/stellar";
import crypto from "crypto";

export const createReport = async (req: Request, res: Response) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    const hash = crypto.createHash("sha256").update(description).digest("hex");

    const txHash = await stellarService.anchorHash(hash);

    res.status(201).json({
      message: "Report created and anchored",
      content_hash: hash,
      stellar_tx: txHash,
      explorer_url: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create report" });
  }
};

export const verifyReport = async (req: Request, res: Response) => {
  try {
    const { txHash, originalDescription } = req.body;

    if (!txHash || !originalDescription) {
      return res
        .status(400)
        .json({ error: "txHash and originalDescription are required" });
    }

    const expectedHash = crypto
      .createHash("sha256")
      .update(originalDescription)
      .digest("hex");

    const result = await stellarService.verifyTransaction(txHash, expectedHash);

    if (result.valid) {
      res.json({
        success: true,
        message: "✅ Content Verified! It matches the on-chain record.",
        timestamp: result.timestamp,
        signer: result.sender,
        on_chain_hash: expectedHash,
      });
    } else {
      res.status(409).json({
        success: false,
        message:
          "❌ Verification Failed. The content has been altered or does not match the record.",
        timestamp: result.timestamp,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(404).json({ error: "Transaction not found" });
  }
};
