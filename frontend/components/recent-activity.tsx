import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Clock } from "lucide-react"

const activities = [
  {
    id: 1,
    title: "Dossier #2024-001 validé",
    description: "Statut changé en Facturable",
    timestamp: "Il y a 2 heures",
    icon: CheckCircle,
    color: "text-green-600",
  },
  {
    id: 2,
    title: "Dossier #2024-002 en attente",
    description: "Nécessite une révision manuelle",
    timestamp: "Il y a 4 heures",
    icon: AlertCircle,
    color: "text-yellow-600",
  },
  {
    id: 3,
    title: "Dossier #2024-003 rejeté",
    description: "Statut changé en Non-facturable",
    timestamp: "Il y a 6 heures",
    icon: AlertCircle,
    color: "text-red-600",
  },
  {
    id: 4,
    title: "Dossier #2024-004 en cours",
    description: "Traitement en cours",
    timestamp: "Il y a 8 heures",
    icon: Clock,
    color: "text-blue-600",
  },
]

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité récente</CardTitle>
        <CardDescription>Dernières modifications de dossiers</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon
            return (
              <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                <div className={`mt-1 ${activity.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
