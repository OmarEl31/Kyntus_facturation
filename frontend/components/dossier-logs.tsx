import { Card, CardContent } from "@/components/ui/card"
import { User } from "lucide-react"

interface LogEntry {
  id: string
  action: string
  user: string
  timestamp: string
  details?: string
  type: "info" | "success" | "warning" | "error"
}

interface DossierLogsProps {
  logs: LogEntry[]
}

export function DossierLogs({ logs }: DossierLogsProps) {
  const typeConfig = {
    info: "border-l-blue-500 bg-blue-50",
    success: "border-l-green-500 bg-green-50",
    warning: "border-l-yellow-500 bg-yellow-50",
    error: "border-l-red-500 bg-red-50",
  }

  return (
    <div className="space-y-4">
      {logs.map((log, index) => (
        <Card key={log.id} className={`border-l-4 ${typeConfig[log.type]}`}>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{log.action}</h3>
                  <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                    {new Date(log.timestamp).toLocaleString("fr-FR")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <User className="w-4 h-4" />
                  <span>{log.user}</span>
                </div>
                {log.details && <p className="text-sm text-foreground">{log.details}</p>}
              </div>
              {index === 0 && (
                <div className="flex items-center">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">Récent</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
