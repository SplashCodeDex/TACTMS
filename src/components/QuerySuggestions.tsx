/**
 * Query Suggestions Component
 * Shows pre-built query suggestions for the AI chat
 */

import React from "react";
import { MessageSquare, TrendingUp, Users, BarChart2 } from "lucide-react";
import { QUERY_SUGGESTIONS, QuerySuggestion } from "@/services/queryTemplates";

interface QuerySuggestionsProps {
    onSelectQuery: (query: string) => void;
    compact?: boolean;
}

const QuerySuggestions: React.FC<QuerySuggestionsProps> = ({ onSelectQuery, compact = false }) => {
    const getCategoryIcon = (category: QuerySuggestion['category']) => {
        switch (category) {
            case 'tithers': return <Users size={14} />;
            case 'trends': return <TrendingUp size={14} />;
            case 'comparison': return <BarChart2 size={14} />;
            case 'members': return <Users size={14} />;
            default: return <MessageSquare size={14} />;
        }
    };

    const getCategoryColor = (category: QuerySuggestion['category']) => {
        switch (category) {
            case 'tithers': return 'bg-green-500/10 text-green-500 hover:bg-green-500/20';
            case 'trends': return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
            case 'comparison': return 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20';
            case 'members': return 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20';
            default: return 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
        }
    };

    if (compact) {
        return (
            <div className="flex flex-wrap gap-2">
                {QUERY_SUGGESTIONS.slice(0, 4).map((suggestion) => (
                    <button
                        key={suggestion.id}
                        onClick={() => onSelectQuery(suggestion.query)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${getCategoryColor(suggestion.category)}`}
                    >
                        {getCategoryIcon(suggestion.category)}
                        {suggestion.label}
                    </button>
                ))}
            </div>
        );
    }

    // Group by category
    const grouped = QUERY_SUGGESTIONS.reduce((acc, suggestion) => {
        if (!acc[suggestion.category]) acc[suggestion.category] = [];
        acc[suggestion.category].push(suggestion);
        return acc;
    }, {} as Record<string, QuerySuggestion[]>);

    const categoryLabels: Record<string, string> = {
        tithers: '👤 Tithers',
        trends: '📈 Trends',
        comparison: '📊 Comparisons',
        members: '👥 Members'
    };

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-medium text-text-secondary">Quick Questions</h4>
            {Object.entries(grouped).map(([category, suggestions]) => (
                <div key={category}>
                    <div className="text-xs text-text-secondary mb-2">
                        {categoryLabels[category] || category}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion.id}
                                onClick={() => onSelectQuery(suggestion.query)}
                                className="p-3 text-left rounded-lg border border-border-color hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group"
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`p-1 rounded ${getCategoryColor(suggestion.category)}`}>
                                        {getCategoryIcon(suggestion.category)}
                                    </span>
                                    <span className="text-sm font-medium text-text-primary group-hover:text-purple-400">
                                        {suggestion.label}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default QuerySuggestions;
