import { useState, useCallback } from 'react';
import { TitheRecordB, MemberDatabase, TransactionLogEntry } from '@/types';
import { processTitheImageWithValidation } from '@/services/imageProcessor';
import { validateTitheBookImage, validateExtractedTitheData } from '@/services/imageValidator';
import { sequencePages, detectDuplicatePages, mergeDuplicateExtractions } from '@/services/pageSequencer';
import { findMemberByNameSync, getTopFuzzyMatches } from '@/services/reconciliation';
import { validateAmountWithLearning, buildMemberHistory } from '@/services/amountValidator';

interface UseBatchProcessorProps {
    memberDatabase: MemberDatabase;
    transactionLog: TransactionLogEntry[];
}

export const useBatchProcessor = ({ memberDatabase, transactionLog }: UseBatchProcessorProps) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const processBatch = useCallback(async (
        files: File[],
        assembly: string,
        month: string,
        week: string,
        onProgress?: (completed: number, total: number) => void,
        onWarning?: (message: string, type: 'info' | 'warning' | 'error') => void
    ): Promise<TitheRecordB[]> => {
        setIsProcessing(true);
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
            const dateStr = new Date().toDateString();

            // Collect extractions as separate arrays for intelligent merging
            const pageExtractions: TitheRecordB[][] = [];

            let completed = 0;
            const total = files.length;
            // Robust assembly member lookup with informative warnings
            const assemblyData = memberDatabase[assembly];
            if (!assemblyData) {
                const warningMsg = `Assembly "${assembly}" not found. Available: [${Object.keys(memberDatabase).join(', ') || 'none'}]. Member matching skipped.`;
                console.warn(`⚠️ ${warningMsg}`);
                onWarning?.(warningMsg, 'warning');
            } else if (!assemblyData.data || assemblyData.data.length === 0) {
                const warningMsg = `Assembly "${assembly}" has no members loaded. Import member data to enable matching.`;
                console.warn(`⚠️ ${warningMsg}`);
                onWarning?.(warningMsg, 'warning');
            }
            const assemblyMembers = assemblyData?.data || [];

            for (const file of files) {
                try {
                    // Pre-validate the image file before expensive OCR
                    const imgValidation = await validateTitheBookImage(file);
                    if (!imgValidation.isValid) {
                        console.warn("Skipping invalid image:", imgValidation.errors.join("; "));
                        continue;
                    }

                    const extraction = await processTitheImageWithValidation(
                        file,
                        apiKey,
                        month,
                        week,
                        dateStr,
                        transactionLog,
                        'auto',
                        assemblyMembers
                    );

                    // Validate extracted rows structurally
                    const structuralValidation = validateExtractedTitheData(
                        extraction.entries.map(e => ({
                            Name: e["Membership Number"],
                            Amount: e["Transaction Amount"],
                            Confidence: e["Confidence"],
                        }))
                    );

                    if (!structuralValidation.isValidFormat) {
                        console.warn("Extracted data failed structural validation");
                    }

                    // Store each extraction separately for intelligent merging
                    if (extraction.entries.length > 0) {
                        pageExtractions.push(extraction.entries);
                    }

                    completed += 1;
                    onProgress?.(completed, total);
                } catch (err) {
                    console.warn("Failed to process one image in batch:", err);
                }
            }

            // Use page sequencer to intelligently merge multi-page extractions
            if (pageExtractions.length === 0) {
                return [];
            }



            // -- REFINED LOGIC --
            let potentialMerged: TitheRecordB[] = [];

            if (pageExtractions.length === 1) {
                potentialMerged = pageExtractions[0];
            } else {
                // Detect & Merge Duplicates
                const duplicateInfo = detectDuplicatePages(pageExtractions);
                let processedExtractions = [...pageExtractions];

                if (duplicateInfo.duplicateGroups.length > 0) {
                    for (const group of duplicateInfo.duplicateGroups) {
                        const merged = mergeDuplicateExtractions(pageExtractions, group);
                        processedExtractions[group[0]] = merged;
                    }
                    processedExtractions = duplicateInfo.unique.map(idx => processedExtractions[idx]);
                }

                const sequenceResult = sequencePages(processedExtractions);

                if (sequenceResult.gapsDetected.length > 0) {
                    console.warn(`Gap detected after member numbers: ${sequenceResult.gapsDetected.join(", ")}`);
                }

                potentialMerged = sequenceResult.merged;
            }


            // Match extracted names against assembly member database
            if (assemblyMembers.length > 0) {
                let matchedCount = 0;
                let unmatchedCount = 0;
                let anomalyCount = 0;

                const matchedResults = await Promise.all(potentialMerged.map(async record => {
                    let resultRecord = { ...record };
                    let memberId = "";
                    let memberDetails = record.memberDetails;

                    // If not already matched (e.g. by notebook extractor), try greedy match
                    if (!memberDetails) {
                        const rawName = record["Membership Number"]; // This contains the OCR-extracted name
                        const match = findMemberByNameSync(rawName, assemblyMembers);

                        if (match) {
                            memberDetails = match.member;
                            // Format matched member ID like ImageVerificationModal does
                            memberId = `${match.member.Surname} ${match.member["First Name"]} ${match.member["Other Names"] || ""} (${match.member["Membership Number"]}|${match.member["Old Membership Number"] || ""})`.trim();
                            resultRecord = {
                                ...resultRecord,
                                "Membership Number": memberId,
                                memberDetails: match.member
                            };
                        } else {
                            unmatchedCount++;
                            // Get top 3 fuzzy suggestions for unmatched names
                            const suggestions = getTopFuzzyMatches(rawName, assemblyMembers, 3);
                            const suggestionsList = suggestions
                                .map(s => `${s.member.Surname} ${s.member["First Name"]} (${Math.round(s.score * 100)}%)`)
                                .join("; ");

                            // Keep raw OCR name but mark as unmatched with suggestions
                            return {
                                ...resultRecord,
                                "Membership Number": `[UNMATCHED] ${rawName}`,
                                "Narration/Description": suggestions.length > 0
                                    ? `[SUGGESTIONS: ${suggestionsList}] ${resultRecord["Narration/Description"] || ''}`
                                    : resultRecord["Narration/Description"] || ''
                            };
                        }
                    } else {
                        matchedCount++;
                        memberId = record["Membership Number"];
                    }

                    // Validate amount with learned corrections + anomaly detection (for both pre-matched and greedy-matched)
                    if (memberDetails) {
                        // Ensure memberId is formatted if pre-matched
                        if (!memberId) memberId = record["Membership Number"];

                        const memberHistory = buildMemberHistory(memberId, transactionLog);
                        const amountValidation = await validateAmountWithLearning(
                            record["Transaction Amount"],
                            assembly,
                            memberHistory || undefined
                        );
                        if (amountValidation.reason === 'anomaly' || amountValidation.reason === 'unusual_high' || amountValidation.reason === 'unusual_low') {
                            anomalyCount++;
                            // Add anomaly warning to the record
                            resultRecord = {
                                ...resultRecord,
                                "Narration/Description": `[ANOMALY: ${amountValidation.message}] ${resultRecord["Narration/Description"] || ''}`
                            };
                        } else if (amountValidation.reason === 'ocr_artifact' && amountValidation.suggestedAmount) {
                            // Apply learned OCR correction
                            resultRecord = {
                                ...resultRecord,
                                "Transaction Amount": amountValidation.suggestedAmount,
                                "Narration/Description": `[OCR CORRECTED: ${amountValidation.message}] ${resultRecord["Narration/Description"] || ''}`
                            };
                        }
                    }

                    return resultRecord;
                }));

                console.info(
                    `Batch processing: ${matchedCount} matched, ${unmatchedCount} unmatched, ` +
                    `${anomalyCount} anomalies detected out of ${potentialMerged.length}`
                );
                return matchedResults;
            }

            return potentialMerged;
        } finally {
            setIsProcessing(false);
        }
    }, [memberDatabase, transactionLog]);

    return {
        processBatch,
        isProcessing
    };
};
