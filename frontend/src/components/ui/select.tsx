"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Simplified select component using native HTML select
interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
}

interface SelectTriggerProps {
  className?: string
  children: React.ReactNode
}

interface SelectContentProps {
  children: React.ReactNode
}

interface SelectItemProps {
  value: string
  children: React.ReactNode
}

interface SelectValueProps {}

const Select: React.FC<SelectProps> = ({ value, onValueChange, children }) => {
  return (
    <div className="relative">
      <select 
        value={value} 
        onChange={(e) => onValueChange(e.target.value)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  )
}

const SelectTrigger: React.FC<SelectTriggerProps> = ({ className, children }) => {
  return <div className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm", className)}>{children}</div>
}

const SelectContent: React.FC<SelectContentProps> = ({ children }) => {
  return <>{children}</>
}

const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => {
  return <option value={value}>{children}</option>
}

const SelectValue: React.FC<SelectValueProps> = () => {
  return null // This is handled by the select element itself
}

export {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
}