import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
    Camera,
    Sparkles,
    FilePlus,
    ArrowRight,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { hapticSoft } from "../../lib/haptics";
import Button from "../Button";
import { useAppConfigContext, DEFAULT_ASSEMBLIES } from "../../context";

interface QuickActionsGridProps {
    selectedAssembly: string;
    setSelectedAssembly: (assembly: string) => void;
    assembliesWithData: Set<string>;
    memberDatabaseEmpty: boolean;
    onStartWeek: () => void;
    onScanClick: () => void;
    imageInputRef: React.RefObject<HTMLInputElement>;
    onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
    selectedAssembly,
    setSelectedAssembly,
    assembliesWithData,
    memberDatabaseEmpty,
    onStartWeek,
    onScanClick,
    imageInputRef,
    onImageChange,
}) => {
    const { assemblies } = useAppConfigContext();

    // Filter assemblies: show defaults (even if no data) + custom assemblies WITH data
    const filteredAssemblies = useMemo(() => {
        const defaultSet = new Set(DEFAULT_ASSEMBLIES);
        return assemblies.filter(assembly =>
            defaultSet.has(assembly) || assembliesWithData.has(assembly)
        );
    }, [assemblies, assembliesWithData]);

    return (
        <section className="lg:col-span-2 content-card flex flex-col h-full gap-6">
            <h2 className="section-heading mb-0 pb-3 border-b border-[var(--border-color)]">
                <FilePlus size={22} className="mr-3 icon-primary" />
                Quick Actions
            </h2>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 -mx-4 px-4 pb-4 mb-4 no-scrollbar md:grid md:grid-cols-2 md:gap-6 md:mb-8 md:mx-0 md:px-0 md:pb-0">
                {/* Start New Weekly List Card */}
                <div className="min-w-[90%] snap-center md:min-w-0 h-full">
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="glassmorphism-card p-6 rounded-2xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden h-full"
                        onClick={() => {
                            hapticSoft();
                            onStartWeek();
                        }}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <FilePlus size={80} className="text-blue-500" />
                        </div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                                <FilePlus size={24} />
                            </div>
                            <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
                                Start Weekly List
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-6 line-clamp-2">
                                Create a fresh tithe list for the current week.
                            </p>
                            <div className="space-y-2">
                                <Select
                                    value={selectedAssembly}
                                    onValueChange={setSelectedAssembly}
                                    disabled={memberDatabaseEmpty}
                                >
                                    <SelectTrigger
                                        id="assembly-start-select-dash"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Select Assembly" />
                                    </SelectTrigger>
                                    <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl">
                                        {filteredAssemblies.map((assembly) => (
                                            <SelectItem
                                                key={assembly}
                                                value={assembly}
                                                disabled={!assembliesWithData.has(assembly)}
                                            >
                                                {assembly}{" "}
                                                {assembliesWithData.has(assembly)
                                                    ? ""
                                                    : "(No data)"}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="primary"
                                    className="w-full group-hover:shadow-lg transition-all"
                                    onClick={onStartWeek}
                                    disabled={!selectedAssembly}
                                >
                                    Create List{" "}
                                    <ArrowRight
                                        size={16}
                                        className="ml-2 group-hover:translate-x-1 transition-transform"
                                    />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Scan Tithe Book (AI) Card */}
                <div className="min-w-[90%] snap-center md:min-w-0 h-full">
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="relative p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm hover:shadow-md transition-all group cursor-pointer overflow-hidden h-full"
                        style={{
                            background:
                                "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)",
                        }}
                        onClick={() => {
                            hapticSoft();
                            onScanClick();
                        }}
                    >
                        {/* New Badge */}
                        <div className="absolute top-4 right-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                            NEW AI
                        </div>

                        <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Camera size={100} className="text-indigo-500" />
                        </div>

                        <div className="relative z-10">
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                <Camera size={24} />
                            </div>
                            <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
                                Scan Tithe Book
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-6 line-clamp-2">
                                Digitize physical tithe book pages instantly.
                            </p>
                            <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border-0 shadow-md group-hover:shadow-lg transition-all">
                                Scan Image <Sparkles size={16} className="ml-2" />
                            </Button>
                            <input
                                type="file"
                                ref={imageInputRef}
                                onChange={onImageChange}
                                className="hidden"
                                accept="image/*"
                            />
                        </div>
                    </motion.div>
                </div>
            </div>


        </section>
    );
};

export default QuickActionsGrid;
