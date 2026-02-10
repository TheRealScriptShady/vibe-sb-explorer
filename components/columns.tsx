"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Message } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, FileSearch } from "lucide-react"

export const columns: ColumnDef<Message>[] = [
    {
        accessorKey: "sequenceNumber",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Seq #
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
    },
    {
        accessorKey: "messageId",
        header: "Message ID",
    },
    {
        accessorKey: "subject",
        header: "Subject",
    },
    {
        accessorKey: "enqueuedTime",
        header: "Enqueued Time",
        cell: ({ row }) => {
            return new Date(row.getValue("enqueuedTime")).toLocaleString()
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            // This button will be handled by the parent component or row click
            return (
                <div className="flex justify-end">
                    <FileSearch className="w-4 h-4 text-muted-foreground" />
                </div>
            )
        }
    },
]
