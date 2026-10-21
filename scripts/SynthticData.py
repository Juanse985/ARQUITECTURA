"""
===============================================================================
ARCHIVO: scripts/SynthticData.py
Alias directo hacia SyntheticData.py para permitir la ejecucion con ambos nombres.
===============================================================================
"""

from __future__ import annotations

import json
from SyntheticData import clusterRuntimeDir, createDeterministicUuid, dataDir, generateSyntheticData

if __name__ == "__main__":
    summaryResult = generateSyntheticData()
    print(json.dumps(summaryResult, indent=2))
