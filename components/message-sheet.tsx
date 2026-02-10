"use client"

import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Message } from "@/lib/api"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface MessageSheetProps {
    message: Message | null;
    onOpenChange: (open: boolean) => void;
}

export function MessageSheet({ message, onOpenChange }: MessageSheetProps) {
    if (!message) return null;

    let formattedBody = message.body;
    try {
        // Try to format if it's JSON
        const json = JSON.parse(message.body);
        formattedBody = JSON.stringify(json, null, 2);
    } catch (e) {
        // Not JSON, keep as is
    }

    return (
        <Sheet open={!!message} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl w-[900px] p-5">
                <SheetHeader>
                    <SheetTitle className="p-0">Message Details</SheetTitle>
                    <SheetDescription className="p-0">
                        Message ID: {message.messageId}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-100px)] pr-4">
                    <div className="grid gap-4 py-4">

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-semibold block text-muted-foreground">Sequence Number</span>
                                {message.sequenceNumber}
                            </div>
                            <div>
                                <span className="font-semibold block text-muted-foreground">Enqueued Time</span>
                                {new Date(message.enqueuedTime).toLocaleString()}
                            </div>
                            <div>
                                <span className="font-semibold block text-muted-foreground">Correlation ID</span>
                                {message.correlationId || '-'}
                            </div>
                            <div>
                                <span className="font-semibold block text-muted-foreground">Subject</span>
                                {message.subject || '-'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">Application Properties</h3>
                            {Object.keys(message.applicationProperties).length > 0 ? (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Key</TableHead>
                                                <TableHead>Value</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(message.applicationProperties).map(([key, value]) => (
                                                <TableRow key={key}>
                                                    <TableCell className="font-medium">{key}</TableCell>
                                                    <TableCell>{String(value)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No application properties.</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-lg font-medium">Body</h3>
                            <div className="rounded-md border overflow-hidden">
                                <SyntaxHighlighter
                                    language="json"
                                    style={vscDarkPlus}
                                    customStyle={{ margin: 0, fontSize: '0.875rem' }}
                                    wrapLongLines={true}
                                >
                                    {formattedBody}
                                </SyntaxHighlighter>
                            </div>
                        </div>

                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
