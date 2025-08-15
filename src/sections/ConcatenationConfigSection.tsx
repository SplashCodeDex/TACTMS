import React from "react";
import { Layers } from "lucide-react";
import CheckboxButton from "../components/CheckboxButton";
import InfoTooltip from "../components/InfoTooltip";
import { ConcatenationConfig } from "../types.ts";
import { DEFAULT_CONCAT_CONFIG } from "../constants.ts";

interface ConcatenationConfigSectionProps {
  concatenationConfig: ConcatenationConfig;
  handleConcatenationConfigChange: (key: keyof ConcatenationConfig) => void;
}

const ConcatenationConfigSection: React.FC<ConcatenationConfigSectionProps> =
  React.memo(({ concatenationConfig, handleConcatenationConfigChange }) => {
    return (
      <div className="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border-color)] h-full">
        <div aria-labelledby="concat-config-heading">
          <div className="flex justify-between items-center">
            <h3
              id="concat-config-heading"
              className="text-lg font-semibold flex items-center"
            >
              <Layers
                size={20}
                className="mr-3 text-[var(--primary-accent-end)]"
              />
              Membership Name Concatenation
            </h3>
            <InfoTooltip
              text={
                <>
                  <p className="font-semibold mb-1 text-[var(--text-primary)]">
                    Select fields to build the "Membership Number" column.
                  </p>
                  <p className="text-xs">
                    This combined string identifies members. Numbers appear as
                    (Main|Old) or (Number).
                  </p>
                </>
              }
            />
          </div>

          <div className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(
                Object.keys(DEFAULT_CONCAT_CONFIG) as Array<
                  keyof ConcatenationConfig
                >
              ).map((key) => (
                <CheckboxButton
                  key={key}
                  id={`concat-${key.replace(/\s/g, "-")}`}
                  label={key}
                  checked={concatenationConfig[key]}
                  onChange={() => handleConcatenationConfigChange(key)}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--text-muted)]">
              Your default settings are saved locally in your browser.
            </p>
          </div>
        </div>
      </div>
    );
  });

export default ConcatenationConfigSection;
