'use client'

import { useRouter } from "next/navigation"
import { Plus, Settings, Search, X, Check, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveModelId, getModels, getAvailableToolsInfo } from "@/app/actions"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import dedent from "dedent";
import { toast } from 'sonner';
import { cn } from "@/lib/utils"
import { useLocalStorage } from 'usehooks-ts';

export interface Preset {
    id: string;
    name: string;
    customInstructions: string;
    selectedTools: string[];
}

const initialPresets: Preset[] = [
    {
        id: "default",
        name: "Default",
        customInstructions: "",
        selectedTools: ["firecrawl", "getWeather"],
    }
]

interface ChatHeaderProps {
    selectedModelId: string
    onOpenArtifacts?: () => void
    showArtifactsButton?: boolean
    onPresetChange: (preset: Preset) => void;
}

export function ChatHeader({ selectedModelId, onOpenArtifacts, onPresetChange, showArtifactsButton = true }: ChatHeaderProps) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [modelSelectOpen, setModelSelectOpen] = useState(false)

    // Settings state
    const [presets, setPresets] = useLocalStorage<Preset[]>("chat_presets", initialPresets);
    const [selectedPreset, setSelectedPreset] = useLocalStorage<Preset>("selected_preset", initialPresets[0]);
    const [newPresetName, setNewPresetName] = useState("")
    const [isCreatingPreset, setIsCreatingPreset] = useState(false)
    const [customInstructions, setCustomInstructions] = useState("")
    const [selectedTools, setSelectedTools] = useState<string[]>([])
    const [toolSearchQuery, setToolSearchQuery] = useState("")
    const [availableTools, setAvailabeTools] = useState<any[]>([])
    const [models, setModels] = useState<any[]>([])
      
      useEffect(() => {
        //   onPresetChange(preset);
      }, [selectedPreset, presets]);
  
      const savePreset = () => {
        setPresets((prevPresets) => {
            const otherPresets = prevPresets.filter((p) => p.id !== selectedPreset.id);
            return [...otherPresets, { ...selectedPreset, selectedTools, customInstructions: selectedPreset.customInstructions }];
        });
    };


    useEffect(() => {
        getModels().then(setModels)
        getAvailableToolsInfo().then(setAvailabeTools)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Load preset when selected
    useEffect(() => {
        const preset = presets.find((p) => p.id === selectedPreset.id)
        if (preset) {
            setCustomInstructions(preset.customInstructions)
            setSelectedTools(preset.selectedTools)
        }
    }, [selectedPreset, presets])

    // Filter tools based on search query
    const filteredTools = availableTools.filter(
        (tool) =>
            tool.displayName.toLowerCase().includes(toolSearchQuery.toLowerCase()) ||
            tool.description.toLowerCase().includes(toolSearchQuery.toLowerCase()),
    )

    const createNewPreset = () => {
        if (!newPresetName.trim()) {
            toast.error("Please enter a preset name")
            return
        }

        const newPresetId = newPresetName.toLowerCase().replace(/\s+/g, "-")

        // Check if preset with same name already exists
        if (presets.some((p) => p.id === newPresetId)) {
            toast.error("A preset with this name already exists")
            return
        }

        const newPreset = {
            id: newPresetId,
            name: newPresetName,
            customInstructions,
            selectedTools,
        }

        setPresets([...presets, newPreset])
        setSelectedPreset(newPreset)
        setIsCreatingPreset(false)
        setNewPresetName("")
        toast.success("New preset created")
    }

    const deletePreset = (presetId: string) => {
        if (presets.length <= 1) {
            toast.error("Cannot delete the only preset")
            return
        }

        const updatedPresets = presets.filter((p) => p.id !== presetId)
        setPresets(updatedPresets)

        // If the deleted preset was selected, select the first available preset
        if (selectedPreset.id === presetId) {
            setSelectedPreset(updatedPresets[0])
        }
        toast.success("Preset deleted")
    }

    const clearToolSelection = () => {
        setSelectedTools([])
    }

    const handleNewChat = () => {
        router.push("/")
        router.refresh()
    }

    return (
        <div className="flex bg-background items-center p-2 gap-2 w-full">
            <Button onClick={handleNewChat} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
            </Button>
            <Select
                onValueChange={saveModelId}
                open={modelSelectOpen}
                defaultValue={selectedModelId}
                onOpenChange={setModelSelectOpen}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                    {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                            {model.id}
                            {modelSelectOpen && model.description && (
                                <div className="text-xs text-muted-foreground">{model.description}</div>
                            )}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex-grow"></div>

            {showArtifactsButton && onOpenArtifacts && (
                <Button
                    onClick={onOpenArtifacts}
                    variant="outline"
                    size="icon"
                    className="mr-2"
                    aria-label="Open artifacts canvas"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            )}

            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Settings</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto p-4">
                    <SheetHeader>
                        <SheetTitle>Settings</SheetTitle>
                        <SheetDescription>Configure preferences here.</SheetDescription>
                    </SheetHeader>

                    <div className="py-6 space-y-6">
                        {/* Presets Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">Presets</h3>
                                <Button variant="outline" size="sm" onClick={() => setIsCreatingPreset(!isCreatingPreset)}>
                                    {isCreatingPreset ? "Cancel" : "New Preset"}
                                </Button>
                            </div>

                            {isCreatingPreset ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        placeholder="Enter preset name"
                                        value={newPresetName}
                                        onChange={(e) => setNewPresetName(e.target.value)}
                                        className="flex-grow"
                                    />
                                    <Button size="sm" onClick={createNewPreset}>
                                        Save
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {presets.map((preset) => (
                                        <div
                                            key={preset.id}
                                            className={cn(
                                                "flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-accent/50 transition-colors",
                                                selectedPreset.id === preset.id && "border-primary bg-accent",
                                            )}
                                            onClick={() => setSelectedPreset(preset)}
                                        >
                                            <div className="flex items-center gap-2">
                                                {selectedPreset.id === preset.id && <Check className="h-4 w-4 text-primary" />}
                                                <span>{preset.name}</span>
                                            </div>
                                            {presets.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 opacity-50 hover:opacity-100"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        deletePreset(preset.id)
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Custom Instructions */}
                        <div className="space-y-2">
                            <Label htmlFor="custom-instructions">Custom Instructions</Label>
                            <Textarea
                                id="custom-instructions"
                                placeholder="Add specific instructions to improve AI responses. For example: 'Always provide code examples' or 'Keep explanations concise and beginner-friendly'."
                                className="min-h-[100px]"
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                            />
                        </div>

                        {/* Tool Selection */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium">Tool Selection</h3>

                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search tools..."
                                    className="pl-9 pr-9"
                                    value={toolSearchQuery}
                                    onChange={(e) => setToolSearchQuery(e.target.value)}
                                />
                                {selectedTools.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1 h-8 w-8"
                                        onClick={clearToolSelection}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            <ScrollArea className="h-[200px] rounded-md border">
                                <div className="p-1">
                                    {filteredTools.map((tool) => (
                                        <div
                                            key={tool.name}
                                            className={cn(
                                                "flex items-start p-3 rounded-md cursor-pointer hover:bg-accent/50 transition-colors",
                                                selectedTools.includes(tool.name) && "bg-accent",
                                            )}
                                            onClick={() => {
                                                setSelectedTools(
                                                    selectedTools.includes(tool.name)
                                                        ? selectedTools.filter((id) => id !== tool.name)
                                                        : [...selectedTools, tool.name],
                                                )
                                            }}
                                        >
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2">
                                                    {selectedTools.includes(tool.name) && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                                                    <span className="font-medium">{tool.displayName}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        <div className="flex gap-2">
                            <Button className="flex-1" onClick={savePreset}>
                                Save Settings
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}
