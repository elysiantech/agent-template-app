'use client'

import { useRouter } from 'next/navigation';
import { Plus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { saveModelId, saveSettingsAction, getModels, getAvailableToolsInfo } from '@/app/actions'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useEffect, useState } from "react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"

export function ChatHeader({ selectedModelId, settings }: { selectedModelId: string, settings: Record<string, any> }) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [modelSelectOpen, setModelSelectOpen] = useState(false)
    const [temperature, setTemperature] = useState(settings.temperature ?? 0.7)
    const [maxTokens, setMaxTokens] = useState(settings.maxTokens ?? 2000)
    const [maxSteps, setMaxSteps] = useState(settings.maxSteps ?? 5)
    const [selectedTools, setSelectedTools] = useState<number[]>(settings.selectedTools ?? [])
    const [displayToolMessages, setDisplayToolMessages] = useState(settings.displayToolMessages ?? true)
    const [langchain, setLangchain] = useState(settings.langchain ?? true)
    const [availableTools, setAvailabeTools] = useState<any[]>([])
    const [models, setModels] = useState<any[]>([])

    const saveSettings = async () => {
        await saveSettingsAction({
            temperature,
            maxTokens,
            maxSteps,
            selectedTools,
            displayToolMessages,
            langchain
        });

        setIsOpen(false)
        // Optional: Show a success toast
    }

    useEffect(() => {
        getModels().then(setModels)
        getAvailableToolsInfo().then(setAvailabeTools)
    }, [])
    const handleNewChat = () => {
        router.push('/');
        router.refresh();
    }

    return (
        <div className='flex bg-background items-center p-2 gap-2 w-full'>
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
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Settings</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="right" className="p-6">
                    <SheetHeader>
                        <SheetTitle>Settings</SheetTitle>
                        <SheetDescription>Configure your chat preferences here.</SheetDescription>
                    </SheetHeader>

                    {/* Add space between groups */}
                    <div className="py-4 space-y-6">

                        {/* Model Configuration */}
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="model-config">
                                <AccordionTrigger>Model Configuration</AccordionTrigger>
                                <AccordionContent className="space-y-4">
                                    <div>
                                        <Label htmlFor="system-instructions">System Instructions</Label>
                                        <Textarea id="system-instructions" placeholder="Override system prompt..." className="min-h-[100px]" />
                                    </div>

                                    <div>
                                        <Label htmlFor="temperature">Temperature: {temperature}</Label>
                                        <Slider id="temperature" min={0} max={1} step={0.1} value={[temperature]} onValueChange={(value) => setTemperature(value[0])} />
                                    </div>

                                    <div>
                                        <Label htmlFor="max-tokens">Max Tokens: {maxTokens}</Label>
                                        <Slider id="max-tokens" min={100} max={4000} step={100} value={[maxTokens]} onValueChange={(value) => setMaxTokens(value[0])} />
                                    </div>

                                    <div>
                                        <Label htmlFor="max-steps">Max Steps: {maxSteps}</Label>
                                        <Slider id="max-steps" min={1} max={10} step={1} value={[maxSteps]} onValueChange={(value) => setMaxSteps(value[0])} />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Tool Selection */}
                            <AccordionItem value="tool-selection">
                                <AccordionTrigger>Tool Selection</AccordionTrigger>
                                <AccordionContent className="space-y-3">
                                    {availableTools.map((tool) => (
                                        <div key={tool.index} className="flex items-center space-x-3">
                                            <Checkbox id={`tool-${tool.index}`} checked={selectedTools.includes(tool.index)} onCheckedChange={(checked) => {
                                                if (checked) setSelectedTools([...selectedTools, tool.index]);
                                                else setSelectedTools(selectedTools.filter((id) => id !== tool.index));
                                            }} />
                                            <Label htmlFor={`tool-${tool.index}`} className="cursor-pointer">{tool.toolName}</Label>
                                        </div>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>

                            {/* UI Settings */}
                            <AccordionItem value="ui-settings">
                                <AccordionTrigger>UI Settings</AccordionTrigger>
                                <AccordionContent className="space-y-3">
                                    <div className="flex items-center space-x-3">
                                        <Checkbox id="display-tool-messages" checked={displayToolMessages} onCheckedChange={(checked) => setDisplayToolMessages(!!checked)} />
                                        <Label htmlFor="display-tool-messages" className="cursor-pointer">Display Tool Messages</Label>
                                    </div>

                                    <div className="flex items-center space-x-3">
                                        <Checkbox id="display-use-langchain" checked={langchain} onCheckedChange={(checked) => setLangchain(!!checked)} />
                                        <Label htmlFor="display-use-langchain" className="cursor-pointer">Langchain Orchestration</Label>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        {/* Save Button with Proper Spacing */}
                        <Button className="w-full mt-4" onClick={saveSettings}>Save Settings</Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
}