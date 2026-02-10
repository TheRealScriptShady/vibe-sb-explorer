"use client"

import * as React from "react"
import { columns } from "@/components/columns"
import { DataTable } from "@/components/data-table"
import { MessageSheet } from "@/components/message-sheet"
import { Message, fetchMessages, fetchQueueCount } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Mode = 'queue' | 'topic';
export default function Home() {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedMessage, setSelectedMessage] = React.useState<Message | null>(null)

  const [authMode, setAuthMode] = React.useState<"default" | "connectionString">("default")
  const [queueName, setQueueName] = React.useState("myqueue")
  const [customConnectionString, setCustomConnectionString] = React.useState("")
  const [queueCount, setQueueCount] = React.useState<number | string>("...")
  const [error, setError] = React.useState<string | null>(null)

  // Load initial messages
  const loadMessages = React.useCallback(async (fromSeq?: number, fetchLatest: boolean = false) => {
    setLoading(true)
    setError(null)
    // Entity path is just the queue name now
    const entityPath = queueName;
    const connStr = authMode === "connectionString" ? customConnectionString : undefined;

    try {
      // Fetch count concurrently if it's the first load or explicit refresh (not pagination)
      if (!fromSeq) {
        fetchQueueCount(entityPath, connStr).then(res => setQueueCount(res.count));
      }

      // If fromSeq is provided, append. Otherwise replace.
      const newMessages = await fetchMessages(entityPath, 20, fromSeq, connStr, fetchLatest)

      if (fromSeq) {
        setMessages(prev => {
          // Filter duplicates if any
          const existingIds = new Set(prev.map(m => m.messageId));
          const uniqueNew = newMessages.filter(m => !existingIds.has(m.messageId));
          return [...prev, ...uniqueNew];
        })
      } else {
        setMessages(newMessages)
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      // TODO: Show error toast
    } finally {
      setLoading(false)
    }
  }, [queueName, authMode, customConnectionString])

  // // Initial load
  // React.useEffect(() => {
  //   // Optional: Load on mount? Or wait for user?
  //   // Let's load on mount with default values for quick feedback
  //   loadMessages()
  // }, [loadMessages])

  const handleRefresh = () => {
    loadMessages()
  }

  const handleLoadMore = () => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      loadMessages(lastMessage.sequenceNumber + 1)
    }
  }

  return (
    <main className="container mx-auto py-10">
      <div className="flex flex-col gap-6 mb-6">
        <h1 className="text-3xl font-bold">Service Bus Inspector</h1>

        <div className="flex flex-col gap-4 p-4 border rounded-md bg-card">

          <div className="flex gap-2 items-end">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="queue">Queue Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="queue"
                  value={queueName}
                  onChange={(e) => setQueueName(e.target.value)}
                  placeholder="myqueue"
                />
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  Messages: <span className="font-medium text-foreground">{queueCount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Authentication Mode</h3>
            <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as "default" | "connectionString")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="default">Default / Server Config</TabsTrigger>
                <TabsTrigger value="connectionString">Connection String</TabsTrigger>
              </TabsList>
              <TabsContent value="default">
                <p className="text-sm text-muted-foreground mt-2">
                  Using server-side configuration (Environment Variables or Azure Identity).
                </p>
              </TabsContent>
              <TabsContent value="connectionString">
                <div className="mt-2">
                  <Input
                    type="password"
                    placeholder="Endpoint=sb://..."
                    value={customConnectionString}
                    onChange={(e) => setCustomConnectionString(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter your full SAS connection string. It will be used for this request only.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRefresh} disabled={loading} className="mb-0.5">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="secondary" onClick={() => loadMessages(undefined, true)} disabled={loading} className="mb-0.5">
              Fetch Latest (Top 20)
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-md border p-4 bg-background">
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md border border-red-200">
            Error: {error}
          </div>
        )}
        <DataTable
          columns={columns}
          data={messages}
          onRowClick={(row) => setSelectedMessage(row)}
        />

        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loading || messages.length === 0}>
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      </div>

      {
        selectedMessage && (
          <MessageSheet
            message={selectedMessage}
            onOpenChange={(open) => !open && setSelectedMessage(null)}
          />
        )
      }
    </main >
  )
}
