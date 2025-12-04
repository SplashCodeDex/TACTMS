import React from "react";
import { motion } from "framer-motion";
import {
    Camera,
    Sparkles,
    UploadCloud,
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
import Button from "../Button";
import { ASSEMBLIES } from "../../constants";

interface QuickActionsGridProps {
    selectedAssembly: string;
    setSelectedAssembly: (assembly: string) => void;
    assembliesWithData: Set<string>;
    memberDatabaseEmpty: boolean;
    onStartWeek: () => void;
    onUploadClick: () => void;
    onScanClick: () => void;
    isDragOver: boolean;
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    imageInputRef: React.RefObject<HTMLInputElement>;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const QuickActionsGrid: React.FC<QuickActionsGridProps> = ({
    selectedAssembly,
    setSelectedAssembly,
    assembliesWithData,
    memberDatabaseEmpty,
    onStartWeek,
    onUploadClick,
    onScanClick,
    isDragOver,
    onDragOver,
    onDragLeave,
    onDrop,
    fileInputRef,
    imageInputRef,
    onFileChange,
    onImageChange,
}) => {
    return (
        <section className="lg:col-span-2 content-card flex flex-col h-full gap-6">
            <h2 className="section-heading mb-0 pb-3 border-b border-[var(--border-color)]">
                <FilePlus size={22} className="mr-3 icon-primary" />
                Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Start New Weekly List Card */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="glassmorphism-card p-6 rounded-2xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all group cursor-pointer relative overflow-hidden"
                    onClick={onStartWeek}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FilePlus size={80} className="text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                            <FilePlus size={24} />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">
                            Start New Weekly List
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
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
                                    <SelectValue placeholder="-- Select Assembly --" />
                                </SelectTrigger>
                                <SelectContent className="glassmorphism-bg border border-[var(--border-color)] rounded-xl">
                                    {ASSEMBLIES.map((assembly) => (
                                        <SelectItem
                                            key={assembly}
                                            value={assembly}
                                            disabled={!assembliesWithData.has(assembly)}
                                        >
                                            {assembly}{" "}
                                            {assembliesWithData.has(assembly)
                                                ? ""
                                                : "(No member data)"}
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

                {/* Scan Tithe Book (AI) Card */}
                <motion.div
                    whileHover={{ y: -5 }}
                    className="relative p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm hover:shadow-md transition-all group cursor-pointer overflow-hidden"
                    style={{
                        background:
                            "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)",
                    }}
                    onClick={onScanClick}
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
                            Scan Tithe Book (AI)
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Take a photo of a physical tithe book page to digitize it
                            instantly.
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

            {/* Drag and Drop Zone */}
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={onUploadClick}
                className={`p-8 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center text-center space-y-3 flex-grow cursor-pointer ${isDragOver
                    ? "border-[var(--primary-accent-start)] bg-[var(--primary-accent-start)]/10"
                    : "border-[var(--border-color)] bg-[var(--bg-card-subtle)] hover:bg-[var(--bg-card-subtle-accent)]"
                    }`}
                style={{ minHeight: "150px" }}
            >
                <div
                    className={`p-4 rounded-full ${isDragOver ? "bg-[var(--primary-accent-start)]/20" : "bg-[var(--bg-elevated)]"}`}
                >
                    <UploadCloud
                        size={32}
                        className={
                            isDragOver
                                ? "text-[var(--primary-accent-start)]"
                                : "text-[var(--text-muted)]"
                        }
                    />
                </div>
                <div>
                    <p className="text-lg font-medium text-[var(--text-primary)]">
                        {isDragOver ? "Drop file here" : "Drag & drop files here"}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                        or click to browse
                    </p>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    className="hidden"
                    accept=".xlsx, .xls"
                />
            </div>
        </section>
    );
};

export default QuickActionsGrid;
