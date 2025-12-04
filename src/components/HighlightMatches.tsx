import React from "react";

interface HighlightMatchesProps {
    text: string;
    highlight: string;
}

export const HighlightMatches = React.memo(
    ({ text, highlight }: HighlightMatchesProps) => {
        if (!highlight || !text) {
            return <>{text}</>;
        }
        // Create a regex to find all occurrences of any of the highlight words, case-insensitive
        const highlightWords = highlight.toLowerCase().split(" ").filter(Boolean);
        if (highlightWords.length === 0) {
            return <>{text}</>;
        }

        const regex = new RegExp(`(${highlightWords.join("|")})`, "gi");
        const parts = text.split(regex);

        return (
            <>
                {parts.map((part, i) =>
                    highlightWords.includes(part.toLowerCase()) ? (
                        <mark
                            key={i}
                            className="bg-[var(--primary-accent-start)] text-[var(--text-on-accent)] px-0.5 rounded-sm"
                        >
                            {part}
                        </mark>
                    ) : (
                        part
                    ),
                )}
            </>
        );
    },
);

HighlightMatches.displayName = "HighlightMatches";
