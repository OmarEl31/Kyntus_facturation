import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, AlertCircle, XCircle } from "lucide-react"

interface Rule {
  id: string
  name: string
  description: string
  status: "passed" | "failed" | "warning"
  details?: string
}

interface DossierRulesProps {
  rules: Rule[]
}

export function DossierRules({ rules }: DossierRulesProps) {
  const statusConfig = {
    passed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
    warning: { icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-50" },
  }

  return (
    <div className="space-y-4">
      {rules.map((rule) => {
        const config = statusConfig[rule.status]
        const Icon = config.icon

        return (
          <Card key={rule.id} className={config.bg}>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Icon className={`w-6 h-6 ${config.color} flex-shrink-0 mt-1`} />
                <div className="flex-1">
                  <h3 className="font-semibold">{rule.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                  {rule.details && <p className="text-sm mt-2 text-foreground">{rule.details}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
